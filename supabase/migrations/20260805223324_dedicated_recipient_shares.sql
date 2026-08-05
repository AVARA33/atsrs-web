-- ATSRS Dedicated Recipient Links.
-- Additive only: the legacy General Share tables and rows are not changed.

create schema if not exists atsrs_private;

create table if not exists atsrs_private.atsrs_recipient_share_entitlements (
  owner_user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  active_limit smallint not null default 0 check (active_limit between 0 and 100),
  source text not null default 'canary'
    check (source in ('canary', 'billing')),
  updated_at timestamptz not null default now()
);

alter table atsrs_private.atsrs_recipient_share_entitlements enable row level security;
revoke all on table atsrs_private.atsrs_recipient_share_entitlements
  from public, anon, authenticated;
grant select, insert, update, delete
  on table atsrs_private.atsrs_recipient_share_entitlements to service_role;

create table if not exists public.atsrs_recipient_shares (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  account_type text not null default 'personal'
    check (account_type = 'personal'),
  recipient_type text not null check (recipient_type in ('person', 'company')),
  recipient_label text not null
    check (char_length(btrim(recipient_label)) between 2 and 140),
  recipient_email_hash text not null
    check (recipient_email_hash ~ '^[0-9a-f]{64}$'),
  recipient_email_masked text not null
    check (char_length(recipient_email_masked) between 5 and 254),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  token_hint text not null check (char_length(token_hint) between 6 and 12),
  status text not null default 'active'
    check (status in ('active', 'revoked', 'expired')),
  allow_preview boolean not null default true,
  allow_download boolean not null default false,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 1 check (version >= 1),
  idempotency_key uuid not null,
  unique (owner_user_id, idempotency_key),
  unique (id, owner_user_id, account_type),
  check (
    (status = 'revoked' and revoked_at is not null)
    or (status <> 'revoked' and revoked_at is null)
  ),
  check (allow_preview or allow_download)
);

create index if not exists atsrs_recipient_shares_owner_status_expiry_idx
  on public.atsrs_recipient_shares
  (owner_user_id, status, expires_at desc);

create index if not exists atsrs_recipient_shares_active_expiry_idx
  on public.atsrs_recipient_shares (expires_at)
  where status = 'active';

create table if not exists public.atsrs_recipient_share_documents (
  share_id uuid not null
    references public.atsrs_recipient_shares(id) on delete cascade,
  document_id uuid not null
    references public.atsrs_files(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (share_id, document_id)
);

create index if not exists atsrs_recipient_share_documents_document_idx
  on public.atsrs_recipient_share_documents (document_id, share_id);

create table if not exists public.atsrs_recipient_share_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null
    references public.atsrs_recipient_shares(id) on delete cascade,
  email_hash text not null check (email_hash ~ '^[0-9a-f]{64}$'),
  otp_hash text not null check (otp_hash ~ '^[0-9a-f]{64}$'),
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  attempt_count smallint not null default 0
    check (attempt_count between 0 and 5),
  consumed_at timestamptz,
  nonce uuid not null unique,
  created_at timestamptz not null default now()
);

create index if not exists atsrs_recipient_share_otp_rate_idx
  on public.atsrs_recipient_share_otp_challenges
  (share_id, email_hash, ip_hash, created_at desc);

create table if not exists public.atsrs_recipient_share_viewer_sessions (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null
    references public.atsrs_recipient_shares(id) on delete cascade,
  session_hash text not null unique check (session_hash ~ '^[0-9a-f]{64}$'),
  email_hash text not null check (email_hash ~ '^[0-9a-f]{64}$'),
  scope text[] not null default '{}'::text[]
    check (scope <@ array['preview', 'download']::text[]),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create index if not exists atsrs_recipient_share_sessions_lookup_idx
  on public.atsrs_recipient_share_viewer_sessions
  (share_id, session_hash, expires_at)
  where revoked_at is null;

create table if not exists public.atsrs_recipient_share_access_requests (
  id uuid primary key default gen_random_uuid(),
  dedicated_share_id uuid not null
    references public.atsrs_recipient_shares(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  viewer_session_id uuid not null
    references public.atsrs_recipient_share_viewer_sessions(id) on delete cascade,
  requested_document_ids uuid[] not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined', 'expired', 'revoked')),
  access_expires_at timestamptz,
  idempotency_key uuid not null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dedicated_share_id, idempotency_key),
  check (cardinality(requested_document_ids) between 1 and 50)
);

create index if not exists atsrs_recipient_share_requests_owner_status_idx
  on public.atsrs_recipient_share_access_requests
  (owner_user_id, status, created_at desc);

create index if not exists atsrs_recipient_share_requests_viewer_idx
  on public.atsrs_recipient_share_access_requests
  (dedicated_share_id, viewer_session_id, created_at desc);

create table if not exists public.atsrs_recipient_share_events (
  id bigint generated always as identity primary key,
  share_id uuid not null
    references public.atsrs_recipient_shares(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid references public.atsrs_recipient_share_access_requests(id)
    on delete set null,
  document_id uuid references public.atsrs_files(id) on delete set null,
  operation_id uuid,
  event_type text not null check (
    event_type in (
      'created', 'opened', 'otp_requested', 'verified', 'previewed',
      'download_requested', 'approved', 'downloaded', 'denied', 'revoked',
      'expired'
    )
  ),
  reason_code text,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (
    not (event_data ?| array[
      'email', 'recipient_email', 'token', 'otp', 'ip', 'user_agent',
      'authorization'
    ])
  )
);

create unique index if not exists atsrs_recipient_share_events_operation_idx
  on public.atsrs_recipient_share_events (operation_id)
  where operation_id is not null;

create unique index if not exists atsrs_recipient_share_events_one_download_idx
  on public.atsrs_recipient_share_events (request_id, document_id)
  where event_type = 'downloaded'
    and request_id is not null
    and document_id is not null;

create index if not exists atsrs_recipient_share_events_owner_created_idx
  on public.atsrs_recipient_share_events
  (owner_user_id, created_at desc);

create index if not exists atsrs_recipient_share_events_share_type_idx
  on public.atsrs_recipient_share_events
  (share_id, event_type, created_at desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'atsrs_recipient_shares',
    'atsrs_recipient_share_documents',
    'atsrs_recipient_share_otp_challenges',
    'atsrs_recipient_share_viewer_sessions',
    'atsrs_recipient_share_access_requests',
    'atsrs_recipient_share_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'revoke all on table public.%I from public, anon, authenticated',
      table_name
    );
    execute format(
      'grant select, insert, update, delete on table public.%I to service_role',
      table_name
    );
  end loop;
end
$$;

grant usage, select on sequence public.atsrs_recipient_share_events_id_seq
  to service_role;

create policy "Owners can select their dedicated recipient shares"
  on public.atsrs_recipient_shares for select to authenticated
  using ((select auth.uid()) = owner_user_id);
create policy "Owners can insert their dedicated recipient shares"
  on public.atsrs_recipient_shares for insert to authenticated
  with check ((select auth.uid()) = owner_user_id);
create policy "Owners can update their dedicated recipient shares"
  on public.atsrs_recipient_shares for update to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);
create policy "Owners can delete their dedicated recipient shares"
  on public.atsrs_recipient_shares for delete to authenticated
  using ((select auth.uid()) = owner_user_id);

do $$
declare
  table_name text;
  share_column text;
begin
  foreach table_name in array array[
    'atsrs_recipient_share_documents',
    'atsrs_recipient_share_otp_challenges',
    'atsrs_recipient_share_viewer_sessions',
    'atsrs_recipient_share_events'
  ]
  loop
    share_column := 'share_id';
    execute format(
      'create policy %I on public.%I for select to authenticated using '
      || '(exists (select 1 from public.atsrs_recipient_shares s '
      || 'where s.id = %I.%I and s.owner_user_id = (select auth.uid())))',
      'Owners can select ' || table_name,
      table_name,
      table_name,
      share_column
    );
  end loop;
end
$$;

create policy "Owners can select dedicated recipient access requests"
  on public.atsrs_recipient_share_access_requests
  for select to authenticated
  using ((select auth.uid()) = owner_user_id);

create or replace function public.atsrs_validate_recipient_share_document()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  share_owner uuid;
  share_account text;
begin
  select owner_user_id, account_type
    into share_owner, share_account
    from public.atsrs_recipient_shares
   where id = new.share_id;

  if share_owner is null then
    raise exception using errcode = '23503',
      message = 'ATSRS_RECIPIENT_SHARE_NOT_FOUND';
  end if;

  if not exists (
    select 1
      from public.atsrs_files
     where id = new.document_id
       and user_id = share_owner
       and account_type = share_account
  ) then
    raise exception using errcode = '42501',
      message = 'ATSRS_RECIPIENT_DOCUMENT_SCOPE_MISMATCH';
  end if;
  return new;
end
$function$;

revoke all on function public.atsrs_validate_recipient_share_document()
  from public, anon, authenticated;
grant execute on function public.atsrs_validate_recipient_share_document()
  to service_role;

drop trigger if exists atsrs_validate_recipient_share_document
  on public.atsrs_recipient_share_documents;
create trigger atsrs_validate_recipient_share_document
before insert or update on public.atsrs_recipient_share_documents
for each row execute function public.atsrs_validate_recipient_share_document();

create or replace function public.atsrs_create_recipient_share(
  p_owner_user_id uuid,
  p_idempotency_key uuid,
  p_recipient_type text,
  p_recipient_label text,
  p_recipient_email_hash text,
  p_recipient_email_masked text,
  p_token_hash text,
  p_token_hint text,
  p_allow_preview boolean,
  p_allow_download boolean,
  p_expires_at timestamptz,
  p_document_ids uuid[]
)
returns public.atsrs_recipient_shares
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  entitlement atsrs_private.atsrs_recipient_share_entitlements%rowtype;
  result public.atsrs_recipient_shares%rowtype;
  active_count integer;
begin
  if p_owner_user_id is null
     or p_idempotency_key is null
     or p_expires_at <= now()
     or p_expires_at > now() + interval '366 days'
     or cardinality(p_document_ids) not between 1 and 50
     or cardinality(p_document_ids)
        <> cardinality(array(select distinct value from unnest(p_document_ids) value))
  then
    raise exception using errcode = '22023',
      message = 'ATSRS_RECIPIENT_INVALID_INPUT';
  end if;

  select * into entitlement
    from atsrs_private.atsrs_recipient_share_entitlements
   where owner_user_id = p_owner_user_id
   for update;
  if not found or not entitlement.enabled or entitlement.active_limit < 1 then
    raise exception using errcode = '42501',
      message = 'ATSRS_RECIPIENT_FEATURE_DISABLED';
  end if;

  select * into result
    from public.atsrs_recipient_shares
   where owner_user_id = p_owner_user_id
     and idempotency_key = p_idempotency_key;
  if found then
    return result;
  end if;

  select count(*) into active_count
    from public.atsrs_recipient_shares
   where owner_user_id = p_owner_user_id
     and status = 'active'
     and expires_at > now();
  if active_count >= entitlement.active_limit then
    raise exception using errcode = 'P0001',
      message = 'ATSRS_RECIPIENT_ACTIVE_LIMIT_REACHED';
  end if;

  if not exists (
    select 1 from public.atsrs_workspaces
     where user_id = p_owner_user_id and account_type = 'personal'
  ) then
    raise exception using errcode = '42501',
      message = 'ATSRS_RECIPIENT_PERSONAL_WORKSPACE_REQUIRED';
  end if;

  insert into public.atsrs_recipient_shares (
    owner_user_id, account_type, recipient_type, recipient_label,
    recipient_email_hash, recipient_email_masked, token_hash, token_hint,
    allow_preview, allow_download, expires_at, idempotency_key
  ) values (
    p_owner_user_id, 'personal', p_recipient_type, btrim(p_recipient_label),
    p_recipient_email_hash, p_recipient_email_masked, p_token_hash, p_token_hint,
    p_allow_preview, p_allow_download, p_expires_at, p_idempotency_key
  )
  returning * into result;

  insert into public.atsrs_recipient_share_documents (share_id, document_id)
  select result.id, value from unnest(p_document_ids) value;

  insert into public.atsrs_recipient_share_events (
    share_id, owner_user_id, operation_id, event_type, reason_code,
    event_data
  ) values (
    result.id, p_owner_user_id, p_idempotency_key, 'created',
    'owner_created',
    jsonb_build_object(
      'recipient_type', p_recipient_type,
      'document_count', cardinality(p_document_ids),
      'allow_preview', p_allow_preview,
      'allow_download', p_allow_download
    )
  );
  return result;
end
$function$;

create or replace function public.atsrs_update_recipient_share(
  p_owner_user_id uuid,
  p_share_id uuid,
  p_expected_version bigint,
  p_operation_id uuid,
  p_recipient_type text,
  p_recipient_label text,
  p_recipient_email_hash text,
  p_recipient_email_masked text,
  p_new_token_hash text,
  p_new_token_hint text,
  p_allow_preview boolean,
  p_allow_download boolean,
  p_expires_at timestamptz,
  p_document_ids uuid[]
)
returns public.atsrs_recipient_shares
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  current_row public.atsrs_recipient_shares%rowtype;
  result public.atsrs_recipient_shares%rowtype;
  entitlement_enabled boolean;
  rotate_token boolean;
begin
  if p_operation_id is null
     or p_expires_at <= now()
     or cardinality(p_document_ids) not between 1 and 50
     or cardinality(p_document_ids)
        <> cardinality(array(select distinct value from unnest(p_document_ids) value))
  then
    raise exception using errcode = '22023',
      message = 'ATSRS_RECIPIENT_INVALID_INPUT';
  end if;

  if exists (
    select 1 from public.atsrs_recipient_share_events
     where operation_id = p_operation_id
  ) then
    select * into result from public.atsrs_recipient_shares
     where id = p_share_id and owner_user_id = p_owner_user_id;
    return result;
  end if;

  select * into current_row
    from public.atsrs_recipient_shares
   where id = p_share_id and owner_user_id = p_owner_user_id
   for update;
  if not found then
    raise exception using errcode = '42501',
      message = 'ATSRS_RECIPIENT_SHARE_NOT_FOUND';
  end if;
  if current_row.status <> 'active' or current_row.expires_at <= now() then
    raise exception using errcode = 'P0001',
      message = 'ATSRS_RECIPIENT_SHARE_NOT_ACTIVE';
  end if;
  if current_row.version <> p_expected_version then
    raise exception using errcode = 'P0001',
      message = 'ATSRS_RECIPIENT_STALE_VERSION';
  end if;

  select enabled into entitlement_enabled
    from atsrs_private.atsrs_recipient_share_entitlements
   where owner_user_id = p_owner_user_id;
  if p_expires_at > current_row.expires_at
     and coalesce(entitlement_enabled, false) is false
  then
    raise exception using errcode = '42501',
      message = 'ATSRS_RECIPIENT_EXTENSION_DISABLED';
  end if;

  rotate_token := current_row.recipient_email_hash <> p_recipient_email_hash;
  if rotate_token and (p_new_token_hash is null or p_new_token_hint is null) then
    raise exception using errcode = '22023',
      message = 'ATSRS_RECIPIENT_ROTATION_REQUIRED';
  end if;

  update public.atsrs_recipient_shares
     set recipient_type = p_recipient_type,
         recipient_label = btrim(p_recipient_label),
         recipient_email_hash = p_recipient_email_hash,
         recipient_email_masked = p_recipient_email_masked,
         token_hash = case when rotate_token then p_new_token_hash else token_hash end,
         token_hint = case when rotate_token then p_new_token_hint else token_hint end,
         allow_preview = p_allow_preview,
         allow_download = p_allow_download,
         expires_at = p_expires_at,
         updated_at = now(),
         version = version + 1
   where id = current_row.id
   returning * into result;

  delete from public.atsrs_recipient_share_documents
   where share_id = current_row.id;
  insert into public.atsrs_recipient_share_documents (share_id, document_id)
  select current_row.id, value from unnest(p_document_ids) value;

  if rotate_token then
    update public.atsrs_recipient_share_viewer_sessions
       set revoked_at = coalesce(revoked_at, now())
     where share_id = current_row.id and revoked_at is null;
    update public.atsrs_recipient_share_access_requests
       set status = 'revoked', access_expires_at = null, updated_at = now()
     where dedicated_share_id = current_row.id
       and status in ('pending', 'approved');
    delete from public.atsrs_recipient_share_otp_challenges
     where share_id = current_row.id and consumed_at is null;
  end if;

  insert into public.atsrs_recipient_share_events (
    share_id, owner_user_id, operation_id, event_type, reason_code,
    event_data
  ) values (
    current_row.id, p_owner_user_id, p_operation_id, 'created',
    case when rotate_token then 'owner_rotated' else 'owner_updated' end,
    jsonb_build_object(
      'document_count', cardinality(p_document_ids),
      'allow_preview', p_allow_preview,
      'allow_download', p_allow_download,
      'token_rotated', rotate_token
    )
  );
  return result;
end
$function$;

create or replace function public.atsrs_revoke_recipient_share(
  p_owner_user_id uuid,
  p_share_id uuid,
  p_operation_id uuid
)
returns public.atsrs_recipient_shares
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  result public.atsrs_recipient_shares%rowtype;
begin
  select * into result
    from public.atsrs_recipient_shares
   where id = p_share_id and owner_user_id = p_owner_user_id
   for update;
  if not found then
    raise exception using errcode = '42501',
      message = 'ATSRS_RECIPIENT_SHARE_NOT_FOUND';
  end if;
  if result.status = 'revoked' then return result; end if;

  update public.atsrs_recipient_shares
     set status = 'revoked', revoked_at = now(), updated_at = now(),
         version = version + 1
   where id = result.id
   returning * into result;
  update public.atsrs_recipient_share_viewer_sessions
     set revoked_at = coalesce(revoked_at, now())
   where share_id = result.id and revoked_at is null;
  update public.atsrs_recipient_share_access_requests
     set status = 'revoked', access_expires_at = null, updated_at = now()
   where dedicated_share_id = result.id
     and status in ('pending', 'approved');
  delete from public.atsrs_recipient_share_otp_challenges
   where share_id = result.id and consumed_at is null;
  insert into public.atsrs_recipient_share_events (
    share_id, owner_user_id, operation_id, event_type, reason_code
  ) values (
    result.id, p_owner_user_id, p_operation_id, 'revoked', 'owner_revoked'
  ) on conflict (operation_id) where operation_id is not null do nothing;
  return result;
end
$function$;

create or replace function public.atsrs_verify_recipient_share_otp(
  p_share_id uuid,
  p_token_hash text,
  p_email_hash text,
  p_challenge_id uuid,
  p_otp_hash text,
  p_session_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  share_row public.atsrs_recipient_shares%rowtype;
  challenge_row public.atsrs_recipient_share_otp_challenges%rowtype;
  session_row public.atsrs_recipient_share_viewer_sessions%rowtype;
  session_expiry timestamptz;
  next_attempts smallint;
begin
  select * into share_row from public.atsrs_recipient_shares
   where id = p_share_id and token_hash = p_token_hash
   for update;
  if not found or share_row.status <> 'active'
     or share_row.expires_at <= now()
     or share_row.recipient_email_hash <> p_email_hash
  then
    return jsonb_build_object('ok', false, 'code', 'INVALID_VERIFICATION');
  end if;

  select * into challenge_row
    from public.atsrs_recipient_share_otp_challenges
   where id = p_challenge_id and share_id = share_row.id
   for update;
  if not found or challenge_row.email_hash <> p_email_hash
     or challenge_row.consumed_at is not null
     or challenge_row.expires_at <= now()
     or challenge_row.attempt_count >= 5
  then
    return jsonb_build_object('ok', false, 'code', 'INVALID_VERIFICATION');
  end if;

  if challenge_row.otp_hash <> p_otp_hash then
    next_attempts := least(challenge_row.attempt_count + 1, 5);
    update public.atsrs_recipient_share_otp_challenges
       set attempt_count = next_attempts,
           consumed_at = case when next_attempts >= 5 then now() else null end
     where id = challenge_row.id;
    return jsonb_build_object('ok', false, 'code', 'INVALID_VERIFICATION');
  end if;

  update public.atsrs_recipient_share_otp_challenges
     set consumed_at = now()
   where id = challenge_row.id;
  session_expiry := least(share_row.expires_at, now() + interval '7 days');
  insert into public.atsrs_recipient_share_viewer_sessions (
    share_id, session_hash, email_hash, scope, expires_at, last_seen_at
  ) values (
    share_row.id, p_session_hash, p_email_hash,
    array_remove(array[
      case when share_row.allow_preview then 'preview' end,
      case when share_row.allow_download then 'download' end
    ], null),
    session_expiry, now()
  ) returning * into session_row;
  insert into public.atsrs_recipient_share_events (
    share_id, owner_user_id, event_type, reason_code
  ) values (
    share_row.id, share_row.owner_user_id, 'verified', 'email_otp'
  );
  return jsonb_build_object(
    'ok', true,
    'session_id', session_row.id,
    'expires_at', session_row.expires_at,
    'scope', session_row.scope
  );
end
$function$;

create or replace function public.atsrs_create_recipient_download_request(
  p_share_id uuid,
  p_token_hash text,
  p_session_hash text,
  p_idempotency_key uuid,
  p_document_ids uuid[]
)
returns public.atsrs_recipient_share_access_requests
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  share_row public.atsrs_recipient_shares%rowtype;
  session_row public.atsrs_recipient_share_viewer_sessions%rowtype;
  result public.atsrs_recipient_share_access_requests%rowtype;
begin
  select * into share_row from public.atsrs_recipient_shares
   where id = p_share_id and token_hash = p_token_hash for update;
  if not found or share_row.status <> 'active'
     or share_row.expires_at <= now() or not share_row.allow_download
  then
    raise exception using errcode = '42501',
      message = 'ATSRS_RECIPIENT_DOWNLOAD_NOT_ALLOWED';
  end if;
  select * into session_row
    from public.atsrs_recipient_share_viewer_sessions
   where share_id = share_row.id and session_hash = p_session_hash
     and revoked_at is null and expires_at > now()
     and 'download' = any(scope)
   for update;
  if not found then
    raise exception using errcode = '42501',
      message = 'ATSRS_RECIPIENT_SESSION_INVALID';
  end if;
  if cardinality(p_document_ids) not between 1 and 50
     or exists (
       select 1 from unnest(p_document_ids) document_id
        where not exists (
          select 1 from public.atsrs_recipient_share_documents d
           where d.share_id = share_row.id and d.document_id = document_id
        )
     )
  then
    raise exception using errcode = '42501',
      message = 'ATSRS_RECIPIENT_DOCUMENT_SCOPE_MISMATCH';
  end if;
  insert into public.atsrs_recipient_share_access_requests (
    dedicated_share_id, owner_user_id, viewer_session_id,
    requested_document_ids, idempotency_key
  ) values (
    share_row.id, share_row.owner_user_id, session_row.id,
    p_document_ids, p_idempotency_key
  )
  on conflict (dedicated_share_id, idempotency_key) do update
    set updated_at = public.atsrs_recipient_share_access_requests.updated_at
  returning * into result;
  insert into public.atsrs_recipient_share_events (
    share_id, owner_user_id, request_id, event_type, reason_code
  ) values (
    share_row.id, share_row.owner_user_id, result.id,
    'download_requested', 'viewer_requested'
  ) on conflict do nothing;
  return result;
end
$function$;

create or replace function public.atsrs_decide_recipient_download_request(
  p_owner_user_id uuid,
  p_request_id uuid,
  p_decision text,
  p_operation_id uuid
)
returns public.atsrs_recipient_share_access_requests
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  result public.atsrs_recipient_share_access_requests%rowtype;
  share_row public.atsrs_recipient_shares%rowtype;
  session_expiry timestamptz;
begin
  if p_decision not in ('approve', 'decline') then
    raise exception using errcode = '22023',
      message = 'ATSRS_RECIPIENT_INVALID_DECISION';
  end if;
  select * into result
    from public.atsrs_recipient_share_access_requests
   where id = p_request_id and owner_user_id = p_owner_user_id
   for update;
  if not found then
    raise exception using errcode = '42501',
      message = 'ATSRS_RECIPIENT_REQUEST_NOT_FOUND';
  end if;
  if result.status <> 'pending' then return result; end if;
  select * into share_row from public.atsrs_recipient_shares
   where id = result.dedicated_share_id for update;
  select expires_at into session_expiry
    from public.atsrs_recipient_share_viewer_sessions
   where id = result.viewer_session_id and revoked_at is null;
  if share_row.status <> 'active' or share_row.expires_at <= now()
     or not share_row.allow_download or session_expiry <= now()
  then
    raise exception using errcode = '42501',
      message = 'ATSRS_RECIPIENT_DOWNLOAD_NOT_ALLOWED';
  end if;
  update public.atsrs_recipient_share_access_requests
     set status = case when p_decision = 'approve' then 'approved' else 'declined' end,
         access_expires_at = case when p_decision = 'approve'
           then least(share_row.expires_at, session_expiry, now() + interval '30 minutes')
           else null end,
         decided_at = now(), updated_at = now()
   where id = result.id returning * into result;
  insert into public.atsrs_recipient_share_events (
    share_id, owner_user_id, request_id, operation_id, event_type, reason_code
  ) values (
    share_row.id, p_owner_user_id, result.id, p_operation_id,
    case when p_decision = 'approve' then 'approved' else 'denied' end,
    'owner_decision'
  ) on conflict (operation_id) where operation_id is not null do nothing;
  return result;
end
$function$;

create or replace function public.atsrs_authorize_recipient_document(
  p_share_id uuid,
  p_token_hash text,
  p_session_hash text,
  p_document_id uuid,
  p_action text,
  p_request_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  share_row public.atsrs_recipient_shares%rowtype;
  session_row public.atsrs_recipient_share_viewer_sessions%rowtype;
  request_row public.atsrs_recipient_share_access_requests%rowtype;
  file_path text;
begin
  if p_action not in ('preview', 'download') then
    raise exception using errcode = '22023',
      message = 'ATSRS_RECIPIENT_INVALID_ACTION';
  end if;
  select * into share_row from public.atsrs_recipient_shares
   where id = p_share_id and token_hash = p_token_hash for update;
  if not found or share_row.status <> 'active' or share_row.expires_at <= now()
  then
    raise exception using errcode = '42501',
      message = 'ATSRS_RECIPIENT_SHARE_UNAVAILABLE';
  end if;
  select * into session_row
    from public.atsrs_recipient_share_viewer_sessions
   where share_id = share_row.id and session_hash = p_session_hash
     and revoked_at is null and expires_at > now()
     and p_action = any(scope)
   for update;
  if not found then
    raise exception using errcode = '42501',
      message = 'ATSRS_RECIPIENT_SESSION_INVALID';
  end if;
  select f.storage_path into file_path
    from public.atsrs_recipient_share_documents d
    join public.atsrs_files f on f.id = d.document_id
   where d.share_id = share_row.id and d.document_id = p_document_id
     and f.user_id = share_row.owner_user_id
     and f.account_type = share_row.account_type;
  if file_path is null then
    raise exception using errcode = '42501',
      message = 'ATSRS_RECIPIENT_DOCUMENT_UNAVAILABLE';
  end if;
  if p_action = 'preview' and not share_row.allow_preview then
    raise exception using errcode = '42501',
      message = 'ATSRS_RECIPIENT_PREVIEW_NOT_ALLOWED';
  end if;
  if p_action = 'download' then
    if not share_row.allow_download or p_request_id is null then
      raise exception using errcode = '42501',
        message = 'ATSRS_RECIPIENT_DOWNLOAD_NOT_ALLOWED';
    end if;
    select * into request_row
      from public.atsrs_recipient_share_access_requests
     where id = p_request_id
       and dedicated_share_id = share_row.id
       and viewer_session_id = session_row.id
     for update;
    if not found or request_row.status <> 'approved'
       or request_row.access_expires_at <= now()
       or not (p_document_id = any(request_row.requested_document_ids))
    then
      raise exception using errcode = '42501',
        message = 'ATSRS_RECIPIENT_DOWNLOAD_NOT_APPROVED';
    end if;
  end if;
  insert into public.atsrs_recipient_share_events (
    share_id, owner_user_id, request_id, document_id, event_type, reason_code
  ) values (
    share_row.id, share_row.owner_user_id, p_request_id, p_document_id,
    case when p_action = 'preview' then 'previewed' else 'downloaded' end,
    'viewer_authorized'
  );
  update public.atsrs_recipient_shares
     set last_activity_at = now()
   where id = share_row.id;
  update public.atsrs_recipient_share_viewer_sessions
     set last_seen_at = now()
   where id = session_row.id;
  return jsonb_build_object(
    'storage_path', file_path,
    'expires_at', least(share_row.expires_at, session_row.expires_at,
      coalesce(request_row.access_expires_at, share_row.expires_at))
  );
exception
  when unique_violation then
    raise exception using errcode = 'P0001',
      message = 'ATSRS_RECIPIENT_DOWNLOAD_ALREADY_USED';
end
$function$;

do $$
declare
  signature regprocedure;
begin
  foreach signature in array array[
    'public.atsrs_create_recipient_share(uuid,uuid,text,text,text,text,text,text,boolean,boolean,timestamptz,uuid[])'::regprocedure,
    'public.atsrs_update_recipient_share(uuid,uuid,bigint,uuid,text,text,text,text,text,text,boolean,boolean,timestamptz,uuid[])'::regprocedure,
    'public.atsrs_revoke_recipient_share(uuid,uuid,uuid)'::regprocedure,
    'public.atsrs_verify_recipient_share_otp(uuid,text,text,uuid,text,text)'::regprocedure,
    'public.atsrs_create_recipient_download_request(uuid,text,text,uuid,uuid[])'::regprocedure,
    'public.atsrs_decide_recipient_download_request(uuid,uuid,text,uuid)'::regprocedure,
    'public.atsrs_authorize_recipient_document(uuid,text,text,uuid,text,uuid)'::regprocedure
  ]
  loop
    execute format('revoke all on function %s from public, anon, authenticated', signature);
    execute format('grant execute on function %s to service_role', signature);
  end loop;
end
$$;

comment on table public.atsrs_recipient_shares is
  'Independent, OTP-gated recipient links. Does not replace General Share.';
comment on column public.atsrs_recipient_shares.recipient_email_hash is
  'Domain-separated server HMAC-SHA256 of the normalized recipient email.';
comment on column public.atsrs_recipient_shares.token_hash is
  'SHA-256 of the raw fragment token; the raw token is never persisted.';
