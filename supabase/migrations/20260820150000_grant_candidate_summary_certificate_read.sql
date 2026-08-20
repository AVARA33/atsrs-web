-- Candidate Document Summary is assembled by the authenticated
-- talent-profile-actions Edge Function. The function uses its server-only
-- service-role client after it has verified the caller's Corporate workspace
-- and the target candidate's visibility/personnel access.
--
-- The normalized certificates table revoked PUBLIC/anon/authenticated access
-- and restored the owner-facing authenticated grants, but omitted the
-- service_role SELECT grant. That made every server-side summary request fail
-- with `permission denied for table atsrs_personnel_certificates`.
grant select
  on table public.atsrs_personnel_certificates
  to service_role;
