create schema if not exists private;

create extension if not exists pg_cron with schema pg_catalog;

create table if not exists public.atsrs_notification_preferences (
  user_id uuid not null,
  account_type text not null check (account_type in ('personal','company')),
  email_enabled boolean not null default true,
  whatsapp_enabled boolean not null default false,
  whatsapp_phone_e164 text,
  timezone text not null default 'Asia/Baku',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, account_type),
  constraint atsrs_notification_preferences_workspace_fkey
    foreign key (user_id, account_type)
    references public.atsrs_workspaces (user_id, account_type)
    on delete cascade,
  constraint atsrs_notification_preferences_phone_check
    check (whatsapp_phone_e164 is null or whatsapp_phone_e164 ~ '^\+[1-9][0-9]{7,14}$')
);

create table if not exists public.atsrs_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  account_type text not null check (account_type in ('personal','company')),
  document_fingerprint text not null,
  document_type text not null default 'Document',
  expiry_date date not null,
  threshold_days smallint not null check (threshold_days in (90,30,7,0)),
  days_remaining integer not null,
  severity text not null check (severity in ('notice','warning','urgent','expired')),
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint atsrs_notifications_workspace_fkey
    foreign key (user_id, account_type)
    references public.atsrs_workspaces (user_id, account_type)
    on delete cascade,
  constraint atsrs_notifications_once_per_stage
    unique (user_id, account_type, document_fingerprint, expiry_date, threshold_days)
);

create table if not exists public.atsrs_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.atsrs_notifications(id) on delete cascade,
  user_id uuid not null,
  account_type text not null check (account_type in ('personal','company')),
  channel text not null check (channel in ('email','whatsapp')),
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','skipped')),
  available_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint atsrs_notification_outbox_once_per_channel unique (notification_id, channel)
);

create index if not exists atsrs_notifications_user_created_idx
  on public.atsrs_notifications (user_id, account_type, created_at desc);
create index if not exists atsrs_notifications_unread_idx
  on public.atsrs_notifications (user_id, account_type, created_at desc)
  where read_at is null;
create index if not exists atsrs_notification_outbox_pending_idx
  on public.atsrs_notification_outbox (channel, available_at, created_at)
  where status in ('pending','failed');

alter table public.atsrs_notification_preferences enable row level security;
alter table public.atsrs_notifications enable row level security;
alter table public.atsrs_notification_outbox enable row level security;

revoke all on public.atsrs_notification_preferences from anon;
revoke all on public.atsrs_notifications from anon;
revoke all on public.atsrs_notification_outbox from anon, authenticated;

grant select, insert, update on public.atsrs_notification_preferences to authenticated;
grant select on public.atsrs_notifications to authenticated;
grant update (read_at) on public.atsrs_notifications to authenticated;

create policy "Users can read their own ATSRS notification preferences"
  on public.atsrs_notification_preferences for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create their own ATSRS notification preferences"
  on public.atsrs_notification_preferences for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their own ATSRS notification preferences"
  on public.atsrs_notification_preferences for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can read their own ATSRS notifications"
  on public.atsrs_notifications for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can mark their own ATSRS notifications as read"
  on public.atsrs_notifications for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function private.atsrs_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger atsrs_notification_preferences_touch_updated_at
before update on public.atsrs_notification_preferences
for each row execute function private.atsrs_touch_updated_at();

create trigger atsrs_notification_outbox_touch_updated_at
before update on public.atsrs_notification_outbox
for each row execute function private.atsrs_touch_updated_at();

create or replace function private.atsrs_create_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.atsrs_notification_preferences (user_id, account_type)
  values (new.user_id, new.account_type)
  on conflict (user_id, account_type) do nothing;
  return new;
end;
$$;

create trigger atsrs_workspace_create_notification_preferences
after insert on public.atsrs_workspaces
for each row execute function private.atsrs_create_notification_preferences();

insert into public.atsrs_notification_preferences (user_id, account_type)
select user_id, account_type from public.atsrs_workspaces
on conflict (user_id, account_type) do nothing;

create or replace function private.atsrs_queue_due_notifications(p_as_of date default ((now() at time zone 'Asia/Baku')::date))
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_notifications integer := 0;
  inserted_email_jobs integer := 0;
  inserted_whatsapp_jobs integer := 0;
begin
  with cert_sources as (
    select
      wd.user_id,
      wd.account_type,
      case
        when jsonb_typeof((wd.payload->>'value')::jsonb) = 'array' then (wd.payload->>'value')::jsonb
        else '[]'::jsonb
      end as certs
    from public.atsrs_workspace_data wd
    where wd.data_key like '%\_certs' escape '\'
      and wd.payload ? 'value'
      and jsonb_typeof(wd.payload->'value') = 'string'
  ), documents as (
    select
      src.user_id,
      src.account_type,
      item,
      case
        when coalesce(item->>'cloudFileId','') <> '' then item->>'cloudFileId'
        when coalesce(item->>'docNo','') <> '' then md5(concat_ws('|', item->>'docNo', item->>'type', item->>'provider', item->>'person'))
        else md5((item - 'expiry')::text)
      end as document_fingerprint,
      coalesce(nullif(item->>'type',''), 'Document') as document_type,
      (item->>'expiry')::date as expiry_date
    from cert_sources src
    cross join lateral jsonb_array_elements(src.certs) as item
    where coalesce(item->>'expiry','') ~ '^\d{4}-\d{2}-\d{2}$'
  ), due as (
    select
      d.*,
      (d.expiry_date - p_as_of) as days_remaining,
      case
        when d.expiry_date - p_as_of <= 0 then 0
        when d.expiry_date - p_as_of <= 7 then 7
        when d.expiry_date - p_as_of <= 30 then 30
        when d.expiry_date - p_as_of <= 90 then 90
      end::smallint as threshold_days
    from documents d
    where d.expiry_date - p_as_of <= 90
  ), inserted as (
    insert into public.atsrs_notifications (
      user_id, account_type, document_fingerprint, document_type,
      expiry_date, threshold_days, days_remaining, severity, title, body
    )
    select
      due.user_id,
      due.account_type,
      due.document_fingerprint,
      due.document_type,
      due.expiry_date,
      due.threshold_days,
      due.days_remaining,
      case due.threshold_days when 90 then 'notice' when 30 then 'warning' when 7 then 'urgent' else 'expired' end,
      case
        when due.threshold_days = 0 then due.document_type || ' has expired'
        else due.document_type || ' expires within ' || due.threshold_days || ' days'
      end,
      case
        when due.days_remaining < 0 then due.document_type || ' expired on ' || to_char(due.expiry_date, 'DD Mon YYYY') || '.'
        when due.days_remaining = 0 then due.document_type || ' expires today.'
        else due.document_type || ' expires on ' || to_char(due.expiry_date, 'DD Mon YYYY') || ' (' || due.days_remaining || ' days remaining).'
      end
    from due
    where due.threshold_days is not null
    on conflict (user_id, account_type, document_fingerprint, expiry_date, threshold_days) do nothing
    returning id, user_id, account_type, threshold_days
  )
  select count(*) into inserted_notifications from inserted;

  insert into public.atsrs_notification_outbox (notification_id, user_id, account_type, channel)
  select n.id, n.user_id, n.account_type, 'email'
  from public.atsrs_notifications n
  join public.atsrs_notification_preferences p
    on p.user_id=n.user_id and p.account_type=n.account_type
  where p.email_enabled
    and n.created_at >= now() - interval '5 minutes'
  on conflict (notification_id, channel) do nothing;
  get diagnostics inserted_email_jobs = row_count;

  insert into public.atsrs_notification_outbox (notification_id, user_id, account_type, channel)
  select n.id, n.user_id, n.account_type, 'whatsapp'
  from public.atsrs_notifications n
  join public.atsrs_notification_preferences p
    on p.user_id=n.user_id and p.account_type=n.account_type
  where p.whatsapp_enabled
    and p.whatsapp_phone_e164 is not null
    and n.threshold_days in (30,7,0)
    and n.created_at >= now() - interval '5 minutes'
  on conflict (notification_id, channel) do nothing;
  get diagnostics inserted_whatsapp_jobs = row_count;

  return jsonb_build_object(
    'as_of', p_as_of,
    'notifications_created', inserted_notifications,
    'email_jobs_created', inserted_email_jobs,
    'whatsapp_jobs_created', inserted_whatsapp_jobs
  );
end;
$$;

revoke all on function private.atsrs_touch_updated_at() from public, anon, authenticated;
revoke all on function private.atsrs_create_notification_preferences() from public, anon, authenticated;
revoke all on function private.atsrs_queue_due_notifications(date) from public, anon, authenticated;

select cron.unschedule(jobid)
from cron.job
where jobname = 'atsrs-daily-expiry-notifications';

select cron.schedule(
  'atsrs-daily-expiry-notifications',
  '5 2 * * *',
  $cron$select private.atsrs_queue_due_notifications((now() at time zone 'Asia/Baku')::date);$cron$
);;
