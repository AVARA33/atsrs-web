drop function if exists public.atsrs_jobs_feed_v3(integer,integer,text[],text,text,text,text,text,text,integer,text[],boolean);

create or replace function public.atsrs_jobs_feed_v3(
  p_page integer default 1,
  p_page_size integer default 30,
  p_search_terms text[] default '{}'::text[],
  p_roles text[] default '{}'::text[],
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
     where (coalesce(cardinality(p_roles), 0) = 0 or job.title = any(p_roles))
       and (coalesce(p_region, '') = '' or public.atsrs_job_region(job.country, job.location) = p_region)
       and (coalesce(p_country, '') = '' or job.country = p_country)
       and (coalesce(p_location, '') = '' or job.location = p_location)
       and (coalesce(p_company, '') = '' or job.company = p_company or job.recruiter_company = p_company)
       and (coalesce(p_recruiter, '') = '' or job.recruiter_name = p_recruiter)
       and not exists (
         select 1 from unnest(coalesce(p_search_terms, '{}'::text[])) as requested(term)
          where nullif(btrim(requested.term), '') is not null
            and job.title not ilike '%' || btrim(requested.term) || '%'
       )
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

revoke all on function public.atsrs_jobs_feed_v3(integer,integer,text[],text[],text,text,text,text,text,integer,text[],boolean) from public, anon, authenticated, service_role;
grant execute on function public.atsrs_jobs_feed_v3(integer,integer,text[],text[],text,text,text,text,text,integer,text[],boolean) to anon, authenticated;
