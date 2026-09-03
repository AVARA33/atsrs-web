begin;
create or replace function public.atsrs_get_hr_cost_summary() returns jsonb
language plpgsql security definer set search_path='' as $$
declare overview jsonb; daily jsonb; balance jsonb;
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
 return overview || jsonb_build_object('balance',balance,'daily',daily,'refreshed_at',now(),'scan_cost',null,'coverage',public.atsrs_get_hr_scope());
end $$;
-- Same workday window, bounded five-minute batches instead of hourly bottleneck.
select cron.schedule('atsrs-hr-weekday-ingestion','*/5 5-12 * * 1-5','select public.atsrs_dispatch_job_ingestion();');
select cron.schedule('atsrs-hr-final-daily-ingestion','0 13 * * 1-5','select public.atsrs_dispatch_job_ingestion();');
commit;
