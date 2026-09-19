begin;

drop trigger if exists atsrs_jobs_manual_source_url on public.atsrs_jobs;
drop function if exists atsrs_private.set_manual_job_source_url();

update public.atsrs_jobs
set source_url = null
where source_url = 'https://atsrs.com/?route=jobs&job=' || id::text;

revoke all on function public.atsrs_job_public_v1(uuid)
  from public, anon, authenticated, service_role;
drop function if exists public.atsrs_job_public_v1(uuid);

commit;
