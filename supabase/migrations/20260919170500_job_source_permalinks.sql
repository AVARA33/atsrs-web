begin;

create or replace function atsrs_private.set_manual_job_source_url()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.source_type = 'manual' and nullif(btrim(new.source_url), '') is null then
    new.source_url := 'https://atsrs.com/?route=jobs&job=' || new.id::text;
  end if;
  return new;
end;
$$;

drop trigger if exists atsrs_jobs_manual_source_url on public.atsrs_jobs;
create trigger atsrs_jobs_manual_source_url
before insert or update of source_type, source_url on public.atsrs_jobs
for each row execute function atsrs_private.set_manual_job_source_url();

update public.atsrs_jobs
set source_url = 'https://atsrs.com/?route=jobs&job=' || id::text
where source_type = 'manual'
  and nullif(btrim(source_url), '') is null;

create or replace function public.atsrs_job_public_v1(p_job_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_full boolean := false;
  v_job jsonb;
begin
  v_full := coalesce(atsrs_private.is_jobs_admin(), false)
    or private.atsrs_personal_plan_key(v_user_id) in ('pro', 'business');

  select jsonb_build_object(
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
    'application_url', case when v_full then job.application_url else null end,
    'is_favorite', exists (
      select 1 from public.atsrs_job_favorites as favorite
       where favorite.user_id = v_user_id and favorite.job_id = job.id
    )
  )
  into v_job
  from public.atsrs_jobs as job
  where job.id = p_job_id
    and job.status = 'published'
    and job.published_at is not null
    and job.published_at <= case when v_full then now() else now() - interval '6 hours' end
    and (job.expires_at is null or job.expires_at > now());

  return jsonb_build_object(
    'access', case when v_full then 'full' else 'limited' end,
    'job', v_job
  );
end;
$$;

revoke all on function public.atsrs_job_public_v1(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.atsrs_job_public_v1(uuid)
  to anon, authenticated;

commit;
