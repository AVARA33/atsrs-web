-- Final enforcement switch. Run only after the migration and V387 frontend
-- have both passed the production checks in the activation runbook.
begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

lock table public.atsrs_workspace_data in share row exclusive mode;

do $check$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'atsrs_workspace_personnel'
      and column_name = 'source_entity_id'
  ) then
    raise exception 'stable-ID migration is not installed';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'atsrs_workspace_data_normalized_shadow'
      and not tgisinternal
  ) then
    raise exception 'normalized shadow trigger is missing';
  end if;

  if (select count(*) from public.atsrs_personnel_certificates c
      left join public.atsrs_workspace_personnel p
        on p.id = c.personnel_id
       and p.workspace_user_id = c.workspace_user_id
       and p.workspace_account_type = c.workspace_account_type
      where p.id is null) <> 0 then
    raise exception 'certificate orphan check failed';
  end if;

  if (select count(*) from public.atsrs_project_personnel a
      left join public.atsrs_workspace_personnel p
        on p.id = a.personnel_id
       and p.workspace_user_id = a.workspace_user_id
       and p.workspace_account_type = a.workspace_account_type
      left join public.atsrs_workspace_projects j
        on j.id = a.project_id
       and j.workspace_user_id = a.workspace_user_id
       and j.workspace_account_type = a.workspace_account_type
      where p.id is null or j.id is null) <> 0 then
    raise exception 'project-personnel orphan check failed';
  end if;
end;
$check$;

update atsrs_private.runtime_flags
set enabled = true,
    updated_at = now()
where flag_name = 'stable_ids_required';

do $check$
begin
  if not coalesce((
    select enabled
    from atsrs_private.runtime_flags
    where flag_name = 'stable_ids_required'
  ), false) then
    raise exception 'stable_ids_required was not enabled';
  end if;
end;
$check$;

commit;

select flag_name, enabled, updated_at
from atsrs_private.runtime_flags
where flag_name = 'stable_ids_required';
