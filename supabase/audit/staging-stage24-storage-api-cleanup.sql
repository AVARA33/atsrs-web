-- STAGING ONLY. Removes only Stage 24 synthetic policies.
begin;

drop policy if exists "stage24 synthetic api select" on storage.objects;
drop policy if exists "stage24 synthetic api insert" on storage.objects;
drop policy if exists "stage24 synthetic api update" on storage.objects;
drop policy if exists "stage24 synthetic api delete" on storage.objects;

commit;
