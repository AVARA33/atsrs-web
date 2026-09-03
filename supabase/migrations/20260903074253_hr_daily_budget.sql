begin;
alter table public.atsrs_job_ingestion_config add column daily_limit numeric(10,6) not null default 0.50 check(daily_limit between 0 and 15);
create table public.atsrs_hr_budget_days (
 day date primary key, daily_limit numeric(10,6) not null, first_paused_at timestamptz, pause_reason text
 check(pause_reason in ('daily','monthly'))
);
alter table public.atsrs_hr_budget_days enable row level security;
revoke all on public.atsrs_hr_budget_days from public,anon,authenticated;
grant select,insert,update on public.atsrs_hr_budget_days to service_role;
create or replace function public.atsrs_job_reserve(p_run uuid,p_board text,p_external text) returns uuid
language plpgsql security invoker set search_path='' as $$
declare cap numeric; day_cap numeric; month_used numeric; day_used numeric; result uuid;
 day_start timestamptz:=date_trunc('day',now() at time zone 'Asia/Baku') at time zone 'Asia/Baku';
begin
 select monthly_limit,daily_limit into cap,day_cap from public.atsrs_job_ingestion_config
 where id=true and enabled and lease_id=p_run and lease_until>now() for update;
 if not found then return null; end if;
 if not exists(select 1 from public.atsrs_job_ingestion_runs where id=p_run and billing_scope='hr_management') then return null; end if;
 if (select count(*) from public.atsrs_job_ai_calls where run_id=p_run)>=20 then return null; end if;
 select coalesce(sum(coalesce(c.cost_usd,c.reserved_usd)),0),
 coalesce(sum(coalesce(c.cost_usd,c.reserved_usd)) filter(where c.created_at>=day_start),0)
 into month_used,day_used from public.atsrs_job_ai_calls c join public.atsrs_job_ingestion_runs r on r.id=c.run_id
 where r.billing_scope='hr_management' and c.created_at>=date_trunc('month',now() at time zone 'Asia/Baku') at time zone 'Asia/Baku';
 insert into public.atsrs_hr_budget_days(day,daily_limit) values((now() at time zone 'Asia/Baku')::date,day_cap)
 on conflict(day) do update set daily_limit=excluded.daily_limit;
 if day_used+0.02>day_cap or month_used+0.02>cap then
  update public.atsrs_hr_budget_days set first_paused_at=coalesce(first_paused_at,now()),pause_reason=coalesce(pause_reason,case when day_used+0.02>day_cap then 'daily' else 'monthly' end)
  where day=(now() at time zone 'Asia/Baku')::date;
  return null;
 end if;
 insert into public.atsrs_job_ai_calls(run_id,board,external_id) values(p_run,p_board,p_external) returning id into result;
 return result;
end $$;
revoke all on function public.atsrs_job_reserve(uuid,text,text) from public,anon,authenticated;
grant execute on function public.atsrs_job_reserve(uuid,text,text) to service_role;
create or replace function public.atsrs_get_hr_cost_summary() returns jsonb
language plpgsql security definer set search_path='' as $$
declare overview jsonb; daily jsonb; balance jsonb; day_cap numeric; day_reserved numeric; day_used numeric; day_start timestamptz:=date_trunc('day',now() at time zone 'Asia/Baku') at time zone 'Asia/Baku';
begin
 overview := public.atsrs_get_job_ingestion_overview();
 -- Override all money/token metrics, not just the daily table.
 overview := overview || (
 select jsonb_build_object(
 'today_cost',coalesce(sum(c.cost_usd) filter(where c.created_at>=date_trunc('day',now() at time zone 'Asia/Baku') at time zone 'Asia/Baku'),0),
 'month_cost',coalesce(sum(c.cost_usd) filter(where c.created_at>=date_trunc('month',now() at time zone 'Asia/Baku') at time zone 'Asia/Baku'),0),
 'unresolved_reserve',coalesce(sum(c.reserved_usd) filter(where c.state='reserved' and c.created_at>=date_trunc('month',now() at time zone 'Asia/Baku') at time zone 'Asia/Baku'),0),
 'input_tokens',coalesce(sum(c.input_tokens),0),'output_tokens',coalesce(sum(c.output_tokens),0),
 'billing_scope','hr_management')
 from public.atsrs_job_ai_calls c join public.atsrs_job_ingestion_runs r on r.id=c.run_id where r.billing_scope='hr_management');
 overview := overview || jsonb_build_object('runs',(select coalesce(jsonb_agg(to_jsonb(r) order by started_at desc),'[]') from (select * from public.atsrs_job_ingestion_runs where billing_scope='hr_management' order by started_at desc limit 20) r));
 select jsonb_build_object('amount_usd',amount_usd,'checked_at',checked_at,'source',source,'live',false) into balance
 from public.atsrs_api_balance_snapshot where id=true;
 with days as (
 select (now() at time zone 'Asia/Baku')::date-n as day from generate_series(0,29) n
 ), costs as (
 select (created_at at time zone 'Asia/Baku')::date as day,sum(cost_usd) cost,
 sum(case when state='reserved' then reserved_usd else 0 end) reserved,count(*) calls
 from public.atsrs_job_ai_calls where run_id in (select id from public.atsrs_job_ingestion_runs where billing_scope='hr_management') and created_at>=now()-interval '31 days' group by 1
 ), runs as (
 select (started_at at time zone 'Asia/Baku')::date as day,sum(published) published,sum(updated) updated,
 count(*) filter(where status in ('failed','partial')) errors
 from public.atsrs_job_ingestion_runs where billing_scope='hr_management' and started_at>=now()-interval '31 days' group by 1
 ) select jsonb_agg(jsonb_build_object('day',d.day,'cost',coalesce(c.cost,0),'reserved',coalesce(c.reserved,0),
 'calls',coalesce(c.calls,0),'published',coalesce(r.published,0),'updated',coalesce(r.updated,0),'errors',coalesce(r.errors,0)) order by d.day desc)
 into daily from days d left join costs c using(day) left join runs r using(day);
 select daily_limit into day_cap from public.atsrs_job_ingestion_config where id=true;
 select coalesce(sum(coalesce(c.cost_usd,c.reserved_usd)),0),coalesce(sum(c.reserved_usd) filter(where c.state='reserved'),0)
 into day_used,day_reserved from public.atsrs_job_ai_calls c join public.atsrs_job_ingestion_runs r on r.id=c.run_id
 where r.billing_scope='hr_management' and c.created_at>=day_start;
 select jsonb_agg(e.value || jsonb_build_object('daily_limit',case when (e.value->>'day')::date=(now() at time zone 'Asia/Baku')::date then day_cap else b.daily_limit end,
 'remaining',case when b.day is not null or (e.value->>'day')::date=(now() at time zone 'Asia/Baku')::date then greatest(0,coalesce(b.daily_limit,day_cap)-(e.value->>'cost')::numeric-(e.value->>'reserved')::numeric) else null end,
 'paused_at',b.first_paused_at,'pause_reason',b.pause_reason) order by e.value->>'day' desc) into daily
 from jsonb_array_elements(daily) e(value) left join public.atsrs_hr_budget_days b on b.day=(e.value->>'day')::date;
 overview:=overview||jsonb_build_object('daily_limit',day_cap,'daily_remaining',greatest(0,day_cap-day_used),'today_reserved',day_reserved,
 'daily_budget_paused',day_used+0.02>day_cap,'reservation_per_call',0.02,
 'daily_reset_at',((now() at time zone 'Asia/Baku')::date+1)::timestamp at time zone 'Asia/Baku');
 return overview || jsonb_build_object('balance',balance,'daily',daily,'refreshed_at',now(),'scan_cost',null,'coverage',public.atsrs_get_hr_scope());
end $$;
commit;
