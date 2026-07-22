create table if not exists public.atsrs_talent_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  sender_email text not null,
  sender_company text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint atsrs_talent_messages_email_present
    check (char_length(btrim(sender_email)) between 5 and 254),
  constraint atsrs_talent_messages_company_present
    check (char_length(btrim(sender_company)) between 2 and 140),
  constraint atsrs_talent_messages_body_present
    check (char_length(btrim(body)) between 10 and 1200)
);

create index if not exists atsrs_talent_messages_recipient_idx
  on public.atsrs_talent_messages (recipient_id, created_at desc);
create index if not exists atsrs_talent_messages_sender_rate_idx
  on public.atsrs_talent_messages (sender_id, created_at desc);

alter table public.atsrs_talent_messages enable row level security;

revoke all on table public.atsrs_talent_messages from public, anon, authenticated;
grant all on table public.atsrs_talent_messages to service_role;

comment on table public.atsrs_talent_messages is
  'Private company-to-professional messages handled only by the authenticated ATSRS Edge Function.';

