begin;

-- RLS expressions execute as the requesting role. The helper remains in the
-- non-exposed private schema, while authenticated receives only the EXECUTE
-- privilege required for policy evaluation.
grant execute on function atsrs_private.is_jobs_admin() to authenticated;

commit;
