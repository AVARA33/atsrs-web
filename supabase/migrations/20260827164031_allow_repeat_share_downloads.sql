drop index if exists public.atsrs_share_events_one_download_per_request_file_idx;

update public.atsrs_share_access_requests as request
set access_expires_at = share.expires_at,
    updated_at = now()
from public.atsrs_profile_shares as share
where request.share_id = share.id
  and request.status = 'approved'
  and share.enabled is true
  and share.expires_at > now()
  and request.access_expires_at is distinct from share.expires_at;

comment on table public.atsrs_share_events is
  'Audit log for ATSRS share activity. Approved files may be downloaded repeatedly until the share or owner approval expires.';
