-- Finalize a QR document upload as one database transaction.
-- The Storage object is verified by the Edge Function before this RPC runs;
-- this function atomically creates its metadata row and completes the session.
create or replace function public.atsrs_finalize_document_qr_upload(
  p_session_id uuid,
  p_actual_size bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_session public.atsrs_document_upload_sessions%rowtype;
  v_file public.atsrs_files%rowtype;
  v_uploaded_at timestamptz := clock_timestamp();
begin
  select *
    into v_session
    from public.atsrs_document_upload_sessions
   where id = p_session_id
   for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'QR upload session was not found.';
  end if;

  -- A repeated finalize request returns the original result without creating a
  -- second metadata row or changing the completion timestamp.
  if v_session.status = 'uploaded' and v_session.file_id is not null then
    select *
      into v_file
      from public.atsrs_files
     where id = v_session.file_id
       and user_id = v_session.user_id
       and account_type = 'personal';

    if not found then
      raise exception using errcode = 'P0001', message = 'Completed QR upload metadata is inconsistent.';
    end if;

    return jsonb_build_object(
      'id', v_file.id,
      'file_name', v_file.file_name,
      'mime_type', v_file.mime_type,
      'size_bytes', v_file.size_bytes,
      'created_at', v_file.created_at,
      'metadata', v_file.metadata
    );
  end if;

  if v_session.status <> 'uploading'
     or v_session.storage_path is null
     or v_session.file_name is null
     or v_session.mime_type is null then
    raise exception using errcode = 'P0001', message = 'QR upload session is not ready to finalize.';
  end if;

  if v_session.expires_at <= v_uploaded_at then
    raise exception using errcode = 'P0001', message = 'QR upload session has expired.';
  end if;

  if p_actual_size is null or p_actual_size <= 0 or p_actual_size > 15728640 then
    raise exception using errcode = '22023', message = 'Uploaded file size is invalid.';
  end if;

  select *
    into v_file
    from public.atsrs_files
   where storage_path = v_session.storage_path
   for update;

  if found then
    if v_file.user_id <> v_session.user_id or v_file.account_type <> 'personal' then
      raise exception using errcode = 'P0001', message = 'QR upload object ownership is inconsistent.';
    end if;
  else
    insert into public.atsrs_files (
      user_id,
      account_type,
      category,
      file_name,
      mime_type,
      size_bytes,
      storage_path,
      metadata
    ) values (
      v_session.user_id,
      'personal',
      'document',
      v_session.file_name,
      v_session.mime_type,
      p_actual_size,
      v_session.storage_path,
      jsonb_build_object(
        'upload_source', 'qr',
        'qr_session_id', v_session.id,
        'document_registered', false
      )
    )
    returning * into v_file;
  end if;

  update public.atsrs_document_upload_sessions
     set status = 'uploaded',
         file_id = v_file.id,
         size_bytes = p_actual_size,
         uploaded_at = v_uploaded_at,
         updated_at = v_uploaded_at
   where id = v_session.id;

  return jsonb_build_object(
    'id', v_file.id,
    'file_name', v_file.file_name,
    'mime_type', v_file.mime_type,
    'size_bytes', v_file.size_bytes,
    'created_at', v_file.created_at,
    'metadata', v_file.metadata
  );
end;
$function$;

comment on function public.atsrs_finalize_document_qr_upload(uuid, bigint) is
  'Service-only, idempotent QR upload finalization. Locks one session and atomically creates file metadata plus the uploaded session state.';

revoke all on function public.atsrs_finalize_document_qr_upload(uuid, bigint) from public, anon, authenticated;
grant execute on function public.atsrs_finalize_document_qr_upload(uuid, bigint) to service_role;
