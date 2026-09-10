begin;

-- A local display TTL is not evidence that an employer closed a vacancy.
-- Keep expiry enforcement only for a verified source closing date.
alter table public.atsrs_jobs
  drop constraint if exists atsrs_jobs_published_expiry_required;

create or replace function atsrs_private.job_default_expires_at(
  p_published_at timestamptz,
  p_closing_date date
)
returns timestamptz
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when p_closing_date is not null
      then (p_closing_date + 1)::timestamp at time zone 'UTC'
    else null::timestamptz
  end;
$$;

-- Immediately make still-published vacancies visible again when their only
-- expiry evidence was the local rolling TTL.
update public.atsrs_jobs
set expires_at = null
where status = 'published'
  and closing_date is null
  and expires_at is not null;

-- Retain the private helper for explicit, source-dated closures. It is no
-- longer scheduled and cannot archive a vacancy merely because time elapsed.
create or replace function atsrs_private.archive_expired_jobs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  archived_count integer := 0;
begin
  update public.atsrs_jobs
     set status = 'archived'
   where status = 'published'
     and closing_date is not null
     and closing_date < (now() at time zone 'Asia/Baku')::date;

  get diagnostics archived_count = row_count;
  return archived_count;
end;
$$;

do $$
declare
  v_jobid bigint;
begin
  for v_jobid in
    select jobid from cron.job where jobname = 'atsrs-archive-expired-jobs'
  loop
    perform cron.unschedule(v_jobid);
  end loop;
end;
$$;

alter table public.atsrs_job_ingestion_queue
  drop constraint if exists atsrs_job_ingestion_queue_state_check;

alter table public.atsrs_job_ingestion_queue
  add constraint atsrs_job_ingestion_queue_state_check
  check (state in ('pending', 'published', 'review', 'closed', 'recheck'));

-- Every archived vacancy with a connected official source must be checked
-- again. The Edge worker restores only records whose official endpoint still
-- confirms an active vacancy.
update public.atsrs_job_ingestion_queue q
set state = 'recheck',
    checked_at = null,
    reason = 'Official source revalidation requested before restoration'
from public.atsrs_jobs j
where q.job_id = j.id
  and j.status = 'archived'
  and exists (
    select 1
    from public.atsrs_job_sources s
    where s.board = q.board
      and s.enabled
  );

commit;
