begin;
create table public.atsrs_api_balance_snapshot (
 id boolean primary key default true check(id), amount_usd numeric(12,2) not null check(amount_usd>=0),
 checked_at timestamptz not null, source text not null
);
alter table public.atsrs_api_balance_snapshot enable row level security;
revoke all on public.atsrs_api_balance_snapshot from public,anon,authenticated;
grant select,insert,update on public.atsrs_api_balance_snapshot to service_role;
insert into public.atsrs_api_balance_snapshot values(true,7.82,'2026-09-02 23:53:00+00','OpenAI billing overview, manually verified');
create function public.atsrs_get_hr_cost_summary() returns jsonb
language plpgsql security definer set search_path='' as $$
declare overview jsonb; daily jsonb; balance jsonb;
begin
 overview := public.atsrs_get_job_ingestion_overview();
 select jsonb_build_object('amount_usd',amount_usd,'checked_at',checked_at,'source',source,'live',false) into balance
 from public.atsrs_api_balance_snapshot where id=true;
 with days as (
 select (now() at time zone 'Asia/Baku')::date-n as day from generate_series(0,29) n
 ), costs as (
 select (created_at at time zone 'Asia/Baku')::date as day,sum(cost_usd) cost,
 sum(case when state='reserved' then reserved_usd else 0 end) reserved,count(*) calls
 from public.atsrs_job_ai_calls where created_at>=now()-interval '31 days' group by 1
 ), runs as (
 select (started_at at time zone 'Asia/Baku')::date as day,sum(published) published,sum(updated) updated,
 count(*) filter(where status in ('failed','partial')) errors
 from public.atsrs_job_ingestion_runs where started_at>=now()-interval '31 days' group by 1
 ) select jsonb_agg(jsonb_build_object('day',d.day,'cost',coalesce(c.cost,0),'reserved',coalesce(c.reserved,0),
 'calls',coalesce(c.calls,0),'published',coalesce(r.published,0),'updated',coalesce(r.updated,0),'errors',coalesce(r.errors,0)) order by d.day desc)
 into daily from days d left join costs c using(day) left join runs r using(day);
 return overview || jsonb_build_object('balance',balance,'daily',daily,'refreshed_at',now(),'scan_cost',null);
end $$;
revoke all on function public.atsrs_get_hr_cost_summary() from public,anon,authenticated;
grant execute on function public.atsrs_get_hr_cost_summary() to authenticated;
commit;
