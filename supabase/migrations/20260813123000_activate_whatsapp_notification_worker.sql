create schema if not exists private;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists private.atsrs_worker_secrets (
  name text primary key,
  token_hash bytea not null,
  updated_at timestamptz not null default now()
);
alter table private.atsrs_worker_secrets enable row level security;
revoke all on table private.atsrs_worker_secrets from public, anon, authenticated;
grant all on table private.atsrs_worker_secrets to service_role;

do $block$
declare
  cron_token text := encode(extensions.gen_random_bytes(32), 'hex');
  existing_secret_id uuid;
begin
  select id into existing_secret_id from vault.secrets where name = 'atsrs_whatsapp_cron_key';
  if existing_secret_id is null then
    perform vault.create_secret(cron_token, 'atsrs_whatsapp_cron_key', 'ATSRS WhatsApp worker cron authentication');
  else
    perform vault.update_secret(existing_secret_id, cron_token, 'atsrs_whatsapp_cron_key', 'ATSRS WhatsApp worker cron authentication');
  end if;
  insert into private.atsrs_worker_secrets (name, token_hash, updated_at)
  values ('whatsapp_outbox', extensions.digest(cron_token, 'sha256'), now())
  on conflict (name) do update set token_hash = excluded.token_hash, updated_at = excluded.updated_at;
end;
$block$;

create or replace function public.atsrs_verify_whatsapp_worker_token(p_token text)
returns boolean language sql stable security definer set search_path = '' as $function$
  select exists (
    select 1 from private.atsrs_worker_secrets
    where name = 'whatsapp_outbox' and token_hash = extensions.digest(p_token, 'sha256')
  );
$function$;

revoke all on function public.atsrs_verify_whatsapp_worker_token(text) from public, anon, authenticated;
grant execute on function public.atsrs_verify_whatsapp_worker_token(text) to service_role;

create or replace function private.atsrs_invoke_whatsapp_outbox()
returns bigint language plpgsql security definer set search_path = '' as $function$
declare project_url text; cron_token text; request_id bigint;
begin
  select decrypted_secret into project_url from vault.decrypted_secrets where name = 'atsrs_project_url';
  select decrypted_secret into cron_token from vault.decrypted_secrets where name = 'atsrs_whatsapp_cron_key';
  if nullif(project_url, '') is null then raise exception 'Vault secret atsrs_project_url is missing'; end if;
  if nullif(cron_token, '') is null then raise exception 'Vault secret atsrs_whatsapp_cron_key is missing'; end if;
  select net.http_post(
    url := project_url || '/functions/v1/process-whatsapp-outbox',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-atsrs-cron-token', cron_token),
    body := jsonb_build_object('source', 'pg_cron', 'invoked_at', now()), timeout_milliseconds := 15000
  ) into request_id;
  return request_id;
end;
$function$;

revoke all on function private.atsrs_invoke_whatsapp_outbox() from public, anon, authenticated;

do $block$
declare job record;
begin
  for job in select jobid from cron.job where jobname = 'atsrs-process-whatsapp-outbox' loop
    perform cron.unschedule(job.jobid);
  end loop;
end;
$block$;

select cron.schedule(
  'atsrs-process-whatsapp-outbox', '*/5 * * * *',
  $cron$select private.atsrs_invoke_whatsapp_outbox();$cron$
);
