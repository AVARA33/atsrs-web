\set ON_ERROR_STOP on

-- Aggregate-only staging verification. It intentionally returns no personal
-- field, payload, token, path or file name.
begin transaction read only;

select jsonb_build_object(
  'workspace_data', (select count(*) from public.atsrs_workspace_data),
  'workspaces', (select count(*) from public.atsrs_workspaces),
  'files', (select count(*) from public.atsrs_files),
  'personnel', (select count(*) from public.atsrs_workspace_personnel),
  'certificates', (select count(*) from public.atsrs_personnel_certificates),
  'projects', (select count(*) from public.atsrs_workspace_projects),
  'assignments', (select count(*) from public.atsrs_project_personnel)
) as aggregate_counts;

select
  count(*) filter (where c.relrowsecurity) as rls_enabled,
  count(*) as normalized_tables
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'atsrs_workspace_projects',
    'atsrs_workspace_personnel',
    'atsrs_personnel_certificates',
    'atsrs_project_personnel'
  );

select
  count(*) filter (
    where has_table_privilege('anon', format('%I.%I', n.nspname, c.relname), 'SELECT')
  ) as anon_select_tables,
  count(*) filter (
    where has_table_privilege('authenticated', format('%I.%I', n.nspname, c.relname), 'INSERT,UPDATE,DELETE')
  ) as authenticated_write_tables
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'atsrs_workspace_projects',
    'atsrs_workspace_personnel',
    'atsrs_personnel_certificates',
    'atsrs_project_personnel'
  );

select jsonb_build_object(
  'duplicate_project_ids', (
    select count(*) from (
      select workspace_user_id, workspace_account_type, source_entity_id
      from public.atsrs_workspace_projects
      group by 1, 2, 3 having count(*) > 1
    ) d
  ),
  'duplicate_personnel_ids', (
    select count(*) from (
      select workspace_user_id, workspace_account_type, source_entity_id
      from public.atsrs_workspace_personnel
      group by 1, 2, 3 having count(*) > 1
    ) d
  ),
  'duplicate_certificate_ids', (
    select count(*) from (
      select workspace_user_id, workspace_account_type, source_entity_id
      from public.atsrs_personnel_certificates
      group by 1, 2, 3 having count(*) > 1
    ) d
  ),
  'duplicate_assignment_ids', (
    select count(*) from (
      select workspace_user_id, workspace_account_type, source_entity_id
      from public.atsrs_project_personnel
      group by 1, 2, 3 having count(*) > 1
    ) d
  ),
  'certificate_orphans', (
    select count(*)
    from public.atsrs_personnel_certificates c
    left join public.atsrs_workspace_personnel p
      on p.workspace_user_id = c.workspace_user_id
     and p.workspace_account_type = c.workspace_account_type
     and p.id = c.personnel_id
    where p.id is null
  ),
  'assignment_orphans', (
    select count(*)
    from public.atsrs_project_personnel a
    left join public.atsrs_workspace_projects p
      on p.workspace_user_id = a.workspace_user_id
     and p.workspace_account_type = a.workspace_account_type
     and p.id = a.project_id
    left join public.atsrs_workspace_personnel pe
      on pe.workspace_user_id = a.workspace_user_id
     and pe.workspace_account_type = a.workspace_account_type
     and pe.id = a.personnel_id
    where p.id is null or pe.id is null
  )
) as normalized_integrity;

select jsonb_build_object(
  'blank_storage_paths', count(*) filter (where btrim(storage_path) = ''),
  'duplicate_storage_paths', (
    select count(*) from (
      select storage_path from public.atsrs_files group by storage_path having count(*) > 1
    ) d
  )
) as storage_reference_integrity
from public.atsrs_files;

select
  p.prosecdef as security_definer,
  p.proconfig as function_config,
  md5(p.prosrc) as body_md5,
  coalesce(array_to_string(p.proacl, ','), '') as execute_acl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'private'
  and p.proname = 'atsrs_queue_due_notifications'
  and pg_get_function_identity_arguments(p.oid) = 'p_as_of date';

rollback;
