create or replace function public.atsrs_storage_reconciliation_report()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with user_storage as (
    select
      count(*)::bigint as object_count,
      coalesce(sum(
        case
          when (o.metadata ->> 'size') ~ '^[0-9]+$'
            then (o.metadata ->> 'size')::bigint
          else 0
        end
      ), 0)::bigint as total_bytes
    from storage.objects o
    where o.bucket_id = 'atsrs-user-files'
  ),
  file_rows as (
    select
      count(*)::bigint as row_count,
      coalesce(sum(f.size_bytes), 0)::bigint as total_bytes
    from public.atsrs_files f
  ),
  missing_storage as (
    select count(*)::bigint as row_count
    from public.atsrs_files f
    left join storage.objects o
      on o.bucket_id = 'atsrs-user-files'
     and o.name = f.storage_path
    where o.id is null
  ),
  untracked_storage as (
    select
      count(*)::bigint as object_count,
      count(*) filter (
        where o.created_at < now() - interval '24 hours'
      )::bigint as older_than_24_hours,
      count(*) filter (
        where q.id is not null
      )::bigint as linked_to_qr_session
    from storage.objects o
    left join public.atsrs_files f
      on f.storage_path = o.name
    left join public.atsrs_document_upload_sessions q
      on q.storage_path = o.name
    where o.bucket_id = 'atsrs-user-files'
      and f.id is null
  ),
  ownership_mismatches as (
    select count(*)::bigint as row_count
    from public.atsrs_files f
    where split_part(f.storage_path, '/', 1) <> f.user_id::text
  ),
  size_mismatches as (
    select count(*)::bigint as row_count
    from public.atsrs_files f
    join storage.objects o
      on o.bucket_id = 'atsrs-user-files'
     and o.name = f.storage_path
    where (o.metadata ->> 'size') ~ '^[0-9]+$'
      and (o.metadata ->> 'size')::bigint <> f.size_bytes
  ),
  profile_storage as (
    select
      count(*)::bigint as object_count,
      count(*) filter (where u.id is null)::bigint as objects_without_user
    from storage.objects o
    left join auth.users u
      on u.id::text = split_part(o.name, '/', 1)
    where o.bucket_id = 'atsrs-profile-photos'
  ),
  qr_statuses as (
    select q.status, count(*)::bigint as session_count
    from public.atsrs_document_upload_sessions q
    group by q.status
  )
  select jsonb_build_object(
    'generated_at', now(),
    'status', case
      when (select row_count from missing_storage) > 0
        or (select row_count from ownership_mismatches) > 0
        or (select row_count from size_mismatches) > 0
        or (select objects_without_user from profile_storage) > 0
        or (select older_than_24_hours from untracked_storage) > 0
      then 'attention'
      else 'healthy'
    end,
    'user_files', jsonb_build_object(
      'storage_objects', (select object_count from user_storage),
      'storage_bytes', (select total_bytes from user_storage),
      'metadata_rows', (select row_count from file_rows),
      'metadata_bytes', (select total_bytes from file_rows),
      'metadata_without_storage', (select row_count from missing_storage),
      'storage_without_metadata', (select object_count from untracked_storage),
      'storage_without_metadata_older_than_24_hours',
        (select older_than_24_hours from untracked_storage),
      'storage_without_metadata_linked_to_qr_session',
        (select linked_to_qr_session from untracked_storage),
      'owner_path_mismatches', (select row_count from ownership_mismatches),
      'size_mismatches', (select row_count from size_mismatches)
    ),
    'profile_photos', jsonb_build_object(
      'storage_objects', (select object_count from profile_storage),
      'objects_without_user', (select objects_without_user from profile_storage)
    ),
    'qr_sessions', coalesce(
      (select jsonb_object_agg(status, session_count) from qr_statuses),
      '{}'::jsonb
    )
  );
$$;

comment on function public.atsrs_storage_reconciliation_report() is
  'Aggregate-only, read-only comparison of ATSRS SQL file metadata and Supabase Storage. It never deletes or exposes object paths.';

revoke all on function public.atsrs_storage_reconciliation_report() from public;
revoke all on function public.atsrs_storage_reconciliation_report() from anon;
revoke all on function public.atsrs_storage_reconciliation_report() from authenticated;
grant execute on function public.atsrs_storage_reconciliation_report() to service_role;
