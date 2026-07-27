create table if not exists public.whatsapp_webhook_events (
  id bigint generated always as identity primary key,
  dedupe_key text not null unique,
  event_kind text not null,
  phone_number_id text,
  message_id text,
  wa_id text,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  constraint whatsapp_webhook_events_event_kind_not_blank
    check (length(btrim(event_kind)) > 0),
  constraint whatsapp_webhook_events_dedupe_key_format
    check (dedupe_key ~ '^[0-9a-f]{64}$')
);

create index if not exists whatsapp_webhook_events_phone_received_idx
  on public.whatsapp_webhook_events (phone_number_id, received_at desc);

create index if not exists whatsapp_webhook_events_unprocessed_idx
  on public.whatsapp_webhook_events (received_at)
  where processed_at is null;

alter table public.whatsapp_webhook_events enable row level security;

revoke all on table public.whatsapp_webhook_events from anon, authenticated;
revoke all on sequence public.whatsapp_webhook_events_id_seq from anon, authenticated;

comment on table public.whatsapp_webhook_events is
  'Verified raw WhatsApp Cloud API webhook deliveries for server-side processing.';
