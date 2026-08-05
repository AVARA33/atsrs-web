-- Required by service-role RPCs that read the private entitlement table.
-- Table privileges alone do not grant schema access.

revoke all on schema atsrs_private from public, anon, authenticated;
grant usage on schema atsrs_private to service_role;
