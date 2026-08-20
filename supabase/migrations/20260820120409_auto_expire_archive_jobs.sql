begin;

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
    else p_published_at + interval '30 days'
  end;
$$;

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
      new.expires_at := coalesce(
        new.expires_at,
        atsrs_private.job_default_expires_at(new.published_at, new.closing_date)
      );
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
      new.expires_at := coalesce(
        new.expires_at,
        atsrs_private.job_default_expires_at(new.published_at, new.closing_date)
      );
    elsif new.status = 'published' then
      new.published_at := old.published_at;
      new.archived_at := null;
      new.expires_at := coalesce(
        new.expires_at,
        atsrs_private.job_default_expires_at(old.published_at, new.closing_date)
      );
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

alter table public.atsrs_jobs
  add constraint atsrs_jobs_published_expiry_required
  check (status <> 'published' or expires_at is not null)
  not valid;

update public.atsrs_jobs
set expires_at = atsrs_private.job_default_expires_at(published_at, closing_date)
where status = 'published'
  and published_at is not null
  and expires_at is null;

alter table public.atsrs_jobs
  validate constraint atsrs_jobs_published_expiry_required;

create index if not exists atsrs_jobs_live_expiry_idx
  on public.atsrs_jobs (expires_at)
  where status = 'published';

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
     and expires_at is not null
     and expires_at <= now();

  get diagnostics archived_count = row_count;
  return archived_count;
end;
$$;

revoke all on function atsrs_private.job_default_expires_at(timestamptz, date)
  from public, anon, authenticated, service_role;
revoke all on function atsrs_private.apply_job_lifecycle()
  from public, anon, authenticated, service_role;
revoke all on function atsrs_private.archive_expired_jobs()
  from public, anon, authenticated, service_role;

select cron.schedule(
  'atsrs-archive-expired-jobs',
  '*/15 * * * *',
  'select atsrs_private.archive_expired_jobs();'
);

select atsrs_private.archive_expired_jobs();

commit;
