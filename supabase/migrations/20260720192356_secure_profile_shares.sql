create table if not exists public.atsrs_profile_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_type text not null default 'personal'
    check (account_type in ('personal', 'company')),
  token_hash text not null unique
    check (token_hash ~ '^[0-9a-f]{64}$'),
  token_hint text not null
    check (char_length(token_hint) between 6 and 12),
  selected_file_ids uuid[] not null default '{}',
  enabled boolean not null default true,
  expires_at timestamptz,
  view_count bigint not null default 0
    check (view_count >= 0),
  last_viewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, account_type)
);

comment on table public.atsrs_profile_shares is
  'Revocable ATSRS profile-share definitions. Raw bearer tokens are never stored.';
comment on column public.atsrs_profile_shares.token_hash is
  'SHA-256 hash of the public share token.';
comment on column public.atsrs_profile_shares.selected_file_ids is
  'Owner-approved ATSRS file IDs exposed through the share-profile Edge Function.';

create index if not exists atsrs_profile_shares_owner_idx
  on public.atsrs_profile_shares (user_id, account_type);

create index if not exists atsrs_profile_shares_active_token_idx
  on public.atsrs_profile_shares (token_hash)
  where enabled;

create index if not exists atsrs_files_owner_account_idx
  on public.atsrs_files (user_id, account_type);

alter table public.atsrs_profile_shares enable row level security;

revoke all on table public.atsrs_profile_shares from public, anon, authenticated;
grant select, insert, update, delete on table public.atsrs_profile_shares to service_role;
grant select on table public.atsrs_workspace_data to service_role;
grant select on table public.atsrs_files to service_role;

drop policy if exists "Service role manages ATSRS profile shares"
  on public.atsrs_profile_shares;
create policy "Service role manages ATSRS profile shares"
  on public.atsrs_profile_shares
  for all
  to service_role
  using (true)
  with check (true);
