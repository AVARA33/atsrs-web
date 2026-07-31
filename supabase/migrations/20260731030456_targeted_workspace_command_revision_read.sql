-- Stage 19 targeted production activation.
-- Adds only the authenticated, read-only workspace command revision RPC.
begin;

set local lock_timeout = '250ms';
set local statement_timeout = '5s';

do $preflight$
begin
  if current_database() is null then
    raise exception 'ATSRS_TARGET_PREFLIGHT_FAILED';
  end if;

  if to_regprocedure(
    'public.atsrs_get_workspace_command_revision(text)'
  ) is not null then
    raise exception 'ATSRS_REVISION_RPC_ALREADY_EXISTS';
  end if;

  if to_regclass('public.atsrs_workspaces') is null
     or to_regclass('atsrs_private.workspace_write_revisions') is null then
    raise exception 'ATSRS_REVISION_RPC_DEPENDENCY_MISSING';
  end if;
end;
$preflight$;

create function public.atsrs_get_workspace_command_revision(
  p_account_type text
)
returns bigint
language plpgsql
stable
security definer
set search_path = ''
set statement_timeout = '2s'
as $function$
declare
  actor_id uuid := (select auth.uid());
  current_revision bigint;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'ATSRS_AUTH_REQUIRED';
  end if;

  if p_account_type not in ('personal', 'company') then
    raise exception using errcode = '22023',
      message = 'ATSRS_INVALID_ACCOUNT_TYPE';
  end if;

  if not exists (
    select 1
    from public.atsrs_workspaces workspace
    where workspace.user_id = actor_id
      and workspace.account_type = p_account_type
  ) then
    raise exception using errcode = '42501',
      message = 'ATSRS_WORKSPACE_FORBIDDEN';
  end if;

  select state.revision
  into current_revision
  from atsrs_private.workspace_write_revisions state
  where state.workspace_user_id = actor_id
    and state.workspace_account_type = p_account_type;

  return coalesce(current_revision, 0);
end;
$function$;

revoke all on function public.atsrs_get_workspace_command_revision(text)
from public, anon, service_role;
grant execute on function public.atsrs_get_workspace_command_revision(text)
to authenticated;

commit;
