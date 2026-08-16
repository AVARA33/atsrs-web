-- The QR upload Edge Function records a successfully uploaded object in
-- atsrs_files with the service-role client after validating its one-time token.
-- Keep the grant intentionally narrow: the function only needs INSERT in
-- addition to its existing SELECT privilege.
grant insert on table public.atsrs_files to service_role;
