-- ATSRS V241
-- Securely invokes the email outbox Edge Function every five minutes.
--
-- A dedicated random cron token is generated inside Postgres, encrypted in
-- Vault, and stored only as a hash for request verification.

create extension if not exists pg_net with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists private.atsrs_worker_secrets (
  name text primary key,
  token_hash bytea not null,
  updated_at timestamptz not null default now()
);

revoke all on table private.atsrs_worker_secrets
  from public, anon, authenticated;

grant select, update on table public.atsrs_notification_outbox
  to service_role;
grant select on table public.atsrs_notifications
  to service_role;

do $block$
declare
  cron_token text := encode(extensions.gen_random_bytes(32), 'hex');
  existing_secret_id uuid;
begin
  if not exists (
    select 1
    from vault.secrets
    where name = 'atsrs_project_url'
  ) then
    perform vault.create_secret(
      'https://hwtjuqyxzivymofamwxl.supabase.co',
      'atsrs_project_url',
      'ATSRS production project URL for scheduled Edge Function calls'
    );
  end if;

  select id
    into existing_secret_id
  from vault.secrets
  where name = 'atsrs_email_cron_key';

  if existing_secret_id is null then
    perform vault.create_secret(
      cron_token,
      'atsrs_email_cron_key',
      'ATSRS production email worker cron authentication'
    );
  else
    perform vault.update_secret(
      existing_secret_id,
      cron_token,
      'atsrs_email_cron_key',
      'ATSRS production email worker cron authentication'
    );
  end if;

  insert into private.atsrs_worker_secrets (name, token_hash, updated_at)
  values (
    'email_outbox',
    extensions.digest(cron_token, 'sha256'),
    now()
  )
  on conflict (name) do update
    set token_hash = excluded.token_hash,
        updated_at = excluded.updated_at;
end;
$block$;

create or replace function public.atsrs_verify_email_worker_token(p_token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from private.atsrs_worker_secrets
    where name = 'email_outbox'
      and token_hash = extensions.digest(p_token, 'sha256')
  );
$function$;

revoke all on function public.atsrs_verify_email_worker_token(text)
  from public, anon, authenticated;
grant execute on function public.atsrs_verify_email_worker_token(text)
  to service_role;

create or replace function private.atsrs_invoke_email_outbox()
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  project_url text;
  cron_token text;
  request_id bigint;
begin
  select decrypted_secret
    into project_url
  from vault.decrypted_secrets
  where name = 'atsrs_project_url';

  select decrypted_secret
    into cron_token
  from vault.decrypted_secrets
  where name = 'atsrs_email_cron_key';

  if nullif(project_url, '') is null then
    raise exception 'Vault secret atsrs_project_url is missing';
  end if;

  if nullif(cron_token, '') is null then
    raise exception 'Vault secret atsrs_email_cron_key is missing';
  end if;

  select net.http_post(
    url := project_url || '/functions/v1/process-email-outbox',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-atsrs-cron-token', cron_token
    ),
    body := jsonb_build_object(
      'source', 'pg_cron',
      'invoked_at', now()
    ),
    timeout_milliseconds := 15000
  )
  into request_id;

  return request_id;
end;
$function$;

revoke all on function private.atsrs_invoke_email_outbox()
  from public, anon, authenticated;

select cron.schedule(
  'atsrs-process-email-outbox',
  '*/5 * * * *',
  $cron$select private.atsrs_invoke_email_outbox();$cron$
);
