begin;

alter table public.atsrs_job_ingestion_queue
  add column if not exists recheck_attempts integer not null default 0
  check (recheck_attempts >= 0);

update public.atsrs_job_ingestion_queue
set recheck_attempts = 0
where state = 'recheck';

create or replace function atsrs_private.dispatch_archived_job_rechecks()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_id bigint;
  v_jobid bigint;
begin
  if exists (
    select 1 from public.atsrs_job_ingestion_queue where state = 'recheck'
  ) then
    select public.atsrs_dispatch_job_ingestion() into v_request_id;
    return v_request_id;
  end if;

  select jobid into v_jobid
  from cron.job
  where jobname = 'atsrs-hr-archive-recheck';

  if v_jobid is not null then
    perform cron.unschedule(v_jobid);
  end if;
  return null;
end;
$$;

revoke all on function atsrs_private.dispatch_archived_job_rechecks()
  from public, anon, authenticated, service_role;

do $$
declare
  v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname = 'atsrs-hr-archive-recheck';
  if v_jobid is not null then perform cron.unschedule(v_jobid); end if;
end;
$$;

select cron.schedule(
  'atsrs-hr-archive-recheck',
  '*/2 * * * *',
  'select atsrs_private.dispatch_archived_job_rechecks();'
);

select public.atsrs_dispatch_job_ingestion();

commit;
