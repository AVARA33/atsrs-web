-- Read only the job columns needed for daily balance and archived/alias dedupe.
-- Existing writer permissions are column-scoped; do not grant table-wide SELECT.
grant select(created_at,title,status) on public.atsrs_jobs to service_role;
