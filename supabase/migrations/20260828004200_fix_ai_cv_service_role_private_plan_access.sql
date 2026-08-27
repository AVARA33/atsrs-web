-- The AI CV Edge Function reserves quota through a service-role-only RPC.
-- Its plan helper remains private, but the service role needs the minimum
-- schema/function privileges required for that internal call.

revoke all on function private.atsrs_personal_plan_key(uuid)
  from public, anon, authenticated, service_role;

grant usage on schema private to service_role;
grant execute on function private.atsrs_personal_plan_key(uuid) to service_role;
