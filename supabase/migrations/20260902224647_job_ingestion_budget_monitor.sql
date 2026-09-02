begin;
-- Private operational data: never readable through the public jobs feed.
create table public.atsrs_job_ingestion_config (
 id boolean primary key default true check(id), enabled boolean not null default false,
 monthly_limit numeric(10,6) not null default 15 check(monthly_limit between 0 and 15),
 lease_until timestamptz, lease_id uuid
);
insert into public.atsrs_job_ingestion_config(id) values(true);
create table public.atsrs_job_sources (
 board text primary key check(board ~ '^[A-Za-z0-9]+$'), official_url text not null,
 enabled boolean not null default false, scan_offset integer not null default 0,
 last_checked_at timestamptz, last_error text, total_found integer
);
create table public.atsrs_job_ingestion_runs (
 id uuid primary key default gen_random_uuid(), started_at timestamptz not null default now(),
 ended_at timestamptz, status text not null default 'running', discovered integer not null default 0,
 published integer not null default 0, updated integer not null default 0, archived integer not null default 0,
 reviewed integer not null default 0, recruiters_added integer not null default 0,
 companies_added integer not null default 0, error text
);
create table public.atsrs_job_ingestion_queue (
 board text not null references public.atsrs_job_sources(board), external_id text not null,
 listing_hash text not null, processed_hash text, payload jsonb not null,
 state text not null default 'pending' check(state in ('pending','published','review','closed')),
 discovered_at timestamptz not null default now(), checked_at timestamptz,
 job_id uuid references public.atsrs_jobs(id) on delete set null, reason text,
 primary key(board,external_id)
);
create table public.atsrs_job_ai_calls (
 id uuid primary key default gen_random_uuid(), run_id uuid not null references public.atsrs_job_ingestion_runs(id),
 board text not null, external_id text not null, created_at timestamptz not null default now(),
 model text not null default 'gpt-5.4-nano-2026-03-17',
 reserved_usd numeric(10,6) not null default 0.02, cost_usd numeric(10,6),
 input_tokens integer, cached_tokens integer, output_tokens integer,
 state text not null default 'reserved' check(state in ('reserved','settled')),
 provider_response_id text,
 check(cost_usd is null or cost_usd >= 0)
);
create table public.atsrs_job_run_tickets (
 token uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), used_at timestamptz
);
do $$ declare n text; begin
 foreach n in array array['atsrs_job_ingestion_config','atsrs_job_sources','atsrs_job_ingestion_runs','atsrs_job_ingestion_queue','atsrs_job_ai_calls','atsrs_job_run_tickets'] loop
 execute format('alter table public.%I enable row level security',n);
 execute format('revoke all on public.%I from public, anon, authenticated',n);
 execute format('grant all on public.%I to service_role',n);
 end loop;
end $$;
create index on public.atsrs_job_ai_calls(created_at);
create index on public.atsrs_job_ingestion_queue(state,checked_at);

create function public.atsrs_job_run_begin(p_ticket uuid) returns uuid
language plpgsql set search_path='' as $$
declare r uuid; begin
 update public.atsrs_job_run_tickets set used_at=now() where token=p_ticket and used_at is null and created_at>now()-interval '2 minutes';
 if not found then raise exception 'Invalid run ticket'; end if;
 perform 1 from public.atsrs_job_ingestion_config where id=true and enabled and (lease_until is null or lease_until<now()) for update;
 if not found then return null; end if;
 insert into public.atsrs_job_ingestion_runs default values returning id into r;
 update public.atsrs_job_ingestion_config set lease_until=now()+interval '5 minutes',lease_id=r where id=true;
 return r;
end $$;
create function public.atsrs_job_reserve(p_run uuid,p_board text,p_external text) returns uuid
language plpgsql set search_path='' as $$
declare cap numeric; used numeric; result uuid; begin
 select monthly_limit into cap from public.atsrs_job_ingestion_config where id=true and enabled and lease_id=p_run and lease_until>now() for update;
 if not found then return null; end if;
 if (select count(*) from public.atsrs_job_ai_calls where run_id=p_run)>=20 then return null; end if;
 select coalesce(sum(coalesce(cost_usd,reserved_usd)),0) into used from public.atsrs_job_ai_calls
 where created_at>=date_trunc('month',now() at time zone 'Asia/Baku') at time zone 'Asia/Baku';
 if used+0.02>cap then return null; end if;
 insert into public.atsrs_job_ai_calls(run_id,board,external_id) values(p_run,p_board,p_external) returning id into result;
 return result;
end $$;
create function public.atsrs_job_ai_settle(p_call uuid,p_input integer,p_cached integer,p_output integer,p_response text) returns void
language plpgsql set search_path='' as $$ begin
 if p_input<0 or p_cached<0 or p_output<0 or p_cached>p_input then raise exception 'Invalid usage'; end if;
 update public.atsrs_job_ai_calls set input_tokens=p_input,cached_tokens=p_cached,output_tokens=p_output,
 cost_usd=((p_input-p_cached)*0.20+p_cached*0.02+p_output*1.25)/1000000,
 provider_response_id=p_response,state='settled' where id=p_call and state='reserved';
end $$;
create function public.atsrs_get_job_ingestion_overview() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; begin
 perform 1 from public.atsrs_get_developer_registrations();
 select jsonb_build_object('enabled',c.enabled,'monthly_limit',c.monthly_limit,
 'month_cost',coalesce((select sum(cost_usd) from public.atsrs_job_ai_calls where created_at>=date_trunc('month',now() at time zone 'Asia/Baku') at time zone 'Asia/Baku'),0),
 'unresolved_reserve',coalesce((select sum(reserved_usd) from public.atsrs_job_ai_calls where state='reserved' and created_at>=date_trunc('month',now() at time zone 'Asia/Baku') at time zone 'Asia/Baku'),0),
 'today_cost',coalesce((select sum(cost_usd) from public.atsrs_job_ai_calls where created_at>=date_trunc('day',now() at time zone 'Asia/Baku') at time zone 'Asia/Baku'),0),
 'input_tokens',coalesce((select sum(input_tokens) from public.atsrs_job_ai_calls),0),
 'output_tokens',coalesce((select sum(output_tokens) from public.atsrs_job_ai_calls),0),
 'pending',(select count(*) from public.atsrs_job_ingestion_queue where state='pending'),
 'review',(select count(*) from public.atsrs_job_ingestion_queue where state='review'),
 'sources',(select coalesce(jsonb_agg(to_jsonb(s) order by board),'[]') from public.atsrs_job_sources s),
 'runs',(select coalesce(jsonb_agg(to_jsonb(r) order by started_at desc),'[]') from (select * from public.atsrs_job_ingestion_runs order by started_at desc limit 20) r),
 'billing_note','Token-based calculated cost, not an invoice. Unresolved calls retain their budget reservation.') into result
 from public.atsrs_job_ingestion_config c where id=true;
 return result;
end $$;
revoke all on function public.atsrs_job_run_begin(uuid),public.atsrs_job_reserve(uuid,text,text),public.atsrs_job_ai_settle(uuid,integer,integer,integer,text),public.atsrs_get_job_ingestion_overview() from public,anon,authenticated;
grant execute on function public.atsrs_job_run_begin(uuid),public.atsrs_job_reserve(uuid,text,text),public.atsrs_job_ai_settle(uuid,integer,integer,integer,text) to service_role;
grant execute on function public.atsrs_get_job_ingestion_overview() to authenticated;
-- Scheduling is installed only after the first end-to-end test succeeds.
commit;
