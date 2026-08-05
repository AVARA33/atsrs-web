create index if not exists atsrs_recipient_share_requests_session_fk_idx
  on public.atsrs_recipient_share_access_requests (viewer_session_id);

create index if not exists atsrs_recipient_share_events_document_fk_idx
  on public.atsrs_recipient_share_events (document_id)
  where document_id is not null;
