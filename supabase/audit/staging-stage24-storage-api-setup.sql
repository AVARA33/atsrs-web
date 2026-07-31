-- STAGING ONLY. Installed immediately before the synthetic Storage API test.
begin;

do $preflight$
begin
  if not exists (
    select 1 from storage.buckets where id = 'atsrs-stage24-synthetic'
  ) then
    raise exception 'Stage 24 synthetic bucket is missing';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'stage24 synthetic api%'
  ) then
    raise exception 'Stage 24 synthetic policies already exist';
  end if;
end;
$preflight$;

create policy "stage24 synthetic api select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'atsrs-stage24-synthetic'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "stage24 synthetic api insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'atsrs-stage24-synthetic'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "stage24 synthetic api update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'atsrs-stage24-synthetic'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'atsrs-stage24-synthetic'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "stage24 synthetic api delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'atsrs-stage24-synthetic'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

commit;
