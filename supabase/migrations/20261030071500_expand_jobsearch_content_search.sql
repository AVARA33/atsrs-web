-- Search the complete vacancy record instead of the title alone. The cached
-- token array keeps the live feed predictable without re-tokenizing 13k+ jobs
-- on every keystroke.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '120s';

create or replace function private.atsrs_job_search_tokens(p_document text)
returns text[]
language sql
immutable
parallel safe
set search_path = ''
as $$
  select coalesce(array_agg(token order by token), '{}'::text[])
  from (
    select distinct btrim(raw_token) as token
    from unnest(
      regexp_split_to_array(lower(coalesce(p_document, '')), '[^[:alnum:]]+')
    ) as split(raw_token)
    where nullif(btrim(raw_token), '') is not null
  ) as normalized;
$$;

revoke all on function private.atsrs_job_search_tokens(text)
  from public, anon, authenticated, service_role;

alter table atsrs_private.atsrs_job_semantic_keys
  add column if not exists search_tokens text[] not null default '{}'::text[];

create or replace function atsrs_private.atsrs_refresh_job_semantic_key()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into atsrs_private.atsrs_job_semantic_keys (
    job_id, title_key, company_key, location_key,
    description_hash, requirements_hash, search_tokens, updated_at
  ) values (
    new.id,
    lower(regexp_replace(btrim(coalesce(new.title, '')), '\s+', ' ', 'g')),
    lower(regexp_replace(btrim(coalesce(new.company, '')), '\s+', ' ', 'g')),
    lower(regexp_replace(btrim(coalesce(new.location, '')), '\s+', ' ', 'g')),
    md5(lower(regexp_replace(btrim(coalesce(new.description, new.summary, '')), '\s+', ' ', 'g'))),
    md5(lower(regexp_replace(btrim(coalesce(new.requirements, '')), '\s+', ' ', 'g'))),
    private.atsrs_job_search_tokens(concat_ws(' ',
      new.title, new.company, new.location, new.country, new.work_type,
      new.worksite, new.equipment, new.summary, new.description,
      new.requirements, new.recruiter_name, new.recruiter_company
    )),
    now()
  )
  on conflict (job_id) do update set
    title_key = excluded.title_key,
    company_key = excluded.company_key,
    location_key = excluded.location_key,
    description_hash = excluded.description_hash,
    requirements_hash = excluded.requirements_hash,
    search_tokens = excluded.search_tokens,
    updated_at = excluded.updated_at;
  return new;
end;
$$;

revoke all on function atsrs_private.atsrs_refresh_job_semantic_key()
  from public, anon, authenticated, service_role;

drop trigger if exists atsrs_jobs_refresh_semantic_key on public.atsrs_jobs;
create trigger atsrs_jobs_refresh_semantic_key
after insert or update of
  title, company, location, country, work_type, worksite, equipment,
  description, summary, requirements, recruiter_name, recruiter_company
on public.atsrs_jobs
for each row execute function atsrs_private.atsrs_refresh_job_semantic_key();

update atsrs_private.atsrs_job_semantic_keys as semantic
set search_tokens = private.atsrs_job_search_tokens(concat_ws(' ',
      job.title, job.company, job.location, job.country, job.work_type,
      job.worksite, job.equipment, job.summary, job.description,
      job.requirements, job.recruiter_name, job.recruiter_company
    )),
    updated_at = now()
from public.atsrs_jobs as job
where job.id = semantic.job_id;

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
  v_search_tokens text[] := private.atsrs_job_search_tokens(
    array_to_string(coalesce(p_search_terms, '{}'::text[]), ' ')
  );
begin
  v_full := coalesce(atsrs_private.is_jobs_admin(), false)
    or private.atsrs_personal_plan_key((select auth.uid())) in ('pro', 'business');

  with available as materialized (
    select job.*, semantic.search_tokens
      from public.atsrs_jobs as job
      join atsrs_private.atsrs_job_semantic_keys as semantic
        on semantic.job_id = job.id
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
       and job.search_tokens @> v_search_tokens
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

  return jsonb_build_object(
    'access', case when v_full then 'full' else 'limited' end,
    'total', v_total,
    'page', v_page,
    'page_size', v_page_size,
    'jobs', v_jobs
  );
end;
$$;

revoke all on function public.atsrs_jobs_feed_v2(
  integer, integer, text[], text, text, text, text, text, text,
  integer, text[], boolean
) from public, anon, authenticated, service_role;
grant execute on function public.atsrs_jobs_feed_v2(
  integer, integer, text[], text, text, text, text, text, text,
  integer, text[], boolean
) to anon, authenticated;

commit;

