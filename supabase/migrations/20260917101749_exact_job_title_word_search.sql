-- Match each search token as a complete title word. This prevents a query such
-- as "ROV" from matching unrelated words such as "ferroviaire" while keeping
-- expected matches such as "ROV Pilot" and "ROV-Pilot".
create or replace function private.atsrs_job_title_matches_terms(
  p_title text,
  p_search_terms text[]
)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select
    coalesce(array_length(p_search_terms, 1), 0) = 0
    or not exists (
      select 1
        from unnest(p_search_terms) as requested(term)
       where nullif(btrim(coalesce(requested.term, '')), '') is not null
         and lower(btrim(requested.term)) <> all (
           regexp_split_to_array(
             lower(coalesce(p_title, '')),
             '[^[:alnum:]]+'
           )
         )
    );
$$;

revoke all on function private.atsrs_job_title_matches_terms(text, text[])
  from public, anon, authenticated, service_role;

create or replace function public.atsrs_jobs_feed_v2(
  p_page integer default 1,
  p_page_size integer default 30,
  p_search_terms text[] default '{}'::text[],
  p_role text default null,
  p_region text default null,
  p_country text default null,
  p_location text default null,
  p_company text default null,
  p_recruiter text default null,
  p_days integer default 0,
  p_worksites text[] default '{}'::text[],
  p_new_only boolean default false
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_full boolean := false;
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := least(greatest(coalesce(p_page_size, 30), 1), 30);
  v_total integer := 0;
  v_jobs jsonb := '[]'::jsonb;
begin
  v_full := coalesce(atsrs_private.is_jobs_admin(), false)
    or private.atsrs_personal_plan_key((select auth.uid())) in ('pro', 'business');

  with available as materialized (
    select job.*
      from public.atsrs_jobs as job
     where job.status = 'published'
       and job.published_at is not null
       and job.published_at <= case when v_full then now() else now() - interval '6 hours' end
       and (job.expires_at is null or job.expires_at > now())
     order by job.updated_at desc, job.id desc
     limit case when v_full then null else 30 end
  ), filtered as materialized (
    select job.*
      from available as job
     where (coalesce(p_role, '') = '' or job.title = p_role)
       and (coalesce(p_region, '') = '' or public.atsrs_job_region(job.country, job.location) = p_region)
       and (coalesce(p_country, '') = '' or job.country = p_country)
       and (coalesce(p_location, '') = '' or job.location = p_location)
       and (coalesce(p_company, '') = '' or job.company = p_company or job.recruiter_company = p_company)
       and (coalesce(p_recruiter, '') = '' or job.recruiter_name = p_recruiter)
       and private.atsrs_job_title_matches_terms(job.title, p_search_terms)
       and (coalesce(p_days, 0) <= 0 or coalesce(job.source_posted_at, job.display_posted_date, job.published_at::date) >= (timezone('UTC', now())::date - p_days))
       and (coalesce(array_length(p_worksites, 1), 0) = 0 or job.worksite = any(p_worksites))
       and (not coalesce(p_new_only, false) or job.published_at >= now() - interval '6 hours')
  ), page_rows as (
    select job.* from filtered as job
     order by job.updated_at desc, job.id desc
     offset ((v_page - 1) * v_page_size) limit v_page_size
  )
  select (select count(*)::integer from filtered), coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', job.id, 'title', job.title, 'company', job.company,
      'region', public.atsrs_job_region(job.country, job.location),
      'location', job.location, 'country', job.country, 'work_type', job.work_type,
      'worksite', job.worksite, 'equipment', job.equipment, 'joining_date', job.joining_date,
      'mobilisation', job.mobilisation, 'duration', job.duration, 'rate', job.rate,
      'currency', job.currency, 'summary', job.summary, 'description', job.description,
      'requirements', job.requirements, 'source_type', job.source_type,
      'source_posted_at', job.source_posted_at, 'display_posted_date', job.display_posted_date,
      'closing_date', job.closing_date, 'status', job.status, 'published_at', job.published_at,
      'expires_at', job.expires_at,
      'recruiter_name', case when v_full then job.recruiter_name else null end,
      'recruiter_company', case when v_full then job.recruiter_company else null end,
      'recruiter_phone', case when v_full then job.recruiter_phone else null end,
      'recruiter_email', case when v_full then job.recruiter_email else null end,
      'source_url', case when v_full then job.source_url else null end,
      'application_url', case when v_full then job.application_url else null end
    ) order by job.updated_at desc, job.id desc) from page_rows as job
  ), '[]'::jsonb) into v_total, v_jobs;

  return jsonb_build_object('access', case when v_full then 'full' else 'limited' end,
    'total', v_total, 'page', v_page, 'page_size', v_page_size, 'jobs', v_jobs);
end;
$$;

revoke all on function public.atsrs_jobs_feed_v2(integer,integer,text[],text,text,text,text,text,text,integer,text[],boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.atsrs_jobs_feed_v2(integer,integer,text[],text,text,text,text,text,text,integer,text[],boolean)
  to anon, authenticated;

create or replace function public.atsrs_jobs_feed(
  p_page integer default 1,
  p_page_size integer default 30,
  p_search_terms text[] default '{}'::text[],
  p_role text default null,
  p_location text default null,
  p_company text default null,
  p_recruiter text default null,
  p_days integer default 0,
  p_worksites text[] default '{}'::text[],
  p_new_only boolean default false
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_full boolean := false;
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := least(greatest(coalesce(p_page_size, 30), 1), 30);
  v_total integer := 0;
  v_jobs jsonb := '[]'::jsonb;
begin
  v_full := coalesce(atsrs_private.is_jobs_admin(), false)
    or private.atsrs_personal_plan_key((select auth.uid())) in ('pro', 'business');

  with available as materialized (
    select job.*
      from public.atsrs_jobs as job
     where job.status = 'published'
       and job.published_at is not null
       and job.published_at <= case when v_full then now() else now() - interval '6 hours' end
       and (job.expires_at is null or job.expires_at > now())
     order by job.updated_at desc, job.id desc
     limit case when v_full then null else 30 end
  ), filtered as materialized (
    select job.*
      from available as job
     where (coalesce(p_role, '') = '' or job.title = p_role)
       and (coalesce(p_location, '') = '' or job.location = p_location)
       and (coalesce(p_company, '') = '' or job.company = p_company or job.recruiter_company = p_company)
       and (coalesce(p_recruiter, '') = '' or job.recruiter_name = p_recruiter)
       and private.atsrs_job_title_matches_terms(job.title, p_search_terms)
       and (
         coalesce(p_days, 0) <= 0
         or coalesce(job.source_posted_at, job.display_posted_date, job.published_at::date)
              >= (timezone('UTC', now())::date - p_days)
       )
       and (
         coalesce(array_length(p_worksites, 1), 0) = 0
         or job.worksite = any(p_worksites)
       )
       and (not coalesce(p_new_only, false) or job.published_at >= now() - interval '6 hours')
  ), page_rows as (
    select job.*
      from filtered as job
     order by job.updated_at desc, job.id desc
     offset ((v_page - 1) * v_page_size)
     limit v_page_size
  )
  select
    (select count(*)::integer from filtered),
    coalesce((
      select jsonb_agg(
        case when v_full then to_jsonb(job)
        else to_jsonb(job)
          - 'recruiter_name'
          - 'recruiter_company'
          - 'recruiter_phone'
          - 'recruiter_email'
          - 'source_url'
          - 'application_url'
        end
        order by job.updated_at desc, job.id desc
      )
      from page_rows as job
    ), '[]'::jsonb)
    into v_total, v_jobs;

  return jsonb_build_object(
    'access', case when v_full then 'full' else 'limited' end,
    'total', v_total,
    'page', v_page,
    'page_size', v_page_size,
    'jobs', v_jobs
  );
end;
$$;

revoke all on function public.atsrs_jobs_feed(integer, integer, text[], text, text, text, text, integer, text[], boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.atsrs_jobs_feed(integer, integer, text[], text, text, text, text, integer, text[], boolean)
  to anon, authenticated;
