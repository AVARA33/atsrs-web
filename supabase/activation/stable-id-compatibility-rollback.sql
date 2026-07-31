-- Non-destructive Stage 20 rollback.
-- Private configuration and aggregate telemetry are retained for audit.
begin;

set local lock_timeout = '1s';
set local statement_timeout = '5s';

update atsrs_private.stable_id_compatibility_scopes
set kill_switch = true,
    strict_enabled = false,
    updated_at = now()
where strict_enabled
   or not kill_switch;

drop trigger if exists atsrs_workspace_data_compatibility_guard
  on public.atsrs_workspace_data;

revoke all on function public.atsrs_get_stable_id_compatibility(text, text)
  from public, anon, authenticated, service_role;

drop function if exists
  public.atsrs_get_stable_id_compatibility(text, text);
drop function if exists
  atsrs_private.enforce_stable_id_compatibility();

commit;
