create table if not exists public.atsrs_document_upload_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_type text not null default 'personal' check (account_type = 'personal'),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  token_hint text not null check (char_length(token_hint) between 6 and 12),
  status text not null default 'pending'
    check (status in ('pending', 'uploading', 'uploaded', 'cancelled', 'expired')),
  storage_path text unique,
  file_id uuid references public.atsrs_files(id) on delete set null,
  file_name text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or (size_bytes > 0 and size_bytes <= 15728640)),
  attempt_count smallint not null default 0 check (attempt_count between 0 and 8),
  expires_at timestamptz not null,
  uploaded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.atsrs_document_upload_sessions is
  'Short-lived, single-use Personal document upload handoff sessions. Raw QR tokens are never stored.';

create index if not exists atsrs_document_upload_sessions_owner_created_idx
  on public.atsrs_document_upload_sessions (user_id, created_at desc);

create index if not exists atsrs_document_upload_sessions_expiry_idx
  on public.atsrs_document_upload_sessions (expires_at)
  where status in ('pending', 'uploading');

alter table public.atsrs_document_upload_sessions enable row level security;
revoke all on table public.atsrs_document_upload_sessions from anon, authenticated;
grant all on table public.atsrs_document_upload_sessions to service_role;

