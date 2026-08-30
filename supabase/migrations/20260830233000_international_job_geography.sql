begin;

-- Stable, product-facing geography groups for the international JobSearch.
-- Jobs remain in one catalogue; region pages are filtered views of that data.
create or replace function public.atsrs_job_region(p_country text, p_location text default null)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when lower(coalesce(p_country, '') || ' ' || coalesce(p_location, '')) ~
      '(remote|worldwide|global|anywhere|international)' then 'remote-worldwide'
    when lower(trim(coalesce(p_country, ''))) = any(array[
      'azerbaijan','armenia','georgia','kazakhstan','kyrgyzstan','tajikistan','turkmenistan','uzbekistan',
      'albania','andorra','austria','belarus','belgium','bosnia and herzegovina','bulgaria','croatia',
      'czech republic','czechia','denmark','estonia','finland','france','germany','greece','hungary',
      'iceland','ireland','italy','kosovo','latvia','liechtenstein','lithuania','luxembourg','malta',
      'moldova','monaco','montenegro','netherlands','north macedonia','norway','poland','portugal',
      'romania','russia','san marino','serbia','slovakia','slovenia','spain','sweden','switzerland',
      'ukraine','united kingdom','uk','great britain','vatican city'
    ]) then 'europe-central-asia'
    when lower(trim(coalesce(p_country, ''))) = any(array[
      'bahrain','cyprus','iran','iraq','israel','jordan','kuwait','lebanon','oman','palestine','qatar',
      'saudi arabia','syria','turkey','türkiye','united arab emirates','uae','yemen'
    ]) then 'middle-east'
    when lower(trim(coalesce(p_country, ''))) = any(array[
      'algeria','angola','benin','botswana','burkina faso','burundi','cabo verde','cape verde','cameroon',
      'central african republic','chad','comoros','congo','democratic republic of the congo','djibouti',
      'egypt','equatorial guinea','eritrea','eswatini','ethiopia','gabon','gambia','ghana','guinea',
      'guinea-bissau','ivory coast','côte d’ivoire','kenya','lesotho','liberia','libya','madagascar',
      'malawi','mali','mauritania','mauritius','morocco','mozambique','namibia','niger','nigeria',
      'rwanda','sao tome and principe','senegal','seychelles','sierra leone','somalia','south africa',
      'south sudan','sudan','tanzania','togo','tunisia','uganda','zambia','zimbabwe'
    ]) then 'africa'
    when lower(trim(coalesce(p_country, ''))) = any(array[
      'afghanistan','australia','bangladesh','bhutan','brunei','cambodia','china','east timor','timor-leste',
      'fiji','india','indonesia','japan','kiribati','laos','malaysia','maldives','marshall islands',
      'micronesia','mongolia','myanmar','nauru','nepal','new zealand','north korea','pakistan','palau',
      'papua new guinea','philippines','samoa','singapore','solomon islands','south korea','sri lanka',
      'taiwan','thailand','tonga','tuvalu','vanuatu','vietnam'
    ]) then 'asia-pacific'
    when lower(trim(coalesce(p_country, ''))) = any(array[
      'canada','greenland','united states','united states of america','usa','us','mexico'
    ]) then 'north-america'
    when lower(trim(coalesce(p_country, ''))) = any(array[
      'antigua and barbuda','argentina','bahamas','barbados','belize','bolivia','brazil','chile',
      'colombia','costa rica','cuba','dominica','dominican republic','ecuador','el salvador','grenada',
      'guatemala','guyana','haiti','honduras','jamaica','nicaragua','panama','paraguay','peru',
      'saint kitts and nevis','saint lucia','saint vincent and the grenadines','suriname',
      'trinidad and tobago','uruguay','venezuela'
    ]) then 'latin-america-caribbean'
    else 'other'
  end;
$$;

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
       and (coalesce(array_length(p_search_terms, 1), 0) = 0 or not exists (
         select 1 from unnest(p_search_terms) as search_term
          where job.title not ilike '%' || search_term || '%'
       ))
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

create or replace function public.atsrs_jobs_facets_v2()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_full boolean := false;
  v_rows jsonb := '[]'::jsonb;
begin
  v_full := coalesce(atsrs_private.is_jobs_admin(), false)
    or private.atsrs_personal_plan_key((select auth.uid())) in ('pro', 'business');
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', job.id, 'title', job.title,
    'region', public.atsrs_job_region(job.country, job.location),
    'country', job.country, 'location', job.location, 'company', job.company,
    'recruiter_company', case when v_full then job.recruiter_company else null end,
    'recruiter_name', case when v_full then job.recruiter_name else null end,
    'worksite', job.worksite, 'work_type', job.work_type, 'equipment', job.equipment
  ) order by job.title, job.id), '[]'::jsonb) into v_rows
  from (
    select vacancy.* from public.atsrs_jobs as vacancy
     where vacancy.status = 'published' and vacancy.published_at is not null
       and vacancy.published_at <= case when v_full then now() else now() - interval '6 hours' end
       and (vacancy.expires_at is null or vacancy.expires_at > now())
     order by vacancy.updated_at desc, vacancy.id desc
     limit case when v_full then null else 30 end
  ) as job;
  return v_rows;
end;
$$;

revoke all on function public.atsrs_jobs_feed_v2(integer,integer,text[],text,text,text,text,text,text,integer,text[],boolean) from public, anon, authenticated, service_role;
grant execute on function public.atsrs_jobs_feed_v2(integer,integer,text[],text,text,text,text,text,text,integer,text[],boolean) to anon, authenticated;
revoke all on function public.atsrs_jobs_facets_v2() from public, anon, authenticated, service_role;
grant execute on function public.atsrs_jobs_facets_v2() to anon, authenticated;
revoke all on function public.atsrs_job_region(text,text) from public;
grant execute on function public.atsrs_job_region(text,text) to anon, authenticated;

commit;
