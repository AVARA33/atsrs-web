alter table public.atsrs_notifications
  drop constraint if exists atsrs_notifications_threshold_days_check;

alter table public.atsrs_notifications
  add constraint atsrs_notifications_threshold_days_check
  check (threshold_days = any (array[90, 30, 0]));

create or replace function private.atsrs_queue_due_notifications(
  p_as_of date default ((now() at time zone 'Asia/Baku')::date)
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
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
        when jsonb_typeof((wd.payload->>'value')::jsonb) = 'array'
          then (wd.payload->>'value')::jsonb
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
        when coalesce(item->>'cloudFileId', '') <> '' then item->>'cloudFileId'
        when coalesce(item->>'docNo', '') <> '' then md5(concat_ws('|', item->>'docNo', item->>'type', item->>'provider', item->>'person'))
        else md5((item - 'expiry')::text)
      end as document_fingerprint,
      coalesce(nullif(item->>'type', ''), 'Document') as document_type,
      (item->>'expiry')::date as expiry_date
    from cert_sources src
    cross join lateral jsonb_array_elements(src.certs) as item
    where coalesce(item->>'expiry', '') ~ '^\d{4}-\d{2}-\d{2}$'
  ), due as (
    select
      d.*,
      (d.expiry_date - p_as_of) as days_remaining,
      case
        when d.expiry_date - p_as_of <= 0 then 0
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
      case due.threshold_days when 90 then 'notice' when 30 then 'warning' else 'expired' end,
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
    returning id
  )
  select count(*) into inserted_notifications from inserted;

  insert into public.atsrs_notification_outbox (notification_id, user_id, account_type, channel)
  select n.id, n.user_id, n.account_type, 'email'
  from public.atsrs_notifications n
  join public.atsrs_notification_preferences p
    on p.user_id = n.user_id and p.account_type = n.account_type
  where p.email_enabled
    and n.threshold_days in (90, 30, 0)
    and n.created_at >= now() - interval '5 minutes'
  on conflict (notification_id, channel) do nothing;
  get diagnostics inserted_email_jobs = row_count;

  insert into public.atsrs_notification_outbox (notification_id, user_id, account_type, channel)
  select n.id, n.user_id, n.account_type, 'whatsapp'
  from public.atsrs_notifications n
  join public.atsrs_notification_preferences p
    on p.user_id = n.user_id and p.account_type = n.account_type
  where p.whatsapp_enabled
    and p.whatsapp_phone_e164 is not null
    and n.threshold_days in (90, 30, 0)
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
$function$;

revoke all on function private.atsrs_queue_due_notifications(date) from public, anon, authenticated;;
