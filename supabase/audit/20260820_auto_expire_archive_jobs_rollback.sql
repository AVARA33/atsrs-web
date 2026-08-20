-- Roll back the automatic lifecycle objects without deleting vacancy history.
-- Auto-derived expires_at values and already archived rows are deliberately
-- preserved so a rollback cannot accidentally re-expose stale vacancies.

begin;

select cron.unschedule('atsrs-archive-expired-jobs')
where exists (
  select 1 from cron.job where jobname = 'atsrs-archive-expired-jobs'
);

drop function if exists atsrs_private.archive_expired_jobs();
drop index if exists public.atsrs_jobs_live_expiry_idx;

alter table public.atsrs_jobs
  drop constraint if exists atsrs_jobs_published_expiry_required;

create or replace function atsrs_private.apply_job_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    if caller_id is not null then
      new.created_by := caller_id;
      new.updated_by := caller_id;
    end if;
    if new.status = 'published' then
      new.published_at := clock_timestamp();
      new.archived_at := null;
    else
      new.published_at := null;
      new.archived_at := case when new.status = 'archived' then clock_timestamp() else null end;
    end if;
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_at := clock_timestamp();
    if caller_id is not null then new.updated_by := caller_id; end if;

    if new.status = 'published' and old.status <> 'published' then
      new.published_at := clock_timestamp();
      new.archived_at := null;
    elsif new.status = 'published' then
      new.published_at := old.published_at;
      new.archived_at := null;
    elsif new.status = 'archived' and old.status <> 'archived' then
      new.published_at := old.published_at;
      new.archived_at := clock_timestamp();
    else
      new.published_at := old.published_at;
      new.archived_at := case when new.status = 'archived' then old.archived_at else null end;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function atsrs_private.apply_job_lifecycle()
  from public, anon, authenticated, service_role;

drop function if exists atsrs_private.job_default_expires_at(timestamptz, date);

commit;
