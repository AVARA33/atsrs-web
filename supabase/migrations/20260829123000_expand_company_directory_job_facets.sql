begin;

-- Non-contact job signals used to derive company directory categories.
-- The access window remains identical to the existing JobSearch facets RPC.
create or replace function public.atsrs_jobs_facets()
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

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', job.id,
      'title', job.title,
      'location', job.location,
      'company', job.company,
      'recruiter_company', case when v_full then job.recruiter_company else null end,
      'recruiter_name', case when v_full then job.recruiter_name else null end,
      'worksite', job.worksite,
      'work_type', job.work_type,
      'equipment', job.equipment
    ) order by job.title, job.id
  ), '[]'::jsonb)
    into v_rows
    from (
      select vacancy.*
        from public.atsrs_jobs as vacancy
       where vacancy.status = 'published'
         and vacancy.published_at is not null
         and vacancy.published_at <= case when v_full then now() else now() - interval '6 hours' end
         and (vacancy.expires_at is null or vacancy.expires_at > now())
       order by vacancy.updated_at desc, vacancy.id desc
       limit case when v_full then null else 30 end
    ) as job;

  return v_rows;
end;
$$;

revoke all on function public.atsrs_jobs_facets()
  from public, anon, authenticated, service_role;
grant execute on function public.atsrs_jobs_facets() to anon, authenticated;

commit;
