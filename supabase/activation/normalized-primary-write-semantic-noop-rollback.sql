-- Non-destructive feature rollback for the Stage 19 semantic no-op wrapper.
-- Existing command receipts, revisions and business data are preserved.
begin;

revoke all on function public.atsrs_apply_workspace_command(
  uuid, bigint, text, text, jsonb, jsonb
) from public, anon, authenticated, service_role;

drop function public.atsrs_apply_workspace_command(
  uuid, bigint, text, text, jsonb, jsonb
);

alter function atsrs_private.atsrs_apply_workspace_command_v1(
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

drop function if exists
  atsrs_private.atsrs_workspace_business_semantic(text, jsonb);
drop function if exists
  atsrs_private.atsrs_workspace_business_semantic_v1(text, jsonb);
drop function if exists
  atsrs_private.atsrs_strip_technical_metadata(jsonb);

notify pgrst, 'reload schema';

commit;
