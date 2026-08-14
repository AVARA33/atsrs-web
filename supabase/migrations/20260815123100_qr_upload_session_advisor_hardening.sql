create index if not exists atsrs_document_upload_sessions_file_idx
  on public.atsrs_document_upload_sessions (file_id)
  where file_id is not null;

create policy "Service role manages QR upload sessions"
  on public.atsrs_document_upload_sessions
  for all
  to service_role
  using (true)
  with check (true);

