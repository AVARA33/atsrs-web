create table if not exists public.atsrs_share_access_requests (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references public.atsrs_profile_shares(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  requester_name text not null check (char_length(btrim(requester_name)) between 2 and 100),
  requester_company text not null check (char_length(btrim(requester_company)) between 2 and 140),
  requester_email text not null check (
    requester_email = lower(requester_email)
    and char_length(requester_email) between 5 and 254
    and requester_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  requested_file_ids uuid[] not null default '{}',
  request_all boolean not null default false,
  status text not null default 'otp_pending'
    check (status in ('otp_pending', 'pending', 'approved', 'declined', 'expired')),
  otp_hash text,
  otp_expires_at timestamptz,
  otp_attempts smallint not null default 0 check (otp_attempts between 0 and 10),
  email_verified_at timestamptz,
  viewer_token_hash text,
  viewer_token_expires_at timestamptz,
  access_expires_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(requested_file_ids) between 1 and 50),
  check (
    (status = 'otp_pending' and otp_hash is not null and otp_expires_at is not null)
    or status <> 'otp_pending'
  )
);

comment on table public.atsrs_share_access_requests is
  'Email-verified recruiter download requests for owner-controlled ATSRS profile shares.';
comment on column public.atsrs_share_access_requests.viewer_token_hash is
  'SHA-256 hash of the recruiter browser token. The raw token is never stored.';
comment on column public.atsrs_share_access_requests.access_expires_at is
  'Download authorization expiry, capped by the parent share expiry.';

create index if not exists atsrs_share_requests_owner_status_idx
  on public.atsrs_share_access_requests (owner_id, status, created_at desc);
create index if not exists atsrs_share_requests_share_email_idx
  on public.atsrs_share_access_requests (share_id, requester_email, created_at desc);
create index if not exists atsrs_share_requests_viewer_token_idx
  on public.atsrs_share_access_requests (share_id, viewer_token_hash)
  where viewer_token_hash is not null;

create table if not exists public.atsrs_share_events (
  id bigint generated always as identity primary key,
  share_id uuid not null references public.atsrs_profile_shares(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid references public.atsrs_share_access_requests(id) on delete set null,
  file_id uuid,
  event_type text not null check (event_type in (
    'link_opened',
    'document_previewed',
    'otp_sent',
    'otp_verified',
    'download_requested',
    'request_approved',
    'request_declined',
    'document_downloaded'
  )),
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.atsrs_share_events is
  'Minimal audit and engagement events for owner-visible ATSRS share analytics.';

create index if not exists atsrs_share_events_owner_created_idx
  on public.atsrs_share_events (owner_id, created_at desc);
create index if not exists atsrs_share_events_share_type_idx
  on public.atsrs_share_events (share_id, event_type, created_at desc);

alter table public.atsrs_share_access_requests enable row level security;
alter table public.atsrs_share_events enable row level security;

revoke all on table public.atsrs_share_access_requests from public, anon, authenticated;
revoke all on table public.atsrs_share_events from public, anon, authenticated;
grant select, insert, update, delete on table public.atsrs_share_access_requests to service_role;
grant select, insert, update, delete on table public.atsrs_share_events to service_role;
grant usage, select on sequence public.atsrs_share_events_id_seq to service_role;

drop policy if exists "Service role manages ATSRS share requests"
  on public.atsrs_share_access_requests;
create policy "Service role manages ATSRS share requests"
  on public.atsrs_share_access_requests
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Service role manages ATSRS share events"
  on public.atsrs_share_events;
create policy "Service role manages ATSRS share events"
  on public.atsrs_share_events
  for all
  to service_role
  using (true)
  with check (true);

;
