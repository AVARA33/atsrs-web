-- Non-destructive feature rollback for the Stage 19 bounded-lock wrapper.
-- Business data, revisions and idempotency receipts are preserved.
begin;

revoke all on function public.atsrs_apply_workspace_command(
  uuid, bigint, text, text, jsonb, jsonb
) from public, anon, authenticated, service_role;

drop function public.atsrs_apply_workspace_command(
  uuid, bigint, text, text, jsonb, jsonb
);

drop function if exists
  public.atsrs_get_workspace_command_revision(text);

alter function atsrs_private.atsrs_apply_workspace_command_pre_lock_v1(
  uuid, bigint, text, text, jsonb, jsonb
) rename to atsrs_apply_workspace_command;

alter function atsrs_private.atsrs_apply_workspace_command(
  uuid, bigint, text, text, jsonb, jsonb
) set schema public;

revoke all on function public.atsrs_apply_workspace_command(
  uuid, bigint, text, text, jsonb, jsonb
) from public, anon, service_role;
grant execute on function public.atsrs_apply_workspace_command(
  uuid, bigint, text, text, jsonb, jsonb
) to authenticated;

notify pgrst, 'reload schema';

commit;
