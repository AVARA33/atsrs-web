-- Rollback for 20260815123000_personal_document_qr_upload_sessions.sql.
-- Remove the document-qr-upload Edge Function before applying this rollback.
drop table if exists public.atsrs_document_upload_sessions;

