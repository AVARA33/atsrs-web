-- ATSRS server-side data and private file storage.
-- This script is idempotent and may be run again in Supabase SQL Editor.

begin;

create table if not exists public.atsrs_workspaces (
  user_id uuid not null references auth.users(id) on delete cascade,
  account_type text not null check (account_type in ('personal', 'company')),
  created_at timestamptz not null default now(),
  primary key (user_id, account_type)
);

create table if not exists public.atsrs_workspace_data (
  user_id uuid not null,
  account_type text not null check (account_type in ('personal', 'company')),
  data_key text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, account_type, data_key),
  constraint atsrs_workspace_data_workspace_fk
    foreign key (user_id, account_type)
    references public.atsrs_workspaces(user_id, account_type)
    on delete cascade
);

create table if not exists public.atsrs_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  account_type text not null check (account_type in ('personal', 'company')),
  category text not null,
  file_name text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  storage_path text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint atsrs_files_workspace_fk
    foreign key (user_id, account_type)
    references public.atsrs_workspaces(user_id, account_type)
    on delete cascade
);

create index if not exists atsrs_workspace_data_owner_idx
  on public.atsrs_workspace_data(user_id, account_type);

create index if not exists atsrs_files_owner_category_idx
  on public.atsrs_files(user_id, account_type, category);

insert into storage.buckets (id, name, public, file_size_limit)
values ('atsrs-user-files', 'atsrs-user-files', false, 52428800)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

alter table public.atsrs_workspaces enable row level security;
alter table public.atsrs_workspace_data enable row level security;
alter table public.atsrs_files enable row level security;

drop policy if exists "Users can view their own ATSRS workspaces"
  on public.atsrs_workspaces;
create policy "Users can view their own ATSRS workspaces"
  on public.atsrs_workspaces
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own ATSRS workspaces"
  on public.atsrs_workspaces;
create policy "Users can create their own ATSRS workspaces"
  on public.atsrs_workspaces
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own ATSRS data"
  on public.atsrs_workspace_data;
create policy "Users can view their own ATSRS data"
  on public.atsrs_workspace_data
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own ATSRS data"
  on public.atsrs_workspace_data;
create policy "Users can create their own ATSRS data"
  on public.atsrs_workspace_data
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own ATSRS data"
  on public.atsrs_workspace_data;
create policy "Users can update their own ATSRS data"
  on public.atsrs_workspace_data
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own ATSRS data"
  on public.atsrs_workspace_data;
create policy "Users can delete their own ATSRS data"
  on public.atsrs_workspace_data
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own ATSRS files"
  on public.atsrs_files;
create policy "Users can view their own ATSRS files"
  on public.atsrs_files
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own ATSRS files"
  on public.atsrs_files;
create policy "Users can create their own ATSRS files"
  on public.atsrs_files
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own ATSRS files"
  on public.atsrs_files;
create policy "Users can update their own ATSRS files"
  on public.atsrs_files
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own ATSRS files"
  on public.atsrs_files;
create policy "Users can delete their own ATSRS files"
  on public.atsrs_files
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own ATSRS storage objects"
  on storage.objects;
create policy "Users can view their own ATSRS storage objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'atsrs-user-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can upload their own ATSRS storage objects"
  on storage.objects;
create policy "Users can upload their own ATSRS storage objects"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'atsrs-user-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can update their own ATSRS storage objects"
  on storage.objects;
create policy "Users can update their own ATSRS storage objects"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'atsrs-user-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'atsrs-user-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can delete their own ATSRS storage objects"
  on storage.objects;
create policy "Users can delete their own ATSRS storage objects"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'atsrs-user-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

revoke all on table public.atsrs_workspaces from anon;
revoke all on table public.atsrs_workspace_data from anon;
revoke all on table public.atsrs_files from anon;

grant select, insert on table public.atsrs_workspaces to authenticated;
grant select, insert, update, delete on table public.atsrs_workspace_data to authenticated;
grant select, insert, update, delete on table public.atsrs_files to authenticated;

commit;

-- Expected result: one row with all four values true.
select
  to_regclass('public.atsrs_workspaces') is not null as workspaces_ready,
  to_regclass('public.atsrs_workspace_data') is not null as data_ready,
  to_regclass('public.atsrs_files') is not null as files_ready,
  exists(
    select 1 from storage.buckets where id = 'atsrs-user-files'
  ) as storage_ready;
