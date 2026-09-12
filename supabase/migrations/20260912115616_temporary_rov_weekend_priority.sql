-- Temporarily dedicate ingestion to ROV/ROC vacancies for the requested weekend.
-- Baku windows: 12 Sep 2026 until 17:00, and 13 Sep 2026 09:00-17:00.

update public.atsrs_job_ingestion_config
set priority_specialty = 'rov_roc',
    priority_until = timestamp '2026-09-13 17:01:00' at time zone 'Asia/Baku'
where id = true;

-- Avoid the all-specialty publication aggregate while a single specialty is active.
-- This keeps the large queue inside the database statement deadline.
create or replace function public.atsrs_hr_next_balanced_job(
  p_run uuid,
  p_exclude text[] default '{}'
)
returns setof public.atsrs_job_ingestion_queue
language plpgsql
stable
set search_path = ''
as $$
declare
  active_priority text;
begin
  select case when c.priority_until > now() then c.priority_specialty end
  into active_priority
  from public.atsrs_job_ingestion_config c
  where c.id;

  if active_priority is not null then
    return query
    with excluded as (
      select split_part(v, ':', 1) board,
             substring(v from strpos(v, ':') + 1) external_id
      from unnest(p_exclude) v
    )
    select q.*
    from public.atsrs_job_ingestion_queue q
    join public.atsrs_job_sources s using (board)
    where q.state = 'pending'
      and q.specialty = active_priority
      and s.enabled
      and exists (
        select 1
        from public.atsrs_job_ingestion_config c
        where c.enabled and c.lease_id = p_run and c.lease_until > now()
      )
      and not exists (
        select 1 from excluded e
        where e.board = q.board and e.external_id = q.external_id
      )
    order by (q.job_id is not null),
             nullif(left(q.payload->>'releasedDate', 10), '') asc nulls last,
             q.discovered_at, q.board, q.external_id
    limit 1;
    return;
  end if;

  return query
  with excluded as (
    select split_part(v, ':', 1) board,
           substring(v from strpos(v, ':') + 1) external_id
    from unnest(p_exclude) v
  ), attempted_specialties as (
    select distinct q.specialty
    from excluded e
    join public.atsrs_job_ingestion_queue q
      on q.board = e.board and q.external_id = e.external_id
  ), categories as (
    select distinct q.specialty
    from public.atsrs_job_ingestion_queue q
    join public.atsrs_job_sources s using (board)
    where q.state = 'pending' and s.enabled
  ), publication_totals as (
    select q.specialty,
           count(*) filter (
             where j.created_at >= date_trunc('day', now() at time zone 'Asia/Baku') at time zone 'Asia/Baku'
           )::bigint published_today,
           max(j.created_at) last_published_at
    from public.atsrs_job_ingestion_queue q
    join public.atsrs_jobs j on j.id = q.job_id
    group by q.specialty
  ), candidates as (
    select picked.*
    from categories c
    cross join lateral (
      select q.*
      from public.atsrs_job_ingestion_queue q
      join public.atsrs_job_sources s using (board)
      where q.state = 'pending'
        and q.specialty = c.specialty
        and s.enabled
        and not exists (
          select 1 from excluded e
          where e.board = q.board and e.external_id = q.external_id
        )
      order by (q.job_id is not null),
               nullif(left(q.payload->>'releasedDate', 10), '') asc nulls last,
               q.discovered_at, q.board, q.external_id
      limit 1
    ) picked
  )
  select q.*
  from candidates q
  left join publication_totals t using (specialty)
  where exists (
    select 1
    from public.atsrs_job_ingestion_config c
    where c.enabled and c.lease_id = p_run and c.lease_until > now()
  )
  order by exists (
             select 1 from attempted_specialties a where a.specialty = q.specialty
           ),
           coalesce(t.published_today, 0), t.last_published_at nulls first,
           q.discovered_at, q.board, q.external_id
  limit 1;
end;
$$;

revoke all on function public.atsrs_hr_next_balanced_job(uuid, text[]) from public, anon, authenticated;
grant execute on function public.atsrs_hr_next_balanced_job(uuid, text[]) to service_role;

create or replace function private.atsrs_run_temporary_rov_weekend()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  local_now timestamp := now() at time zone 'Asia/Baku';
  dispatch_id bigint;
begin
  if (
    local_now >= timestamp '2026-09-12 00:00:00'
    and local_now < timestamp '2026-09-12 17:01:00'
  ) or (
    local_now >= timestamp '2026-09-13 09:00:00'
    and local_now < timestamp '2026-09-13 17:01:00'
  ) then
    select public.atsrs_dispatch_job_ingestion() into dispatch_id;
    return dispatch_id;
  end if;

  if local_now >= timestamp '2026-09-13 17:01:00' then
    perform cron.unschedule('atsrs-temporary-rov-weekend-ingestion');
  end if;

  return null;
end;
$$;

revoke all on function private.atsrs_run_temporary_rov_weekend() from public, anon, authenticated;
grant execute on function private.atsrs_run_temporary_rov_weekend() to postgres, service_role;

do $$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'atsrs-temporary-rov-weekend-ingestion';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end;
$$;

select cron.schedule(
  'atsrs-temporary-rov-weekend-ingestion',
  '*/5 * * * *',
  'select private.atsrs_run_temporary_rov_weekend();'
);

-- Start the first ROV-focused ingestion immediately instead of waiting for cron.
select private.atsrs_run_temporary_rov_weekend();
