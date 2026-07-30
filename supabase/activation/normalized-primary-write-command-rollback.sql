-- Non-destructive Stage 19 feature rollback. Run only after the frontend
-- primary-write flag is disabled. Existing legacy/normalized business rows
-- are not modified.
begin;

revoke all on function public.atsrs_apply_workspace_command(
  uuid, bigint, text, text, jsonb, jsonb
) from public, anon, authenticated, service_role;

drop function if exists public.atsrs_apply_workspace_command(
  uuid, bigint, text, text, jsonb, jsonb
);

drop trigger if exists atsrs_workspace_data_command_revision
  on public.atsrs_workspace_data;
drop function if exists atsrs_private.bump_workspace_write_revision();
drop function if exists atsrs_private.assert_workspace_operation_parity(
  uuid, text, jsonb
);

do $rollback$
begin
  if exists (select 1 from atsrs_private.workspace_write_commands)
     or exists (
       select 1
       from atsrs_private.workspace_write_revisions
       where revision <> 0
     ) then
    raise exception
      'Stage 19 audit/revision evidence exists; retain private tables and use forward recovery';
  end if;

  drop table atsrs_private.workspace_write_commands;
  drop table atsrs_private.workspace_write_revisions;
end;
$rollback$;

commit;
