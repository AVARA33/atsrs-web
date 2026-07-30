-- Stage 19: one authenticated, workspace-scoped command for an affected
-- normalized graph and its legacy JSON mirror. Direct browser DML on the
-- normalized tables remains disabled. This migration is rehearsed on staging
-- before any production decision.
begin;

create table if not exists atsrs_private.workspace_write_revisions (
  workspace_user_id uuid not null,
  workspace_account_type text not null,
  revision bigint not null default 0 check (revision >= 0),
  last_legacy_updated_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (workspace_user_id, workspace_account_type),
  constraint workspace_write_revisions_workspace_fkey
    foreign key (workspace_user_id, workspace_account_type)
    references public.atsrs_workspaces (user_id, account_type)
    on delete cascade
);

create table if not exists atsrs_private.workspace_write_commands (
  workspace_user_id uuid not null,
  workspace_account_type text not null,
  operation_id uuid not null,
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  expected_revision bigint not null check (expected_revision >= 0),
  committed_revision bigint not null check (committed_revision >= 0),
  client_build text not null,
  audit_metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(audit_metadata) = 'object'),
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  created_at timestamptz not null default now(),
  primary key (workspace_user_id, workspace_account_type, operation_id),
  constraint workspace_write_commands_workspace_fkey
    foreign key (workspace_user_id, workspace_account_type)
    references public.atsrs_workspaces (user_id, account_type)
    on delete cascade
);

create index if not exists workspace_write_commands_created_idx
  on atsrs_private.workspace_write_commands
    (workspace_user_id, workspace_account_type, created_at desc);

alter table atsrs_private.workspace_write_revisions enable row level security;
alter table atsrs_private.workspace_write_commands enable row level security;

revoke all on table atsrs_private.workspace_write_revisions
  from public, anon, authenticated, service_role;
revoke all on table atsrs_private.workspace_write_commands
  from public, anon, authenticated, service_role;

insert into atsrs_private.workspace_write_revisions (
  workspace_user_id,
  workspace_account_type,
  revision,
  last_legacy_updated_at
)
select
  workspace.user_id,
  workspace.account_type,
  0,
  max(data.updated_at)
from public.atsrs_workspaces workspace
left join public.atsrs_workspace_data data
  on data.user_id = workspace.user_id
 and data.account_type = workspace.account_type
group by workspace.user_id, workspace.account_type
on conflict (workspace_user_id, workspace_account_type) do nothing;

create or replace function atsrs_private.bump_workspace_write_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  source_user_id uuid;
  source_account_type text;
  source_updated_at timestamptz;
begin
  if current_setting('atsrs.primary_write_managed', true) = 'on' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  source_user_id := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
  source_account_type := case when tg_op = 'DELETE' then old.account_type else new.account_type end;
  source_updated_at := case when tg_op = 'DELETE' then old.updated_at else new.updated_at end;

  -- A workspace cascade deletes the parent before its workspace-data rows.
  -- That teardown must not recreate revision state or violate the FK.
  if tg_op = 'DELETE'
     and not exists (
       select 1
       from public.atsrs_workspaces workspace
       where workspace.user_id = source_user_id
         and workspace.account_type = source_account_type
     ) then
    return old;
  end if;

  insert into atsrs_private.workspace_write_revisions (
    workspace_user_id,
    workspace_account_type,
    revision,
    last_legacy_updated_at,
    updated_at
  )
  values (
    source_user_id,
    source_account_type,
    1,
    source_updated_at,
    clock_timestamp()
  )
  on conflict (workspace_user_id, workspace_account_type)
  do update set
    revision = atsrs_private.workspace_write_revisions.revision + 1,
    last_legacy_updated_at = excluded.last_legacy_updated_at,
    updated_at = excluded.updated_at;

  return case when tg_op = 'DELETE' then old else new end;
end;
$function$;

revoke all on function atsrs_private.bump_workspace_write_revision()
  from public, anon, authenticated, service_role;

drop trigger if exists atsrs_workspace_data_command_revision
  on public.atsrs_workspace_data;
create trigger atsrs_workspace_data_command_revision
after insert or update or delete
on public.atsrs_workspace_data
for each row
execute function atsrs_private.bump_workspace_write_revision();

create or replace function atsrs_private.assert_workspace_operation_parity(
  target_user_id uuid,
  target_account_type text,
  operation jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  operation_key text := operation->>'data_key';
  operation_value jsonb := operation->'value';
  source_canonical jsonb;
  target_canonical jsonb;
  missing_file_count integer;
begin
  if coalesce((operation->>'deleted')::boolean, false) then
    if operation_key like '%\_personal\_profile' escape '\'
       and exists (
         select 1 from public.atsrs_workspace_personnel
         where workspace_user_id = target_user_id
           and workspace_account_type = target_account_type
           and legacy_source_key = 'workspace_data:' || operation_key || ':owner'
       ) then
      raise exception using errcode = 'P0001',
        message = 'ATSRS_PARITY_MISMATCH:profile_delete';
    elsif operation_key like '%\_company\_personnel' escape '\'
       and exists (
         select 1 from public.atsrs_workspace_personnel
         where workspace_user_id = target_user_id
           and workspace_account_type = target_account_type
           and legacy_source_key like 'workspace_data:' || operation_key || ':item:%'
       ) then
      raise exception using errcode = 'P0001',
        message = 'ATSRS_PARITY_MISMATCH:personnel_delete';
    elsif operation_key like '%\_projects' escape '\'
       and exists (
         select 1 from public.atsrs_workspace_projects
         where workspace_user_id = target_user_id
           and workspace_account_type = target_account_type
           and legacy_source_key like 'workspace_data:' || operation_key || ':item:%'
       ) then
      raise exception using errcode = 'P0001',
        message = 'ATSRS_PARITY_MISMATCH:projects_delete';
    elsif operation_key like '%\_certs' escape '\'
       and exists (
         select 1 from public.atsrs_personnel_certificates
         where workspace_user_id = target_user_id
           and workspace_account_type = target_account_type
           and legacy_source_key like 'workspace_data:' || operation_key || ':item:%'
       ) then
      raise exception using errcode = 'P0001',
        message = 'ATSRS_PARITY_MISMATCH:certificates_delete';
    end if;
    return;
  end if;

  if operation_key like '%\_personal\_profile' escape '\' then
    source_canonical := jsonb_build_object(
      'source_entity_id', (operation_value->>'atsrsId')::uuid,
      'first_name', btrim(operation_value->>'name'),
      'last_name', nullif(btrim(operation_value->>'surname'), ''),
      'position', nullif(btrim(operation_value->>'position'), ''),
      'company_name', nullif(btrim(operation_value->>'company'), ''),
      'phone', nullif(btrim(operation_value->>'phone'), ''),
      'whatsapp', nullif(btrim(operation_value->>'whatsapp'), ''),
      'nationality', nullif(btrim(operation_value->>'country'), ''),
      'phone_verified', coalesce((operation_value->>'phoneVerified')::boolean, false),
      'whatsapp_verified', coalesce((operation_value->>'whatsappVerified')::boolean, false),
      'metadata', operation_value - array[
        'atsrsId', 'name', 'surname', 'position', 'company', 'phone',
        'whatsapp', 'country', 'phoneVerified', 'whatsappVerified'
      ]::text[]
    );
    select jsonb_build_object(
      'source_entity_id', personnel.source_entity_id,
      'first_name', personnel.first_name,
      'last_name', personnel.last_name,
      'position', personnel.position,
      'company_name', personnel.company_name,
      'phone', personnel.phone,
      'whatsapp', personnel.whatsapp,
      'nationality', personnel.nationality,
      'phone_verified', personnel.phone_verified,
      'whatsapp_verified', personnel.whatsapp_verified,
      'metadata', personnel.metadata
    )
    into target_canonical
    from public.atsrs_workspace_personnel personnel
    where personnel.workspace_user_id = target_user_id
      and personnel.workspace_account_type = target_account_type
      and personnel.source_entity_id = (operation_value->>'atsrsId')::uuid;

  elsif operation_key like '%\_company\_personnel' escape '\' then
    select coalesce(jsonb_agg(canonical order by canonical->>'source_entity_id'), '[]'::jsonb)
    into source_canonical
    from (
      select jsonb_build_object(
        'source_entity_id', item->>'atsrsId',
        'linked_user_id', nullif(btrim(item->>'linkedUserId'), ''),
        'first_name', btrim(item->>'name'),
        'last_name', nullif(btrim(item->>'surname'), ''),
        'position', nullif(btrim(item->>'position'), ''),
        'company_name', nullif(btrim(item->>'company'), ''),
        'email', nullif(btrim(item->>'email'), ''),
        'phone', nullif(btrim(item->>'phone'), ''),
        'whatsapp', nullif(btrim(item->>'whatsapp'), ''),
        'nationality', coalesce(
          nullif(btrim(item->>'nationality'), ''),
          nullif(btrim(item->>'country'), '')
        ),
        'employee_id', nullif(btrim(item->>'employeeId'), ''),
        'source', nullif(btrim(item->>'source'), ''),
        'access_status', nullif(btrim(item->>'accessStatus'), ''),
        'linked_status', nullif(btrim(item->>'linkedStatus'), ''),
        'tracker_status', nullif(btrim(item->>'trackerStatus'), ''),
        'phone_verified', coalesce((item->>'phoneVerified')::boolean, false),
        'whatsapp_verified', coalesce((item->>'whatsappVerified')::boolean, false),
        'metadata', item - array[
          'atsrsId', 'atsrsProjectIds', 'linkedUserId', 'name', 'surname',
          'position', 'company', 'email', 'phone', 'whatsapp', 'nationality',
          'country', 'employeeId', 'source', 'accessStatus', 'linkedStatus',
          'trackerStatus', 'phoneVerified', 'whatsappVerified'
        ]::text[]
      ) canonical
      from jsonb_array_elements(operation_value) entry(item)
    ) source_rows;

    select coalesce(jsonb_agg(canonical order by canonical->>'source_entity_id'), '[]'::jsonb)
    into target_canonical
    from (
      select jsonb_build_object(
        'source_entity_id', personnel.source_entity_id::text,
        'linked_user_id', personnel.linked_user_id::text,
        'first_name', personnel.first_name,
        'last_name', personnel.last_name,
        'position', personnel.position,
        'company_name', personnel.company_name,
        'email', personnel.email,
        'phone', personnel.phone,
        'whatsapp', personnel.whatsapp,
        'nationality', personnel.nationality,
        'employee_id', personnel.employee_id,
        'source', personnel.source,
        'access_status', personnel.access_status,
        'linked_status', personnel.linked_status,
        'tracker_status', personnel.tracker_status,
        'phone_verified', personnel.phone_verified,
        'whatsapp_verified', personnel.whatsapp_verified,
        'metadata', personnel.metadata
      ) canonical
      from public.atsrs_workspace_personnel personnel
      where personnel.workspace_user_id = target_user_id
        and personnel.workspace_account_type = target_account_type
        and personnel.legacy_source_key like
          'workspace_data:' || operation_key || ':item:%'
    ) target_rows;

    if source_canonical = target_canonical then
      select coalesce(jsonb_agg(canonical order by canonical::text), '[]'::jsonb)
      into source_canonical
      from (
        select jsonb_build_object(
          'personnel_source_id', item->>'atsrsId',
          'project_source_id', project_id
        ) canonical
        from jsonb_array_elements(operation_value) entry(item)
        cross join lateral jsonb_array_elements_text(
          coalesce(item->'atsrsProjectIds', '[]'::jsonb)
        ) project(project_id)
      ) source_assignments;

      select coalesce(jsonb_agg(canonical order by canonical::text), '[]'::jsonb)
      into target_canonical
      from (
        select jsonb_build_object(
          'personnel_source_id', personnel.source_entity_id::text,
          'project_source_id', project.source_entity_id::text
        ) canonical
        from public.atsrs_project_personnel assignment
        join public.atsrs_workspace_personnel personnel
          on personnel.id = assignment.personnel_id
         and personnel.workspace_user_id = assignment.workspace_user_id
         and personnel.workspace_account_type = assignment.workspace_account_type
        join public.atsrs_workspace_projects project
          on project.id = assignment.project_id
         and project.workspace_user_id = assignment.workspace_user_id
         and project.workspace_account_type = assignment.workspace_account_type
        where assignment.workspace_user_id = target_user_id
          and assignment.workspace_account_type = target_account_type
          and assignment.legacy_source_key like
            'workspace_data:' || operation_key || ':personnel:%'
      ) target_assignments;
    end if;

  elsif operation_key like '%\_projects' escape '\' then
    select coalesce(jsonb_agg(canonical order by canonical->>'source_entity_id'), '[]'::jsonb)
    into source_canonical
    from (
      select jsonb_build_object(
        'source_entity_id', item->>'atsrsId',
        'project_name', btrim(item->>'project'),
        'vessel_name', nullif(btrim(item->>'vessel'), ''),
        'client_name', nullif(btrim(item->>'client'), ''),
        'team_name', nullif(btrim(item->>'team'), ''),
        'metadata', item - array['atsrsId', 'project', 'vessel', 'client', 'team']::text[]
      ) canonical
      from jsonb_array_elements(operation_value) entry(item)
    ) source_rows;
    select coalesce(jsonb_agg(canonical order by canonical->>'source_entity_id'), '[]'::jsonb)
    into target_canonical
    from (
      select jsonb_build_object(
        'source_entity_id', project.source_entity_id::text,
        'project_name', project.project_name,
        'vessel_name', project.vessel_name,
        'client_name', project.client_name,
        'team_name', project.team_name,
        'metadata', project.metadata
      ) canonical
      from public.atsrs_workspace_projects project
      where project.workspace_user_id = target_user_id
        and project.workspace_account_type = target_account_type
        and project.legacy_source_key like
          'workspace_data:' || operation_key || ':item:%'
    ) target_rows;

  elsif operation_key like '%\_certs' escape '\' then
    select count(*)
    into missing_file_count
    from jsonb_array_elements(operation_value) entry(item)
    where nullif(btrim(item->>'cloudFileId'), '') is not null
      and not exists (
        select 1
        from public.atsrs_files file_row
        where file_row.id = (item->>'cloudFileId')::uuid
          and file_row.user_id = target_user_id
          and file_row.account_type = target_account_type
          and file_row.file_name = item->>'fileName'
          and file_row.mime_type = item->>'mimeType'
          and file_row.size_bytes = (item->>'fileSize')::bigint
      );
    if missing_file_count > 0 then
      raise exception using errcode = 'P0001',
        message = 'ATSRS_FILE_OWNERSHIP_MISMATCH';
    end if;

    select coalesce(jsonb_agg(canonical order by canonical->>'source_entity_id'), '[]'::jsonb)
    into source_canonical
    from (
      select jsonb_build_object(
        'source_entity_id', item->>'atsrsId',
        'personnel_source_entity_id', item->>'atsrsPersonnelId',
        'file_id', nullif(btrim(item->>'cloudFileId'), ''),
        'certificate_type', btrim(item->>'type'),
        'provider_name', nullif(btrim(item->>'provider'), ''),
        'document_number', nullif(btrim(item->>'docNo'), ''),
        'issuing_country', nullif(btrim(item->>'country'), ''),
        'issue_date', case
          when nullif(btrim(item->>'issue'), '') is null
            or upper(btrim(item->>'issue')) in ('N/A', 'NA') then null
          else btrim(item->>'issue')
        end,
        'expiry_date', case
          when nullif(btrim(item->>'expiry'), '') is null
            or upper(btrim(item->>'expiry')) in ('N/A', 'NA') then null
          else btrim(item->>'expiry')
        end,
        'metadata', item - array[
          'atsrsId', 'atsrsPersonnelId', 'person', 'type', 'provider',
          'docNo', 'country', 'issue', 'expiry', 'cloudFileId', 'fileName',
          'mimeType', 'fileSize'
        ]::text[]
      ) canonical
      from jsonb_array_elements(operation_value) entry(item)
    ) source_rows;
    select coalesce(jsonb_agg(canonical order by canonical->>'source_entity_id'), '[]'::jsonb)
    into target_canonical
    from (
      select jsonb_build_object(
        'source_entity_id', certificate.source_entity_id::text,
        'personnel_source_entity_id', personnel.source_entity_id::text,
        'file_id', certificate.file_id::text,
        'certificate_type', certificate.certificate_type,
        'provider_name', certificate.provider_name,
        'document_number', certificate.document_number,
        'issuing_country', certificate.issuing_country,
        'issue_date', certificate.issue_date::text,
        'expiry_date', certificate.expiry_date::text,
        'metadata', certificate.metadata
      ) canonical
      from public.atsrs_personnel_certificates certificate
      join public.atsrs_workspace_personnel personnel
        on personnel.id = certificate.personnel_id
       and personnel.workspace_user_id = certificate.workspace_user_id
       and personnel.workspace_account_type = certificate.workspace_account_type
      where certificate.workspace_user_id = target_user_id
        and certificate.workspace_account_type = target_account_type
        and certificate.legacy_source_key like
          'workspace_data:' || operation_key || ':item:%'
    ) target_rows;
  end if;

  if source_canonical is distinct from target_canonical then
    raise exception using errcode = 'P0001',
      message = 'ATSRS_PARITY_MISMATCH:' ||
        case
          when operation_key like '%\_profile' escape '\' then 'profile'
          when operation_key like '%\_personnel' escape '\' then 'personnel'
          when operation_key like '%\_projects' escape '\' then 'projects'
          else 'certificates'
        end;
  end if;
end;
$function$;

revoke all on function atsrs_private.assert_workspace_operation_parity(
  uuid, text, jsonb
) from public, anon, authenticated, service_role;

create or replace function public.atsrs_apply_workspace_command(
  p_operation_id uuid,
  p_expected_revision bigint,
  p_account_type text,
  p_client_build text,
  p_operations jsonb,
  p_audit_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set lock_timeout = '3s'
set statement_timeout = '10s'
as $function$
declare
  actor_id uuid := (select auth.uid());
  current_revision bigint;
  committed_revision bigint;
  prior_request_hash text;
  prior_result jsonb;
  request_hash text;
  safe_audit jsonb;
  operation jsonb;
  operation_key text;
  operation_value jsonb;
  existing_payload jsonb;
  next_payload jsonb;
  changed_count integer := 0;
  entity_count integer := 0;
  now_value timestamptz := clock_timestamp();
  expected_prefix text;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'ATSRS_AUTH_REQUIRED';
  end if;
  if p_operation_id is null then
    raise exception using errcode = '22023', message = 'ATSRS_OPERATION_ID_REQUIRED';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception using errcode = '22023', message = 'ATSRS_INVALID_REVISION';
  end if;
  if p_account_type not in ('personal', 'company') then
    raise exception using errcode = '22023', message = 'ATSRS_INVALID_ACCOUNT_TYPE';
  end if;
  if p_client_build is null
     or p_client_build !~ '^[A-Za-z0-9._-]{1,32}$' then
    raise exception using errcode = '22023', message = 'ATSRS_INVALID_CLIENT_BUILD';
  end if;
  if jsonb_typeof(p_operations) <> 'array'
     or jsonb_array_length(p_operations) = 0
     or jsonb_array_length(p_operations) > 6 then
    raise exception using errcode = '22023', message = 'ATSRS_INVALID_OPERATIONS';
  end if;
  if jsonb_typeof(coalesce(p_audit_metadata, '{}'::jsonb)) <> 'object'
     or exists (
       select 1
       from jsonb_object_keys(
         coalesce(p_audit_metadata, '{}'::jsonb)
       ) key_name(value)
       where value not in ('channel', 'rollout_stage', 'client_instance_hash')
     ) then
    raise exception using errcode = '22023', message = 'ATSRS_INVALID_AUDIT_METADATA';
  end if;

  safe_audit := jsonb_strip_nulls(jsonb_build_object(
    'channel',
      case when length(p_audit_metadata->>'channel') <= 24
        then p_audit_metadata->>'channel' end,
    'rollout_stage',
      case when length(p_audit_metadata->>'rollout_stage') <= 24
        then p_audit_metadata->>'rollout_stage' end,
    'client_instance_hash',
      case when p_audit_metadata->>'client_instance_hash' ~ '^[0-9a-f]{16,64}$'
        then p_audit_metadata->>'client_instance_hash' end
  ));
  if safe_audit <> coalesce(p_audit_metadata, '{}'::jsonb) then
    raise exception using errcode = '22023', message = 'ATSRS_UNSAFE_AUDIT_METADATA';
  end if;

  if not exists (
    select 1
    from public.atsrs_workspaces workspace
    where workspace.user_id = actor_id
      and workspace.account_type = p_account_type
  ) then
    raise exception using errcode = '42501', message = 'ATSRS_WORKSPACE_FORBIDDEN';
  end if;

  insert into atsrs_private.workspace_write_revisions (
    workspace_user_id,
    workspace_account_type,
    revision
  )
  values (actor_id, p_account_type, 0)
  on conflict (workspace_user_id, workspace_account_type) do nothing;

  select state.revision
  into current_revision
  from atsrs_private.workspace_write_revisions state
  where state.workspace_user_id = actor_id
    and state.workspace_account_type = p_account_type
  for update;

  request_hash := encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'account_type', p_account_type,
          'expected_revision', p_expected_revision,
          'operations', p_operations
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  select command.request_hash, command.result
  into prior_request_hash, prior_result
  from atsrs_private.workspace_write_commands command
  where command.workspace_user_id = actor_id
    and command.workspace_account_type = p_account_type
    and command.operation_id = p_operation_id;

  if prior_request_hash is not null then
    if prior_request_hash <> request_hash then
      raise exception using errcode = 'P0001',
        message = 'ATSRS_IDEMPOTENCY_CONFLICT';
    end if;
    return prior_result;
  end if;

  if current_revision <> p_expected_revision then
    raise exception using errcode = '40001',
      message = 'ATSRS_STALE_REVISION',
      detail = jsonb_build_object('current_revision', current_revision)::text;
  end if;

  expected_prefix := 'atsrs_' || actor_id::text || '_' || p_account_type || '_';

  if exists (
    select 1
    from jsonb_array_elements(p_operations) entry(item)
    where jsonb_typeof(item) <> 'object'
       or nullif(item->>'data_key', '') is null
       or (
         coalesce((item->>'deleted')::boolean, false) = false
         and not (item ? 'value')
       )
       or item->>'data_key' not like expected_prefix || '%'
       or item->>'data_key' not in (
         expected_prefix || case when p_account_type = 'personal' then 'profile' else 'personnel' end,
         expected_prefix || 'certs',
         expected_prefix || 'projects'
       )
  ) then
    raise exception using errcode = '22023', message = 'ATSRS_INVALID_OPERATION_KEY';
  end if;

  if exists (
    select 1
    from (
      select item->>'data_key' key_name, count(*) row_count
      from jsonb_array_elements(p_operations) entry(item)
      group by item->>'data_key'
      having count(*) > 1
    ) duplicate_key
  ) then
    raise exception using errcode = '22023', message = 'ATSRS_DUPLICATE_OPERATION_KEY';
  end if;

  for operation in
    select item
    from jsonb_array_elements(p_operations) entry(item)
    where not coalesce((item->>'deleted')::boolean, false)
  loop
    operation_key := operation->>'data_key';
    operation_value := operation->'value';

    if operation_key like '%\_profile' escape '\' then
      if jsonb_typeof(operation_value) <> 'object'
         or nullif(operation_value->>'atsrsId', '') is null
         or not (operation_value->>'atsrsId' ~*
           '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
         or nullif(btrim(operation_value->>'name'), '') is null then
        raise exception using errcode = '22023',
          message = 'ATSRS_INVALID_PROFILE_GRAPH';
      end if;
    else
      if jsonb_typeof(operation_value) <> 'array'
         or exists (
           select 1
           from jsonb_array_elements(operation_value) row_value(item)
           where nullif(item->>'atsrsId', '') is null
              or not (item->>'atsrsId' ~*
                '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
         ) then
        raise exception using errcode = '22023',
          message = 'ATSRS_INVALID_STABLE_ID_GRAPH';
      end if;
    end if;

    if operation_key like '%\_personnel' escape '\'
       and exists (
         select 1
         from jsonb_array_elements(operation_value) row_value(item)
         where jsonb_typeof(item->'atsrsProjectIds') is distinct from 'array'
            or exists (
              select 1
              from jsonb_array_elements_text(item->'atsrsProjectIds') project_id
              where project_id !~*
                '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
            )
       ) then
      raise exception using errcode = '22023',
        message = 'ATSRS_INVALID_ASSIGNMENT_GRAPH';
    end if;

    if operation_key like '%\_certs' escape '\'
       and exists (
         select 1
         from jsonb_array_elements(operation_value) row_value(item)
         where nullif(item->>'atsrsPersonnelId', '') is null
            or not (item->>'atsrsPersonnelId' ~*
              '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
       ) then
      raise exception using errcode = '22023',
        message = 'ATSRS_INVALID_CERTIFICATE_OWNER_GRAPH';
    end if;
  end loop;

  -- Fixed graph order: projects, personnel/profile, certificates. Deletions
  -- happen in the reverse dependency order after all non-delete operations.
  for operation in
    select item
    from jsonb_array_elements(p_operations) entry(item)
    where not coalesce((item->>'deleted')::boolean, false)
    order by case
      when item->>'data_key' like '%\_projects' escape '\' then 10
      when item->>'data_key' like '%\_profile' escape '\'
        or item->>'data_key' like '%\_personnel' escape '\' then 20
      else 30
    end
  loop
    operation_key := operation->>'data_key';
    operation_value := operation->'value';
    select data.payload
    into existing_payload
    from public.atsrs_workspace_data data
    where data.user_id = actor_id
      and data.account_type = p_account_type
      and data.data_key = operation_key;

    if existing_payload is not null
       and coalesce((existing_payload->>'deleted')::boolean, false) = false
       and (existing_payload->>'value')::jsonb = operation_value then
      continue;
    end if;

    next_payload := (coalesce(existing_payload, '{}'::jsonb) - 'deleted')
      || jsonb_build_object('value', operation_value::text);
    perform set_config('atsrs.primary_write_managed', 'on', true);
    insert into public.atsrs_workspace_data (
      user_id, account_type, data_key, payload, updated_at
    )
    values (actor_id, p_account_type, operation_key, next_payload, now_value)
    on conflict (user_id, account_type, data_key)
    do update set payload = excluded.payload, updated_at = excluded.updated_at;
    changed_count := changed_count + 1;
    entity_count := entity_count + case
      when jsonb_typeof(operation_value) = 'array'
        then jsonb_array_length(operation_value)
      else 1
    end;
  end loop;

  for operation in
    select item
    from jsonb_array_elements(p_operations) entry(item)
    where coalesce((item->>'deleted')::boolean, false)
    order by case
      when item->>'data_key' like '%\_certs' escape '\' then 10
      when item->>'data_key' like '%\_profile' escape '\'
        or item->>'data_key' like '%\_personnel' escape '\' then 20
      else 30
    end
  loop
    operation_key := operation->>'data_key';
    select data.payload
    into existing_payload
    from public.atsrs_workspace_data data
    where data.user_id = actor_id
      and data.account_type = p_account_type
      and data.data_key = operation_key;

    if existing_payload is null
       or coalesce((existing_payload->>'deleted')::boolean, false) then
      continue;
    end if;

    next_payload := (existing_payload - 'value') ||
      jsonb_build_object('deleted', true);
    perform set_config('atsrs.primary_write_managed', 'on', true);
    update public.atsrs_workspace_data
    set payload = next_payload, updated_at = now_value
    where user_id = actor_id
      and public.atsrs_workspace_data.account_type = p_account_type
      and data_key = operation_key;
    changed_count := changed_count + 1;
  end loop;

  for operation in
    select item
    from jsonb_array_elements(p_operations) entry(item)
  loop
    perform atsrs_private.assert_workspace_operation_parity(
      actor_id, p_account_type, operation
    );
  end loop;

  committed_revision := current_revision +
    case when changed_count > 0 then 1 else 0 end;

  if changed_count > 0 then
    update atsrs_private.workspace_write_revisions state
    set revision = committed_revision,
        last_legacy_updated_at = now_value,
        updated_at = now_value
    where state.workspace_user_id = actor_id
      and state.workspace_account_type = p_account_type;
  end if;
  perform set_config('atsrs.primary_write_managed', 'off', true);

  prior_result := jsonb_build_object(
    'status', case when changed_count = 0 then 'no_op' else 'committed' end,
    'operation_id', p_operation_id,
    'workspace_account_type', p_account_type,
    'committed_revision', committed_revision,
    'changed_keys', changed_count,
    'entity_count', entity_count
  );

  insert into atsrs_private.workspace_write_commands (
    workspace_user_id,
    workspace_account_type,
    operation_id,
    request_hash,
    expected_revision,
    committed_revision,
    client_build,
    audit_metadata,
    result
  )
  values (
    actor_id,
    p_account_type,
    p_operation_id,
    request_hash,
    p_expected_revision,
    committed_revision,
    p_client_build,
    safe_audit,
    prior_result
  );

  return prior_result;
end;
$function$;

revoke all on function public.atsrs_apply_workspace_command(
  uuid, bigint, text, text, jsonb, jsonb
) from public, anon, service_role;
grant execute on function public.atsrs_apply_workspace_command(
  uuid, bigint, text, text, jsonb, jsonb
) to authenticated;

-- Explicitly preserve the browser read-only contract on normalized tables.
revoke insert, update, delete on table
  public.atsrs_workspace_projects,
  public.atsrs_workspace_personnel,
  public.atsrs_personnel_certificates,
  public.atsrs_project_personnel
from anon, authenticated;

commit;
