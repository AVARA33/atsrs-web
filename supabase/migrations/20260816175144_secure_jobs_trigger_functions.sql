begin;

alter function atsrs_private.prepare_job_identity() security definer;
alter function atsrs_private.prepare_job_identity() set search_path = '';
alter function atsrs_private.apply_job_lifecycle() security definer;
alter function atsrs_private.apply_job_lifecycle() set search_path = '';

revoke all on function atsrs_private.prepare_job_identity() from public, anon, authenticated, service_role;
revoke all on function atsrs_private.apply_job_lifecycle() from public, anon, authenticated, service_role;

commit;
