begin;

-- 09:00-17:00 Asia/Baku, Monday-Friday only. UTC offsets are fixed here
-- because Azerbaijan does not observe daylight-saving time.
select cron.schedule(
  'atsrs-hr-weekday-ingestion',
  '*/5 5-12 * * 1-5',
  'select public.atsrs_dispatch_job_ingestion();'
);
select cron.schedule(
  'atsrs-hr-final-daily-ingestion',
  '0 13 * * 1-5',
  'select public.atsrs_dispatch_job_ingestion();'
);

create or replace function public.atsrs_get_hr_scope() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; begin
 perform 1 from public.atsrs_get_developer_registrations();
 select jsonb_build_object(
  'scope',(select coalesce(jsonb_agg(to_jsonb(s) order by name),'[]') from public.atsrs_hr_source_scope s),
  'sources',(select coalesce(jsonb_agg(to_jsonb(s) order by board),'[]') from public.atsrs_job_sources s),
  'pending',(select count(*) from public.atsrs_job_ingestion_queue where state='pending'),
  'review',(select count(*) from public.atsrs_job_ingestion_queue where state='review'),
  'balance_policy','least_published_specialty_first',
  'schedule','Monday-Friday 09:00-17:00 Baku; every 5 minutes',
  'specialties',(select jsonb_agg(to_jsonb(t)||jsonb_build_object('supply_status',case when pending>0 then 'queued_for_validation' when review>0 then 'review_or_source_gap' else 'no_connected_candidates' end) order by specialty) from public.atsrs_hr_specialty_totals() t)
 ) into result;
 return result;
end $$;

commit;
