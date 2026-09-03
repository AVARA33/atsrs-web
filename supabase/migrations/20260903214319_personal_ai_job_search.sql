begin;
create table private.ai_job_search_settings (
 id boolean primary key default true check(id), enabled boolean not null default false,
 daily_request_limit integer not null default 0 check(daily_request_limit between 0 and 10000),
 plan_allowances jsonb not null default '{"free":0,"pro":0,"business":0}'::jsonb
);
insert into private.ai_job_search_settings(id) values(true);
create table private.ai_job_search_grants (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 credits integer not null check(credits>0), payment_reference text not null unique,
 created_at timestamptz not null default now()
);
create table private.ai_job_search_requests (
 user_id uuid not null references auth.users(id) on delete cascade, request_id uuid not null,
 period date not null, bucket text not null check(bucket in ('included','extra')),
 status text not null default 'pending' check(status in ('pending','succeeded','failed')),
 result jsonb, created_at timestamptz not null default now(), primary key(user_id,request_id)
);
create index on private.ai_job_search_requests(created_at);
alter table private.ai_job_search_settings enable row level security;
alter table private.ai_job_search_grants enable row level security;
alter table private.ai_job_search_requests enable row level security;
revoke all on private.ai_job_search_settings,private.ai_job_search_grants,private.ai_job_search_requests from public,anon,authenticated;
-- Called only by the authenticated Edge Function using its server credential.
create function public.atsrs_ai_job_search_credit(p_user uuid,p_action text,p_request uuid default null,p_result jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 cfg private.ai_job_search_settings%rowtype;
 old_request private.ai_job_search_requests%rowtype;
 current_period date:=date_trunc('month',now() at time zone 'Asia/Baku')::date;
 allowance integer; included_used integer; extra_used integer; extras integer; plan_key text;
begin
 if p_user is null or p_action not in ('status','reserve','succeed','fail') then raise exception 'Invalid request';end if;
 -- Serialize reservations globally to enforce the global daily ceiling as well as per-user credits.
 select * into cfg from private.ai_job_search_settings where id=true for update;
 select coalesce((select plan from public.atsrs_subscriptions where user_id=p_user and status in ('active','trialing')),'free') into plan_key;
 allowance:=greatest(0,coalesce((cfg.plan_allowances->>plan_key)::integer,0));
 update private.ai_job_search_requests set status='failed' where user_id=p_user and status='pending' and created_at<now()-interval '5 minutes';
 if p_action in ('succeed','fail') then
  update private.ai_job_search_requests set status=case when p_action='succeed' then 'succeeded' else 'failed' end,
   result=case when p_action='succeed' then p_result else null end
   where user_id=p_user and request_id=p_request and status='pending';
  return jsonb_build_object('updated',found);
 end if;
 select count(*) filter(where bucket='included' and period=current_period),count(*) filter(where bucket='extra')
  into included_used,extra_used from private.ai_job_search_requests where user_id=p_user and status in ('pending','succeeded');
 select coalesce(sum(credits),0)-extra_used into extras from private.ai_job_search_grants where user_id=p_user;
 if p_action='status' then return jsonb_build_object('enabled',cfg.enabled,'included',greatest(0,allowance-included_used),'allowance',allowance,'extra',greatest(0,extras),'plan',plan_key);end if;
 if p_request is null then raise exception 'Request identifier required';end if;
 select * into old_request from private.ai_job_search_requests where user_id=p_user and request_id=p_request;
 if found then return jsonb_build_object('code',old_request.status,'result',old_request.result);end if;
 if not cfg.enabled then return '{"code":"not_open"}'::jsonb;end if;
 if (select count(*) from private.ai_job_search_requests where created_at>=date_trunc('day',now() at time zone 'Asia/Baku') at time zone 'Asia/Baku')>=cfg.daily_request_limit then return '{"code":"daily_limit"}'::jsonb;end if;
 if exists(select 1 from private.ai_job_search_requests where user_id=p_user and status='pending') then return '{"code":"busy"}'::jsonb;end if;
 if included_used>=allowance and extras<=0 then return '{"code":"no_credits"}'::jsonb;end if;
 insert into private.ai_job_search_requests(user_id,request_id,period,bucket) values(p_user,p_request,current_period,case when included_used<allowance then 'included' else 'extra' end);
 return '{"code":"reserved"}'::jsonb;
end $$;
revoke all on function public.atsrs_ai_job_search_credit(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.atsrs_ai_job_search_credit(uuid,text,uuid,jsonb) to service_role;
commit;
