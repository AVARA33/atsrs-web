-- Read-only stage-19 inventory. This query must never change production data.
with target_tables as (
  select unnest(array[
    'atsrs_workspace_projects',
    'atsrs_workspace_personnel',
    'atsrs_personnel_certificates',
    'atsrs_project_personnel'
  ]) as table_name
),
normalized_grants as (
  select
    grantee,
    privilege_type,
    count(*) as table_count
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in (select table_name from target_tables)
    and grantee in ('anon', 'authenticated')
  group by grantee, privilege_type
),
normalized_policies as (
  select
    cmd,
    count(*) as policy_count,
    count(*) filter (
      where cmd = 'UPDATE'
        and qual is not null
        and with_check is not null
    ) as guarded_update_count
  from pg_policies
  where schemaname = 'public'
    and tablename in (select table_name from target_tables)
    and 'authenticated' = any(roles)
  group by cmd
)
select jsonb_build_object(
  'counts', jsonb_build_object(
    'workspace_data', (select count(*) from public.atsrs_workspace_data),
    'personnel', (select count(*) from public.atsrs_workspace_personnel),
    'certificates', (select count(*) from public.atsrs_personnel_certificates),
    'projects', (select count(*) from public.atsrs_workspace_projects),
    'assignments', (select count(*) from public.atsrs_project_personnel)
  ),
  'rls_enabled', (
    select count(*)
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in (select table_name from target_tables)
      and relation.relrowsecurity
  ),
  'grants', (
    select coalesce(
      jsonb_agg(to_jsonb(item) order by grantee, privilege_type),
      '[]'::jsonb
    )
    from normalized_grants item
  ),
  'policies', (
    select coalesce(
      jsonb_agg(to_jsonb(item) order by cmd),
      '[]'::jsonb
    )
    from normalized_policies item
  ),
  'forward_shadow_triggers', (
    select count(*)
    from pg_trigger
    where tgname = 'atsrs_workspace_data_normalized_shadow'
      and not tgisinternal
  ),
  'normalized_reverse_triggers', (
    select count(*)
    from pg_trigger trigger_row
    join pg_class relation on relation.oid = trigger_row.tgrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in (select table_name from target_tables)
      and not trigger_row.tgisinternal
  ),
  'stable_ids_required', (
    select enabled
    from atsrs_private.runtime_flags
    where flag_name = 'stable_ids_required'
  )
) as normalized_primary_write_preflight;
