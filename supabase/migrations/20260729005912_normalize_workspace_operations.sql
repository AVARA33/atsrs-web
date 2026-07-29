-- Supabase migration history version: 20260729005912
begin;

create table public.atsrs_workspace_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_user_id uuid not null,
  workspace_account_type text not null,
  project_name text not null,
  vessel_name text,
  client_name text,
  team_name text,
  legacy_source_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint atsrs_workspace_projects_workspace_fkey
    foreign key (workspace_user_id, workspace_account_type)
    references public.atsrs_workspaces (user_id, account_type)
    on delete cascade,
  constraint atsrs_workspace_projects_account_type_check
    check (workspace_account_type in ('personal', 'company')),
  constraint atsrs_workspace_projects_name_check
    check (length(btrim(project_name)) > 0),
  constraint atsrs_workspace_projects_metadata_check
    check (jsonb_typeof(metadata) = 'object'),
  constraint atsrs_workspace_projects_workspace_id_key
    unique (workspace_user_id, workspace_account_type, id),
  constraint atsrs_workspace_projects_legacy_key
    unique (workspace_user_id, workspace_account_type, legacy_source_key)
);

create table public.atsrs_workspace_personnel (
  id uuid primary key default gen_random_uuid(),
  workspace_user_id uuid not null,
  workspace_account_type text not null,
  linked_user_id uuid,
  first_name text not null,
  last_name text,
  position text,
  company_name text,
  email text,
  phone text,
  whatsapp text,
  nationality text,
  employee_id text,
  source text,
  access_status text,
  linked_status text,
  tracker_status text,
  phone_verified boolean not null default false,
  whatsapp_verified boolean not null default false,
  legacy_source_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint atsrs_workspace_personnel_workspace_fkey
    foreign key (workspace_user_id, workspace_account_type)
    references public.atsrs_workspaces (user_id, account_type)
    on delete cascade,
  constraint atsrs_workspace_personnel_linked_user_fkey
    foreign key (linked_user_id)
    references auth.users (id)
    on delete set null,
  constraint atsrs_workspace_personnel_account_type_check
    check (workspace_account_type in ('personal', 'company')),
  constraint atsrs_workspace_personnel_name_check
    check (length(btrim(first_name)) > 0),
  constraint atsrs_workspace_personnel_metadata_check
    check (jsonb_typeof(metadata) = 'object'),
  constraint atsrs_workspace_personnel_workspace_id_key
    unique (workspace_user_id, workspace_account_type, id),
  constraint atsrs_workspace_personnel_legacy_key
    unique (workspace_user_id, workspace_account_type, legacy_source_key)
);

create table public.atsrs_personnel_certificates (
  id uuid primary key default gen_random_uuid(),
  workspace_user_id uuid not null,
  workspace_account_type text not null,
  personnel_id uuid not null,
  file_id uuid,
  certificate_type text not null,
  provider_name text,
  document_number text,
  issuing_country text,
  issue_date date,
  expiry_date date,
  legacy_source_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint atsrs_personnel_certificates_workspace_fkey
    foreign key (workspace_user_id, workspace_account_type)
    references public.atsrs_workspaces (user_id, account_type)
    on delete cascade,
  constraint atsrs_personnel_certificates_personnel_fkey
    foreign key (workspace_user_id, workspace_account_type, personnel_id)
    references public.atsrs_workspace_personnel
      (workspace_user_id, workspace_account_type, id)
    on delete cascade,
  constraint atsrs_personnel_certificates_file_fkey
    foreign key (file_id)
    references public.atsrs_files (id)
    on delete set null,
  constraint atsrs_personnel_certificates_account_type_check
    check (workspace_account_type in ('personal', 'company')),
  constraint atsrs_personnel_certificates_type_check
    check (length(btrim(certificate_type)) > 0),
  constraint atsrs_personnel_certificates_dates_check
    check (issue_date is null or expiry_date is null or expiry_date >= issue_date),
  constraint atsrs_personnel_certificates_metadata_check
    check (jsonb_typeof(metadata) = 'object'),
  constraint atsrs_personnel_certificates_legacy_key
    unique (workspace_user_id, workspace_account_type, legacy_source_key)
);

create table public.atsrs_project_personnel (
  id uuid primary key default gen_random_uuid(),
  workspace_user_id uuid not null,
  workspace_account_type text not null,
  project_id uuid not null,
  personnel_id uuid not null,
  legacy_source_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint atsrs_project_personnel_workspace_fkey
    foreign key (workspace_user_id, workspace_account_type)
    references public.atsrs_workspaces (user_id, account_type)
    on delete cascade,
  constraint atsrs_project_personnel_project_fkey
    foreign key (workspace_user_id, workspace_account_type, project_id)
    references public.atsrs_workspace_projects
      (workspace_user_id, workspace_account_type, id)
    on delete cascade,
  constraint atsrs_project_personnel_personnel_fkey
    foreign key (workspace_user_id, workspace_account_type, personnel_id)
    references public.atsrs_workspace_personnel
      (workspace_user_id, workspace_account_type, id)
    on delete cascade,
  constraint atsrs_project_personnel_account_type_check
    check (workspace_account_type in ('personal', 'company')),
  constraint atsrs_project_personnel_assignment_key
    unique (workspace_user_id, workspace_account_type, project_id, personnel_id),
  constraint atsrs_project_personnel_legacy_key
    unique (workspace_user_id, workspace_account_type, legacy_source_key)
);

create index atsrs_workspace_projects_name_idx
  on public.atsrs_workspace_projects
    (workspace_user_id, workspace_account_type, project_name);

create index atsrs_workspace_personnel_name_idx
  on public.atsrs_workspace_personnel
    (workspace_user_id, workspace_account_type, last_name, first_name);

create index atsrs_workspace_personnel_position_idx
  on public.atsrs_workspace_personnel
    (workspace_user_id, workspace_account_type, position)
  where position is not null;

create index atsrs_workspace_personnel_tracker_status_idx
  on public.atsrs_workspace_personnel
    (workspace_user_id, workspace_account_type, tracker_status)
  where tracker_status is not null;

create index atsrs_workspace_personnel_linked_user_idx
  on public.atsrs_workspace_personnel (linked_user_id);

create index atsrs_personnel_certificates_personnel_idx
  on public.atsrs_personnel_certificates
    (workspace_user_id, workspace_account_type, personnel_id);

create index atsrs_personnel_certificates_type_idx
  on public.atsrs_personnel_certificates
    (workspace_user_id, workspace_account_type, certificate_type);

create index atsrs_personnel_certificates_expiry_idx
  on public.atsrs_personnel_certificates
    (workspace_user_id, workspace_account_type, expiry_date)
  where expiry_date is not null;

create index atsrs_personnel_certificates_file_idx
  on public.atsrs_personnel_certificates (file_id);

create index atsrs_project_personnel_personnel_idx
  on public.atsrs_project_personnel
    (workspace_user_id, workspace_account_type, personnel_id);

create index atsrs_ai_usage_user_id_idx
  on public.atsrs_ai_usage (user_id);

alter table public.atsrs_workspace_projects enable row level security;
alter table public.atsrs_workspace_personnel enable row level security;
alter table public.atsrs_personnel_certificates enable row level security;
alter table public.atsrs_project_personnel enable row level security;

revoke all on table public.atsrs_workspace_projects
  from public, anon, authenticated;
revoke all on table public.atsrs_workspace_personnel
  from public, anon, authenticated;
revoke all on table public.atsrs_personnel_certificates
  from public, anon, authenticated;
revoke all on table public.atsrs_project_personnel
  from public, anon, authenticated;

grant select, insert, update, delete
  on table public.atsrs_workspace_projects
  to authenticated;
grant select, insert, update, delete
  on table public.atsrs_workspace_personnel
  to authenticated;
grant select, insert, update, delete
  on table public.atsrs_personnel_certificates
  to authenticated;
grant select, insert, update, delete
  on table public.atsrs_project_personnel
  to authenticated;

create policy atsrs_workspace_projects_select_own
  on public.atsrs_workspace_projects
  for select
  to authenticated
  using ((select auth.uid()) = workspace_user_id);

create policy atsrs_workspace_projects_insert_own
  on public.atsrs_workspace_projects
  for insert
  to authenticated
  with check ((select auth.uid()) = workspace_user_id);

create policy atsrs_workspace_projects_update_own
  on public.atsrs_workspace_projects
  for update
  to authenticated
  using ((select auth.uid()) = workspace_user_id)
  with check ((select auth.uid()) = workspace_user_id);

create policy atsrs_workspace_projects_delete_own
  on public.atsrs_workspace_projects
  for delete
  to authenticated
  using ((select auth.uid()) = workspace_user_id);

create policy atsrs_workspace_personnel_select_own
  on public.atsrs_workspace_personnel
  for select
  to authenticated
  using ((select auth.uid()) = workspace_user_id);

create policy atsrs_workspace_personnel_insert_own
  on public.atsrs_workspace_personnel
  for insert
  to authenticated
  with check ((select auth.uid()) = workspace_user_id);

create policy atsrs_workspace_personnel_update_own
  on public.atsrs_workspace_personnel
  for update
  to authenticated
  using ((select auth.uid()) = workspace_user_id)
  with check ((select auth.uid()) = workspace_user_id);

create policy atsrs_workspace_personnel_delete_own
  on public.atsrs_workspace_personnel
  for delete
  to authenticated
  using ((select auth.uid()) = workspace_user_id);

create policy atsrs_personnel_certificates_select_own
  on public.atsrs_personnel_certificates
  for select
  to authenticated
  using ((select auth.uid()) = workspace_user_id);

create policy atsrs_personnel_certificates_insert_own
  on public.atsrs_personnel_certificates
  for insert
  to authenticated
  with check (
    (select auth.uid()) = workspace_user_id
    and (
      file_id is null
      or exists (
        select 1
        from public.atsrs_files
        where atsrs_files.id = file_id
          and atsrs_files.user_id = workspace_user_id
          and atsrs_files.account_type = workspace_account_type
      )
    )
  );

create policy atsrs_personnel_certificates_update_own
  on public.atsrs_personnel_certificates
  for update
  to authenticated
  using ((select auth.uid()) = workspace_user_id)
  with check (
    (select auth.uid()) = workspace_user_id
    and (
      file_id is null
      or exists (
        select 1
        from public.atsrs_files
        where atsrs_files.id = file_id
          and atsrs_files.user_id = workspace_user_id
          and atsrs_files.account_type = workspace_account_type
      )
    )
  );

create policy atsrs_personnel_certificates_delete_own
  on public.atsrs_personnel_certificates
  for delete
  to authenticated
  using ((select auth.uid()) = workspace_user_id);

create policy atsrs_project_personnel_select_own
  on public.atsrs_project_personnel
  for select
  to authenticated
  using ((select auth.uid()) = workspace_user_id);

create policy atsrs_project_personnel_insert_own
  on public.atsrs_project_personnel
  for insert
  to authenticated
  with check ((select auth.uid()) = workspace_user_id);

create policy atsrs_project_personnel_update_own
  on public.atsrs_project_personnel
  for update
  to authenticated
  using ((select auth.uid()) = workspace_user_id)
  with check ((select auth.uid()) = workspace_user_id);

create policy atsrs_project_personnel_delete_own
  on public.atsrs_project_personnel
  for delete
  to authenticated
  using ((select auth.uid()) = workspace_user_id);

commit;
