-- Non-destructive rollback for the Stage 19 request-storm containment wrapper.
-- Business rows, revisions, receipts and the earlier bounded-lock wrapper stay.
begin;

revoke all on function public.atsrs_apply_workspace_command(
  uuid, bigint, text, text, jsonb, jsonb
) from public, anon, authenticated, service_role;

drop function public.atsrs_apply_workspace_command(
  uuid, bigint, text, text, jsonb, jsonb
);

alter function
  atsrs_private.atsrs_apply_workspace_command_pre_containment_v1(
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
