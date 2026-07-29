-- Stable, workspace-scoped identities for normalized shadow rows.
-- The legacy JSON read path remains authoritative during this phase.
begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

create table if not exists atsrs_private.runtime_flags (
  flag_name text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint atsrs_runtime_flags_name_check
    check (length(btrim(flag_name)) > 0)
);

alter table atsrs_private.runtime_flags enable row level security;

revoke all on table atsrs_private.runtime_flags
  from public, anon, authenticated;

insert into atsrs_private.runtime_flags (flag_name, enabled)
values ('stable_ids_required', false)
on conflict (flag_name) do nothing;

alter table public.atsrs_workspace_projects
  add column if not exists source_entity_id uuid;
alter table public.atsrs_workspace_personnel
  add column if not exists source_entity_id uuid;
alter table public.atsrs_personnel_certificates
  add column if not exists source_entity_id uuid;
alter table public.atsrs_project_personnel
  add column if not exists source_entity_id uuid;

update public.atsrs_workspace_projects
set source_entity_id = extensions.uuid_generate_v5(
  '9fe1439e-5b5a-5c86-9d7c-28a67036e814'::uuid,
  legacy_source_key
);
update public.atsrs_workspace_personnel
set source_entity_id = extensions.uuid_generate_v5(
  '9fe1439e-5b5a-5c86-9d7c-28a67036e814'::uuid,
  legacy_source_key
);
update public.atsrs_personnel_certificates
set source_entity_id = extensions.uuid_generate_v5(
  '9fe1439e-5b5a-5c86-9d7c-28a67036e814'::uuid,
  legacy_source_key
);
update public.atsrs_project_personnel
set source_entity_id = extensions.uuid_generate_v5(
  '9fe1439e-5b5a-5c86-9d7c-28a67036e814'::uuid,
  coalesce(
    legacy_source_key,
    workspace_user_id::text || ':' || workspace_account_type || ':'
      || project_id::text || ':' || personnel_id::text
  )
);

alter table public.atsrs_workspace_projects
  alter column source_entity_id set not null;
alter table public.atsrs_workspace_personnel
  alter column source_entity_id set not null;
alter table public.atsrs_personnel_certificates
  alter column source_entity_id set not null;
alter table public.atsrs_project_personnel
  alter column source_entity_id set not null;

do $constraints$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.atsrs_workspace_projects'::regclass
      and conname = 'atsrs_workspace_projects_source_entity_key'
  ) then
    alter table public.atsrs_workspace_projects
      add constraint atsrs_workspace_projects_source_entity_key
      unique (workspace_user_id, workspace_account_type, source_entity_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.atsrs_workspace_personnel'::regclass
      and conname = 'atsrs_workspace_personnel_source_entity_key'
  ) then
    alter table public.atsrs_workspace_personnel
      add constraint atsrs_workspace_personnel_source_entity_key
      unique (workspace_user_id, workspace_account_type, source_entity_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.atsrs_personnel_certificates'::regclass
      and conname = 'atsrs_personnel_certificates_source_entity_key'
  ) then
    alter table public.atsrs_personnel_certificates
      add constraint atsrs_personnel_certificates_source_entity_key
      unique (workspace_user_id, workspace_account_type, source_entity_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.atsrs_project_personnel'::regclass
      and conname = 'atsrs_project_personnel_source_entity_key'
  ) then
    alter table public.atsrs_project_personnel
      add constraint atsrs_project_personnel_source_entity_key
      unique (workspace_user_id, workspace_account_type, source_entity_id);
  end if;
end;
$constraints$;

create or replace function atsrs_private.sync_workspace_normalized_shadow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  source_row public.atsrs_workspace_data%rowtype;
  decoded jsonb;
  source_prefix text;
  owner_legacy_key text;
  owner_source_id uuid;
  namespace_id constant uuid := '9fe1439e-5b5a-5c86-9d7c-28a67036e814'::uuid;
  missing_dependencies integer;
  stable_ids_required boolean;
begin
  source_row := case when tg_op = 'DELETE' then old else new end;
  source_prefix := 'workspace_data:' || source_row.data_key || ':item:';
  select enabled into stable_ids_required
  from atsrs_private.runtime_flags
  where flag_name = 'stable_ids_required';
  stable_ids_required := coalesce(stable_ids_required, false);

  if source_row.data_key like '%\_personal\_profile' escape '\' then
    owner_legacy_key := 'workspace_data:' || source_row.data_key || ':owner';
    if tg_op = 'DELETE'
       or coalesce(source_row.payload->>'deleted', 'false') = 'true' then
      if exists (
        select 1 from public.atsrs_workspace_personnel p
        where p.workspace_user_id = source_row.user_id
          and p.workspace_account_type = source_row.account_type
          and p.legacy_source_key = owner_legacy_key
          and exists (
            select 1 from public.atsrs_personnel_certificates c
            where c.workspace_user_id = p.workspace_user_id
              and c.workspace_account_type = p.workspace_account_type
              and c.personnel_id = p.id
          )
      ) then
        raise exception 'cannot delete a personnel owner with certificates';
      end if;
      delete from public.atsrs_workspace_personnel
      where workspace_user_id = source_row.user_id
        and workspace_account_type = source_row.account_type
        and legacy_source_key = owner_legacy_key;
      return source_row;
    end if;

    decoded := (source_row.payload->>'value')::jsonb;
    if jsonb_typeof(decoded) <> 'object' then
      raise exception 'personal profile payload must be a JSON object';
    end if;
    if stable_ids_required
       and nullif(btrim(decoded->>'atsrsId'), '') is null then
      raise exception 'stable ID compatibility refresh required for personal profile';
    end if;
    owner_source_id := coalesce(
      nullif(btrim(decoded->>'atsrsId'), '')::uuid,
      extensions.uuid_generate_v5(namespace_id, owner_legacy_key)
    );

    insert into public.atsrs_workspace_personnel (
      workspace_user_id, workspace_account_type, linked_user_id,
      first_name, last_name, position, company_name, email, phone,
      whatsapp, nationality, source, linked_status, phone_verified,
      whatsapp_verified, source_entity_id, legacy_source_key, metadata,
      created_at, updated_at
    )
    values (
      source_row.user_id, source_row.account_type, source_row.user_id,
      btrim(decoded->>'name'), nullif(btrim(decoded->>'surname'), ''),
      nullif(btrim(decoded->>'position'), ''), nullif(btrim(decoded->>'company'), ''),
      (select nullif(btrim(email), '') from auth.users where id = source_row.user_id),
      nullif(btrim(decoded->>'phone'), ''), nullif(btrim(decoded->>'whatsapp'), ''),
      nullif(btrim(decoded->>'country'), ''), 'workspace_data_personal_profile',
      'linked', coalesce((decoded->>'phoneVerified')::boolean, false),
      coalesce((decoded->>'whatsappVerified')::boolean, false),
      owner_source_id, owner_legacy_key,
      decoded - array[
        'atsrsId', 'name', 'surname', 'position', 'company', 'phone',
        'whatsapp', 'country', 'phoneVerified', 'whatsappVerified'
      ]::text[],
      source_row.updated_at, source_row.updated_at
    )
    on conflict (workspace_user_id, workspace_account_type, source_entity_id)
    do update set
      linked_user_id = excluded.linked_user_id,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      position = excluded.position,
      company_name = excluded.company_name,
      email = excluded.email,
      phone = excluded.phone,
      whatsapp = excluded.whatsapp,
      nationality = excluded.nationality,
      source = excluded.source,
      linked_status = excluded.linked_status,
      phone_verified = excluded.phone_verified,
      whatsapp_verified = excluded.whatsapp_verified,
      legacy_source_key = excluded.legacy_source_key,
      metadata = excluded.metadata,
      updated_at = excluded.updated_at;
    return source_row;
  end if;

  if source_row.data_key like '%\_company\_personnel' escape '\' then
    if tg_op = 'DELETE'
       or coalesce(source_row.payload->>'deleted', 'false') = 'true' then
      if exists (
        select 1 from public.atsrs_workspace_personnel p
        where p.workspace_user_id = source_row.user_id
          and p.workspace_account_type = source_row.account_type
          and p.legacy_source_key like source_prefix || '%'
          and (
            exists (select 1 from public.atsrs_personnel_certificates c where c.personnel_id = p.id)
            or exists (select 1 from public.atsrs_project_personnel a where a.personnel_id = p.id)
          )
      ) then
        raise exception 'cannot delete personnel data while stable relationships exist';
      end if;
      delete from public.atsrs_workspace_personnel
      where workspace_user_id = source_row.user_id
        and workspace_account_type = source_row.account_type
        and legacy_source_key like source_prefix || '%';
      return source_row;
    end if;

    decoded := (source_row.payload->>'value')::jsonb;
    if jsonb_typeof(decoded) <> 'array' then
      raise exception 'company personnel payload must be a JSON array';
    end if;
    if stable_ids_required and exists (
      select 1
      from jsonb_array_elements(decoded) entry(item)
      where nullif(btrim(item->>'atsrsId'), '') is null
         or jsonb_typeof(item->'atsrsProjectIds') is distinct from 'array'
    ) then
      raise exception 'stable ID compatibility refresh required for company personnel';
    end if;
    if exists (
      select 1
      from jsonb_array_elements(decoded) entry(item)
      where nullif(btrim(item->>'atsrsId'), '') is not null
        and not (item->>'atsrsId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
    ) then
      raise exception 'company personnel contains an invalid atsrsId';
    end if;
    if not stable_ids_required and exists (
      select 1
      from jsonb_array_elements(decoded) entry(item)
      where nullif(btrim(item->>'atsrsId'), '') is null
    ) then
      -- Preserve an old client's authoritative JSON without assigning identity
      -- from array position. V387 will hydrate stable IDs on the next refresh.
      return source_row;
    end if;

    update public.atsrs_workspace_personnel
    set legacy_source_key = source_prefix || 'stale:' || source_entity_id::text
    where workspace_user_id = source_row.user_id
      and workspace_account_type = source_row.account_type
      and legacy_source_key like source_prefix || '%';

    insert into public.atsrs_workspace_personnel (
      workspace_user_id, workspace_account_type, linked_user_id,
      first_name, last_name, position, company_name, email, phone,
      whatsapp, nationality, employee_id, source, access_status,
      linked_status, tracker_status, phone_verified, whatsapp_verified,
      source_entity_id, legacy_source_key, metadata, created_at, updated_at
    )
    select
      source_row.user_id, source_row.account_type,
      nullif(btrim(item->>'linkedUserId'), '')::uuid,
      btrim(item->>'name'), nullif(btrim(item->>'surname'), ''),
      nullif(btrim(item->>'position'), ''), nullif(btrim(item->>'company'), ''),
      nullif(btrim(item->>'email'), ''), nullif(btrim(item->>'phone'), ''),
      nullif(btrim(item->>'whatsapp'), ''),
      coalesce(nullif(btrim(item->>'nationality'), ''), nullif(btrim(item->>'country'), '')),
      nullif(btrim(item->>'employeeId'), ''), nullif(btrim(item->>'source'), ''),
      nullif(btrim(item->>'accessStatus'), ''), nullif(btrim(item->>'linkedStatus'), ''),
      nullif(btrim(item->>'trackerStatus'), ''),
      coalesce((item->>'phoneVerified')::boolean, false),
      coalesce((item->>'whatsappVerified')::boolean, false),
      coalesce(
        nullif(btrim(item->>'atsrsId'), '')::uuid,
        extensions.uuid_generate_v5(namespace_id, source_prefix || ordinality::text)
      ),
      source_prefix || ordinality::text,
      item - array[
        'atsrsId', 'atsrsProjectIds', 'linkedUserId', 'name', 'surname',
        'position', 'company', 'email', 'phone', 'whatsapp', 'nationality',
        'country', 'employeeId', 'source', 'accessStatus', 'linkedStatus',
        'trackerStatus', 'phoneVerified', 'whatsappVerified'
      ]::text[],
      source_row.updated_at, source_row.updated_at
    from jsonb_array_elements(decoded) with ordinality as entry(item, ordinality)
    on conflict (workspace_user_id, workspace_account_type, source_entity_id)
    do update set
      linked_user_id = excluded.linked_user_id,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      position = excluded.position,
      company_name = excluded.company_name,
      email = excluded.email,
      phone = excluded.phone,
      whatsapp = excluded.whatsapp,
      nationality = excluded.nationality,
      employee_id = excluded.employee_id,
      source = excluded.source,
      access_status = excluded.access_status,
      linked_status = excluded.linked_status,
      tracker_status = excluded.tracker_status,
      phone_verified = excluded.phone_verified,
      whatsapp_verified = excluded.whatsapp_verified,
      legacy_source_key = excluded.legacy_source_key,
      metadata = excluded.metadata,
      updated_at = excluded.updated_at;

    select count(*) into missing_dependencies
    from jsonb_array_elements(decoded) entry(person)
    cross join lateral jsonb_array_elements_text(coalesce(person->'atsrsProjectIds', '[]'::jsonb)) project_ref
    where not exists (
      select 1 from public.atsrs_workspace_projects project
      where project.workspace_user_id = source_row.user_id
        and project.workspace_account_type = source_row.account_type
        and project.source_entity_id = project_ref::uuid
    );
    if missing_dependencies > 0 then
      raise exception 'personnel references a missing workspace project';
    end if;

    delete from public.atsrs_project_personnel assignment
    using public.atsrs_workspace_personnel personnel
    where personnel.workspace_user_id = source_row.user_id
      and personnel.workspace_account_type = source_row.account_type
      and personnel.legacy_source_key like source_prefix || '%'
      and assignment.workspace_user_id = personnel.workspace_user_id
      and assignment.workspace_account_type = personnel.workspace_account_type
      and assignment.personnel_id = personnel.id;

    insert into public.atsrs_project_personnel (
      workspace_user_id, workspace_account_type, project_id, personnel_id,
      source_entity_id, legacy_source_key, created_at, updated_at
    )
    select
      source_row.user_id, source_row.account_type, project.id, personnel.id,
      extensions.uuid_generate_v5(
        namespace_id,
        personnel.source_entity_id::text || ':' || project.source_entity_id::text
      ),
      'workspace_data:' || source_row.data_key || ':personnel:'
        || personnel.source_entity_id::text || ':project:' || project.source_entity_id::text,
      source_row.updated_at, source_row.updated_at
    from jsonb_array_elements(decoded) entry(person)
    cross join lateral jsonb_array_elements_text(coalesce(person->'atsrsProjectIds', '[]'::jsonb)) project_ref
    join public.atsrs_workspace_personnel personnel
      on personnel.workspace_user_id = source_row.user_id
     and personnel.workspace_account_type = source_row.account_type
     and personnel.source_entity_id = nullif(btrim(person->>'atsrsId'), '')::uuid
    join public.atsrs_workspace_projects project
      on project.workspace_user_id = source_row.user_id
     and project.workspace_account_type = source_row.account_type
     and project.source_entity_id = project_ref::uuid
    on conflict (workspace_user_id, workspace_account_type, source_entity_id)
    do update set
      project_id = excluded.project_id,
      personnel_id = excluded.personnel_id,
      legacy_source_key = excluded.legacy_source_key,
      updated_at = excluded.updated_at;

    if exists (
      select 1 from public.atsrs_workspace_personnel target
      where target.workspace_user_id = source_row.user_id
        and target.workspace_account_type = source_row.account_type
        and target.legacy_source_key like source_prefix || 'stale:%'
        and (
          exists (select 1 from public.atsrs_personnel_certificates c where c.personnel_id = target.id)
          or exists (select 1 from public.atsrs_project_personnel a where a.personnel_id = target.id)
        )
    ) then
      raise exception 'cannot remove personnel with stable relationships';
    end if;
    delete from public.atsrs_workspace_personnel
    where workspace_user_id = source_row.user_id
      and workspace_account_type = source_row.account_type
      and legacy_source_key like source_prefix || 'stale:%';
    return source_row;
  end if;

  if source_row.data_key like '%\_projects' escape '\' then
    if tg_op = 'DELETE'
       or coalesce(source_row.payload->>'deleted', 'false') = 'true' then
      if exists (
        select 1 from public.atsrs_workspace_projects p
        where p.workspace_user_id = source_row.user_id
          and p.workspace_account_type = source_row.account_type
          and p.legacy_source_key like source_prefix || '%'
          and exists (select 1 from public.atsrs_project_personnel a where a.project_id = p.id)
      ) then
        raise exception 'cannot delete projects with personnel assignments';
      end if;
      delete from public.atsrs_workspace_projects
      where workspace_user_id = source_row.user_id
        and workspace_account_type = source_row.account_type
        and legacy_source_key like source_prefix || '%';
      return source_row;
    end if;
    decoded := (source_row.payload->>'value')::jsonb;
    if jsonb_typeof(decoded) <> 'array' then
      raise exception 'projects payload must be a JSON array';
    end if;
    if stable_ids_required and exists (
      select 1
      from jsonb_array_elements(decoded) entry(item)
      where nullif(btrim(item->>'atsrsId'), '') is null
    ) then
      raise exception 'stable ID compatibility refresh required for projects';
    end if;
    if not stable_ids_required and exists (
      select 1
      from jsonb_array_elements(decoded) entry(item)
      where nullif(btrim(item->>'atsrsId'), '') is null
    ) then
      -- Do not bind stable project identity to mutable legacy array order.
      return source_row;
    end if;
    update public.atsrs_workspace_projects
    set legacy_source_key = source_prefix || 'stale:' || source_entity_id::text
    where workspace_user_id = source_row.user_id
      and workspace_account_type = source_row.account_type
      and legacy_source_key like source_prefix || '%';

    insert into public.atsrs_workspace_projects (
      workspace_user_id, workspace_account_type, project_name, vessel_name,
      client_name, team_name, source_entity_id, legacy_source_key, metadata,
      created_at, updated_at
    )
    select
      source_row.user_id, source_row.account_type, btrim(item->>'project'),
      nullif(btrim(item->>'vessel'), ''), nullif(btrim(item->>'client'), ''),
      nullif(btrim(item->>'team'), ''),
      coalesce(
        nullif(btrim(item->>'atsrsId'), '')::uuid,
        extensions.uuid_generate_v5(namespace_id, source_prefix || ordinality::text)
      ),
      source_prefix || ordinality::text,
      item - array['atsrsId', 'project', 'vessel', 'client', 'team']::text[],
      source_row.updated_at, source_row.updated_at
    from jsonb_array_elements(decoded) with ordinality as entry(item, ordinality)
    on conflict (workspace_user_id, workspace_account_type, source_entity_id)
    do update set
      project_name = excluded.project_name,
      vessel_name = excluded.vessel_name,
      client_name = excluded.client_name,
      team_name = excluded.team_name,
      legacy_source_key = excluded.legacy_source_key,
      metadata = excluded.metadata,
      updated_at = excluded.updated_at;

    if exists (
      select 1 from public.atsrs_workspace_projects target
      where target.workspace_user_id = source_row.user_id
        and target.workspace_account_type = source_row.account_type
        and target.legacy_source_key like source_prefix || 'stale:%'
        and exists (select 1 from public.atsrs_project_personnel a where a.project_id = target.id)
    ) then
      raise exception 'cannot remove a project with personnel assignments';
    end if;
    delete from public.atsrs_workspace_projects
    where workspace_user_id = source_row.user_id
      and workspace_account_type = source_row.account_type
      and legacy_source_key like source_prefix || 'stale:%';
    return source_row;
  end if;

  if source_row.data_key like '%\_personal\_certs' escape '\'
     or source_row.data_key like '%\_company\_certs' escape '\' then
    if tg_op = 'DELETE'
       or coalesce(source_row.payload->>'deleted', 'false') = 'true' then
      delete from public.atsrs_personnel_certificates
      where workspace_user_id = source_row.user_id
        and workspace_account_type = source_row.account_type
        and legacy_source_key like source_prefix || '%';
      return source_row;
    end if;
    decoded := (source_row.payload->>'value')::jsonb;
    if jsonb_typeof(decoded) <> 'array' then
      raise exception 'certificate payload must be a JSON array';
    end if;
    if stable_ids_required and exists (
      select 1
      from jsonb_array_elements(decoded) entry(item)
      where nullif(btrim(item->>'atsrsId'), '') is null
         or nullif(btrim(item->>'atsrsPersonnelId'), '') is null
    ) then
      raise exception 'stable ID compatibility refresh required for certificates';
    end if;
    if not stable_ids_required and exists (
          select 1
          from jsonb_array_elements(decoded) entry(item)
          where nullif(btrim(item->>'atsrsId'), '') is null
             or (
               source_row.data_key like '%\_company\_certs' escape '\'
               and nullif(btrim(item->>'atsrsPersonnelId'), '') is null
             )
        ) then
      -- A cached pre-stable-ID client may still write position-based records
      -- or display names only. Preserve legacy JSON and do not guess identity.
      return source_row;
    end if;

    update public.atsrs_personnel_certificates
    set legacy_source_key = source_prefix || 'stale:' || source_entity_id::text
    where workspace_user_id = source_row.user_id
      and workspace_account_type = source_row.account_type
      and legacy_source_key like source_prefix || '%';

    insert into public.atsrs_personnel_certificates (
      workspace_user_id, workspace_account_type, personnel_id, file_id,
      certificate_type, provider_name, document_number, issuing_country,
      issue_date, expiry_date, source_entity_id, legacy_source_key, metadata,
      created_at, updated_at
    )
    select
      source_row.user_id, source_row.account_type, personnel.id, file_row.id,
      btrim(item->>'type'), nullif(btrim(item->>'provider'), ''),
      nullif(btrim(item->>'docNo'), ''), nullif(btrim(item->>'country'), ''),
      case when nullif(btrim(item->>'issue'), '') is null
                  or upper(btrim(item->>'issue')) in ('N/A', 'NA')
           then null else btrim(item->>'issue')::date end,
      case when nullif(btrim(item->>'expiry'), '') is null
                  or upper(btrim(item->>'expiry')) in ('N/A', 'NA')
           then null else btrim(item->>'expiry')::date end,
      coalesce(
        nullif(btrim(item->>'atsrsId'), '')::uuid,
        extensions.uuid_generate_v5(namespace_id, source_prefix || ordinality::text)
      ),
      source_prefix || ordinality::text,
      item - array[
        'atsrsId', 'atsrsPersonnelId', 'person', 'type', 'provider', 'docNo',
        'country', 'issue', 'expiry', 'cloudFileId', 'fileName', 'mimeType', 'fileSize'
      ]::text[],
      source_row.updated_at, source_row.updated_at
    from jsonb_array_elements(decoded) with ordinality as entry(item, ordinality)
    join public.atsrs_workspace_personnel personnel
      on personnel.workspace_user_id = source_row.user_id
     and personnel.workspace_account_type = source_row.account_type
     and personnel.source_entity_id = case
       when source_row.data_key like '%\_personal\_certs' escape '\' then
         coalesce(
           nullif(btrim(item->>'atsrsPersonnelId'), '')::uuid,
           extensions.uuid_generate_v5(
             namespace_id,
             'workspace_data:' || replace(source_row.data_key, '_personal_certs', '_personal_profile') || ':owner'
           )
         )
       else nullif(btrim(item->>'atsrsPersonnelId'), '')::uuid
     end
    left join public.atsrs_files file_row
      on nullif(btrim(item->>'cloudFileId'), '') is not null
     and file_row.id = nullif(btrim(item->>'cloudFileId'), '')::uuid
     and file_row.user_id = source_row.user_id
     and file_row.account_type = source_row.account_type
     and file_row.file_name = item->>'fileName'
     and file_row.mime_type = item->>'mimeType'
     and file_row.size_bytes = (item->>'fileSize')::bigint
    on conflict (workspace_user_id, workspace_account_type, source_entity_id)
    do update set
      personnel_id = excluded.personnel_id,
      file_id = excluded.file_id,
      certificate_type = excluded.certificate_type,
      provider_name = excluded.provider_name,
      document_number = excluded.document_number,
      issuing_country = excluded.issuing_country,
      issue_date = excluded.issue_date,
      expiry_date = excluded.expiry_date,
      legacy_source_key = excluded.legacy_source_key,
      metadata = excluded.metadata,
      updated_at = excluded.updated_at;

    if (select count(*) from jsonb_array_elements(decoded))
       <> (select count(*) from public.atsrs_personnel_certificates
           where workspace_user_id = source_row.user_id
             and workspace_account_type = source_row.account_type
             and legacy_source_key like source_prefix || '%'
             and legacy_source_key not like source_prefix || 'stale:%') then
      raise exception 'one or more certificates have no exact stable personnel mapping';
    end if;
    delete from public.atsrs_personnel_certificates
    where workspace_user_id = source_row.user_id
      and workspace_account_type = source_row.account_type
      and legacy_source_key like source_prefix || 'stale:%';
    return source_row;
  end if;

  return source_row;
end;
$function$;

revoke all on function atsrs_private.sync_workspace_normalized_shadow()
  from public, anon, authenticated;

-- Existing RLS policies and grants remain unchanged. Authenticated clients
-- still cannot write normalized shadow tables directly.
commit;
