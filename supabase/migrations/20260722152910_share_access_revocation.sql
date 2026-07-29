alter table public.atsrs_share_access_requests
  add column if not exists revoked_file_ids uuid[] not null default '{}';

comment on column public.atsrs_share_access_requests.revoked_file_ids is
  'Requested documents whose previously approved download access was withdrawn by the profile owner.';

alter table public.atsrs_share_access_requests
  drop constraint if exists atsrs_share_access_requests_revoked_file_ids_check;

alter table public.atsrs_share_access_requests
  add constraint atsrs_share_access_requests_revoked_file_ids_check
  check (cardinality(revoked_file_ids) between 0 and 50);

alter table public.atsrs_share_events
  drop constraint if exists atsrs_share_events_event_type_check;

alter table public.atsrs_share_events
  add constraint atsrs_share_events_event_type_check check (event_type in (
    'link_opened',
    'document_previewed',
    'otp_sent',
    'otp_verified',
    'download_requested',
    'request_approved',
    'request_declined',
    'access_revoked',
    'document_access_revoked',
    'document_downloaded'
  ));;
