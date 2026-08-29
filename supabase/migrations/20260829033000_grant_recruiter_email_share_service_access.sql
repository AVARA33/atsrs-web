-- The share-profile Edge Function authenticates the owner itself and then uses
-- the service role to resolve only the selected verified recruiter.
grant select on table public.atsrs_recruiters to service_role;
