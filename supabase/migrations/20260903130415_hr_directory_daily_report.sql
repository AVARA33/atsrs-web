begin;
CREATE OR REPLACE FUNCTION public.atsrs_get_hr_cost_summary()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

 -- Count first HR directory inserts, independently of later job updates.
 -- Company verified_at is set on INSERT; directory sync uses ON CONFLICT DO NOTHING.
 with recruiters as (
  select (created_at at time zone 'Asia/Baku')::date as day,count(*) as added
  from public.atsrs_recruiters
  where source='official_job_contact' and created_at>=day_start-interval '29 days'
    and created_at<day_start+interval '1 day'
  group by 1
 ), companies as (
  select (verified_at at time zone 'Asia/Baku')::date as day,count(*) as added
  from public.atsrs_hr_companies
  where verified_at>=day_start-interval '29 days' and verified_at<day_start+interval '1 day'
  group by 1
 )
 select jsonb_agg(e.value || jsonb_build_object(
  'recruiters_added',coalesce(r.added,0),'companies_added',coalesce(c.added,0))
  order by e.value->>'day' desc) into daily
 from jsonb_array_elements(daily) e(value)
 left join recruiters r on r.day=(e.value->>'day')::date
 left join companies c on c.day=(e.value->>'day')::date;
 overview:=overview||jsonb_build_object(
  'today_recruiters_added',coalesce((daily->0->>'recruiters_added')::bigint,0),
  'today_companies_added',coalesce((daily->0->>'companies_added')::bigint,0));
 return overview || jsonb_build_object('balance',balance,'daily',daily,'refreshed_at',now(),'scan_cost',null,'coverage',public.atsrs_get_hr_scope());
end $function$
;
commit;
