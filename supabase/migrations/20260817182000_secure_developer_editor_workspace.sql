begin;

create table if not exists public.atsrs_developer_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  role text not null default 'developer_editor' check (role = 'developer_editor'),
  status text not null default 'invited' check (status in ('invited','active','disabled','revoked')),
  access_scope jsonb not null default '{"profiles":["frontend_safe"]}'::jsonb,
  invited_by uuid not null references auth.users(id),
  invited_at timestamptz not null default now(),
  activated_at timestamptz,
  last_login_at timestamptz,
  disabled_at timestamptz,
  revoked_at timestamptz,
  session_revision bigint not null default 1 check (session_revision > 0),
  updated_at timestamptz not null default now(),
  check (email = lower(btrim(email))),
  check (char_length(email) between 3 and 254),
  check (char_length(display_name) between 1 and 120)
);
create unique index if not exists atsrs_developer_memberships_email_idx
  on public.atsrs_developer_memberships (lower(email));
create index if not exists atsrs_developer_memberships_status_idx
  on public.atsrs_developer_memberships (status, updated_at desc);

create table if not exists public.atsrs_developer_changes (
  id uuid primary key default gen_random_uuid(),
  developer_id uuid not null references public.atsrs_developer_memberships(user_id),
  title text not null check (char_length(title) between 3 and 140),
  description text not null check (char_length(description) between 10 and 2000),
  bug_summary text not null check (char_length(bug_summary) between 3 and 1000),
  affected_area text not null check (char_length(affected_area) between 2 and 80),
  branch_name text not null unique check (branch_name ~ '^developer-editor/[a-z0-9][a-z0-9._/-]{2,180}$'),
  base_sha text not null check (base_sha ~ '^[0-9a-f]{40}$'),
  head_sha text not null check (head_sha ~ '^[0-9a-f]{40}$'),
  status text not null default 'draft' check (status in (
    'draft','checking','checks_failed','ready','approval_requested','approved','rejected',
    'publishing','deployed','rollback_ready','rolled_back','blocked_by_main','closed'
  )),
  risk_class text not null default 'LOW_RISK_MINOR_FIX' check (risk_class in ('LOW_RISK_MINOR_FIX','OWNER_APPROVAL_REQUIRED')),
  modified_files jsonb not null default '[]'::jsonb,
  checks jsonb not null default '{}'::jsonb,
  preview jsonb not null default '{}'::jsonb,
  approval jsonb not null default '{}'::jsonb,
  deployment jsonb not null default '{}'::jsonb,
  rollback jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deployed_at timestamptz,
  rolled_back_at timestamptz
);
create index if not exists atsrs_developer_changes_developer_idx
  on public.atsrs_developer_changes (developer_id, updated_at desc);
create index if not exists atsrs_developer_changes_status_idx
  on public.atsrs_developer_changes (status, updated_at desc);

create table if not exists public.atsrs_developer_preview_tokens (
  id uuid primary key default gen_random_uuid(),
  change_id uuid not null references public.atsrs_developer_changes(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  entry_path text not null check (entry_path like 'tests/fixtures/%.html'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);
create index if not exists atsrs_developer_preview_tokens_change_idx
  on public.atsrs_developer_preview_tokens (change_id, expires_at desc);

create table if not exists public.atsrs_developer_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text not null check (actor_role in ('owner','developer_editor','system','unknown')),
  action text not null check (char_length(action) between 2 and 80),
  result text not null check (result in ('allowed','denied','failed','completed','requested')),
  change_id uuid references public.atsrs_developer_changes(id) on delete set null,
  files jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists atsrs_developer_audit_actor_idx
  on public.atsrs_developer_audit (actor_id, created_at desc);
create index if not exists atsrs_developer_audit_change_idx
  on public.atsrs_developer_audit (change_id, created_at desc);

alter table public.atsrs_developer_memberships enable row level security;
alter table public.atsrs_developer_changes enable row level security;
alter table public.atsrs_developer_preview_tokens enable row level security;
alter table public.atsrs_developer_audit enable row level security;

create policy atsrs_developer_memberships_deny_client_access on public.atsrs_developer_memberships
  for all to anon, authenticated using (false) with check (false);
create policy atsrs_developer_changes_deny_client_access on public.atsrs_developer_changes
  for all to anon, authenticated using (false) with check (false);
create policy atsrs_developer_preview_tokens_deny_client_access on public.atsrs_developer_preview_tokens
  for all to anon, authenticated using (false) with check (false);
create policy atsrs_developer_audit_deny_client_access on public.atsrs_developer_audit
  for all to anon, authenticated using (false) with check (false);

revoke all on table public.atsrs_developer_memberships from public, anon, authenticated;
revoke all on table public.atsrs_developer_changes from public, anon, authenticated;
revoke all on table public.atsrs_developer_preview_tokens from public, anon, authenticated;
revoke all on table public.atsrs_developer_audit from public, anon, authenticated;
revoke all on sequence public.atsrs_developer_audit_id_seq from public, anon, authenticated;

comment on table public.atsrs_developer_memberships is
  'Server-managed, revocable Developer Editor role. No browser role assignment or direct table access.';
comment on table public.atsrs_developer_changes is
  'Auditable isolated GitHub change sets under developer-editor/*; repository operations occur only through the Edge broker.';
comment on table public.atsrs_developer_preview_tokens is
  'Short-lived hashed preview grants restricted to safe fixture HTML; raw tokens are never stored.';
comment on table public.atsrs_developer_audit is
  'Append-only service audit for Developer Editor access, edits, validation, publication and violations.';

commit;
