-- A recruiter may consume each approved document download only once per request.
-- The audit row is also the durable server-side source of truth for the public UI.
create unique index if not exists atsrs_share_events_one_download_per_request_file_idx
  on public.atsrs_share_events (request_id, file_id)
  where event_type = 'document_downloaded'
    and request_id is not null
    and file_id is not null;

comment on index public.atsrs_share_events_one_download_per_request_file_idx is
  'Prevents an approved ATSRS document from being downloaded more than once per recruiter request.';
