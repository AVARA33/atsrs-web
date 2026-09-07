begin;

-- These rows have an explicit source date which the runtime would reject before
-- any AI call. Move them out of the active queue in one auditable operation.
update public.atsrs_job_ingestion_queue
set state='review',
    reason='Missing or older than 14 days official posting date',
    checked_at=now()
where state='pending'
  and job_id is null
  and nullif(payload->>'releasedDate','') is not null
  and (
    left(payload->>'releasedDate',10) < ((now() at time zone 'Asia/Baku')::date-14)::text
    or left(payload->>'releasedDate',10) > (now() at time zone 'Asia/Baku')::date::text
  );

commit;
