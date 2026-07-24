alter table public.atsrs_talent_messages
  add column if not exists archived_at timestamptz;

create index if not exists atsrs_talent_messages_recipient_archive_idx
  on public.atsrs_talent_messages (recipient_id, archived_at, created_at desc);

comment on column public.atsrs_talent_messages.archived_at is
  'Recipient-controlled archive timestamp. Null messages remain in the active inbox.';
