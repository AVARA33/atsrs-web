alter table public.atsrs_profile_shares
  add column if not exists revoked_at timestamptz;

comment on column public.atsrs_profile_shares.revoked_at is
  'Owner-initiated revocation time. Null for active or naturally expired profile shares.';
