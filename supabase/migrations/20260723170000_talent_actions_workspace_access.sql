-- V292: allow trusted Edge Functions to verify Corporate workspaces.
-- Browser clients remain restricted by the existing authenticated RLS policies.
grant select on table public.atsrs_workspaces to service_role;
grant select on table public.atsrs_files to service_role;
