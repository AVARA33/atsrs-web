-- Keep the legacy workspace row and its normalized shadow in one transaction.
-- Read paths remain on public.atsrs_workspace_data.
begin;

create schema if not exists atsrs_private;
revoke all on schema atsrs_private from public, anon, authenticated;

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
begin
  source_row := case when tg_op = 'DELETE' then old else new end;
  source_prefix := 'workspace_data:' || source_row.data_key || ':item:';

  if source_row.data_key like '%\_personal\_profile' escape '\' then
    owner_legacy_key := 'workspace_data:' || source_row.data_key || ':owner';

    if tg_op = 'DELETE'
       or coalesce(source_row.payload->>'deleted', 'false') = 'true' then
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

    insert into public.atsrs_workspace_personnel (
      workspace_user_id,
      workspace_account_type,
      linked_user_id,
      first_name,
      last_name,
      position,
      company_name,
      email,
      phone,
      whatsapp,
      nationality,
      source,
      linked_status,
      phone_verified,
      whatsapp_verified,
      legacy_source_key,
      metadata,
      created_at,
      updated_at
    )
    values (
      source_row.user_id,
      source_row.account_type,
      source_row.user_id,
      btrim(decoded->>'name'),
      nullif(btrim(decoded->>'surname'), ''),
      nullif(btrim(decoded->>'position'), ''),
      nullif(btrim(decoded->>'company'), ''),
      (select nullif(btrim(email), '') from auth.users where id = source_row.user_id),
      nullif(btrim(decoded->>'phone'), ''),
      nullif(btrim(decoded->>'whatsapp'), ''),
      nullif(btrim(decoded->>'country'), ''),
      'workspace_data_personal_profile',
      'linked',
      coalesce((decoded->>'phoneVerified')::boolean, false),
      coalesce((decoded->>'whatsappVerified')::boolean, false),
      owner_legacy_key,
      decoded - array[
        'name', 'surname', 'position', 'company', 'phone', 'whatsapp',
        'country', 'phoneVerified', 'whatsappVerified'
      ]::text[],
      source_row.updated_at,
      source_row.updated_at
    )
    on conflict (workspace_user_id, workspace_account_type, legacy_source_key)
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
      metadata = excluded.metadata,
      updated_at = excluded.updated_at;

    return source_row;
  end if;

  if source_row.data_key like '%\_company\_personnel' escape '\' then
    if tg_op = 'DELETE'
       or coalesce(source_row.payload->>'deleted', 'false') = 'true' then
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

    insert into public.atsrs_workspace_personnel (
      workspace_user_id,
      workspace_account_type,
      linked_user_id,
      first_name,
      last_name,
      position,
      company_name,
      email,
      phone,
      whatsapp,
      nationality,
      employee_id,
      source,
      access_status,
      linked_status,
      tracker_status,
      phone_verified,
      whatsapp_verified,
      legacy_source_key,
      metadata,
      created_at,
      updated_at
    )
    select
      source_row.user_id,
      source_row.account_type,
      (nullif(btrim(item->>'linkedUserId'), ''))::uuid,
      btrim(item->>'name'),
      nullif(btrim(item->>'surname'), ''),
      nullif(btrim(item->>'position'), ''),
      nullif(btrim(item->>'company'), ''),
      nullif(btrim(item->>'email'), ''),
      nullif(btrim(item->>'phone'), ''),
      nullif(btrim(item->>'whatsapp'), ''),
      coalesce(
        nullif(btrim(item->>'nationality'), ''),
        nullif(btrim(item->>'country'), '')
      ),
      nullif(btrim(item->>'employeeId'), ''),
      nullif(btrim(item->>'source'), ''),
      nullif(btrim(item->>'accessStatus'), ''),
      nullif(btrim(item->>'linkedStatus'), ''),
      nullif(btrim(item->>'trackerStatus'), ''),
      coalesce((item->>'phoneVerified')::boolean, false),
      coalesce((item->>'whatsappVerified')::boolean, false),
      source_prefix || ordinality::text,
      item - array[
        'linkedUserId', 'name', 'surname', 'position', 'company', 'email',
        'phone', 'whatsapp', 'nationality', 'country', 'employeeId',
        'source', 'accessStatus', 'linkedStatus', 'trackerStatus',
        'phoneVerified', 'whatsappVerified'
      ]::text[],
      source_row.updated_at,
      source_row.updated_at
    from jsonb_array_elements(decoded) with ordinality as entry(item, ordinality)
    on conflict (workspace_user_id, workspace_account_type, legacy_source_key)
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
      metadata = excluded.metadata,
      updated_at = excluded.updated_at;

    delete from public.atsrs_workspace_personnel target
    where target.workspace_user_id = source_row.user_id
      and target.workspace_account_type = source_row.account_type
      and target.legacy_source_key like source_prefix || '%'
      and not exists (
        select 1
        from jsonb_array_elements(decoded) with ordinality as entry(item, ordinality)
        where target.legacy_source_key = source_prefix || entry.ordinality::text
      );

    return source_row;
  end if;

  if source_row.data_key like '%\_personal\_certs' escape '\' then
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
      raise exception 'personal certificates payload must be a JSON array';
    end if;
    owner_legacy_key := 'workspace_data:'
      || replace(source_row.data_key, '_personal_certs', '_personal_profile')
      || ':owner';

    if not exists (
      select 1
      from public.atsrs_workspace_personnel
      where workspace_user_id = source_row.user_id
        and workspace_account_type = source_row.account_type
        and legacy_source_key = owner_legacy_key
    ) then
      raise exception 'personal certificate owner is missing from normalized personnel';
    end if;

    insert into public.atsrs_personnel_certificates (
      workspace_user_id,
      workspace_account_type,
      personnel_id,
      file_id,
      certificate_type,
      provider_name,
      document_number,
      issuing_country,
      issue_date,
      expiry_date,
      legacy_source_key,
      metadata,
      created_at,
      updated_at
    )
    select
      source_row.user_id,
      source_row.account_type,
      personnel.id,
      file_row.id,
      btrim(item->>'type'),
      nullif(btrim(item->>'provider'), ''),
      nullif(btrim(item->>'docNo'), ''),
      nullif(btrim(item->>'country'), ''),
      case
        when nullif(btrim(item->>'issue'), '') is null
          or upper(btrim(item->>'issue')) in ('N/A', 'NA') then null
        else btrim(item->>'issue')::date
      end,
      case
        when nullif(btrim(item->>'expiry'), '') is null
          or upper(btrim(item->>'expiry')) in ('N/A', 'NA') then null
        else btrim(item->>'expiry')::date
      end,
      source_prefix || ordinality::text,
      item - array[
        'person', 'type', 'provider', 'docNo', 'country', 'issue', 'expiry',
        'cloudFileId', 'fileName', 'mimeType', 'fileSize'
      ]::text[],
      source_row.updated_at,
      source_row.updated_at
    from jsonb_array_elements(decoded) with ordinality as entry(item, ordinality)
    join public.atsrs_workspace_personnel personnel
      on personnel.workspace_user_id = source_row.user_id
     and personnel.workspace_account_type = source_row.account_type
     and personnel.legacy_source_key = owner_legacy_key
    left join public.atsrs_files file_row
      on nullif(btrim(item->>'cloudFileId'), '') is not null
     and file_row.id = (nullif(btrim(item->>'cloudFileId'), ''))::uuid
     and file_row.user_id = source_row.user_id
     and file_row.account_type = source_row.account_type
     and file_row.file_name = item->>'fileName'
     and file_row.mime_type = item->>'mimeType'
     and file_row.size_bytes = (item->>'fileSize')::bigint
    on conflict (workspace_user_id, workspace_account_type, legacy_source_key)
    do update set
      personnel_id = excluded.personnel_id,
      file_id = excluded.file_id,
      certificate_type = excluded.certificate_type,
      provider_name = excluded.provider_name,
      document_number = excluded.document_number,
      issuing_country = excluded.issuing_country,
      issue_date = excluded.issue_date,
      expiry_date = excluded.expiry_date,
      metadata = excluded.metadata,
      updated_at = excluded.updated_at;

    delete from public.atsrs_personnel_certificates target
    where target.workspace_user_id = source_row.user_id
      and target.workspace_account_type = source_row.account_type
      and target.legacy_source_key like source_prefix || '%'
      and not exists (
        select 1
        from jsonb_array_elements(decoded) with ordinality as entry(item, ordinality)
        where target.legacy_source_key = source_prefix || entry.ordinality::text
      );

    return source_row;
  end if;

  if source_row.data_key like '%\_projects' escape '\' then
    if tg_op = 'DELETE'
       or coalesce(source_row.payload->>'deleted', 'false') = 'true' then
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

    insert into public.atsrs_workspace_projects (
      workspace_user_id,
      workspace_account_type,
      project_name,
      vessel_name,
      client_name,
      team_name,
      legacy_source_key,
      metadata,
      created_at,
      updated_at
    )
    select
      source_row.user_id,
      source_row.account_type,
      btrim(item->>'project'),
      nullif(btrim(item->>'vessel'), ''),
      nullif(btrim(item->>'client'), ''),
      nullif(btrim(item->>'team'), ''),
      source_prefix || ordinality::text,
      item - array['project', 'vessel', 'client', 'team']::text[],
      source_row.updated_at,
      source_row.updated_at
    from jsonb_array_elements(decoded) with ordinality as entry(item, ordinality)
    on conflict (workspace_user_id, workspace_account_type, legacy_source_key)
    do update set
      project_name = excluded.project_name,
      vessel_name = excluded.vessel_name,
      client_name = excluded.client_name,
      team_name = excluded.team_name,
      metadata = excluded.metadata,
      updated_at = excluded.updated_at;

    delete from public.atsrs_workspace_projects target
    where target.workspace_user_id = source_row.user_id
      and target.workspace_account_type = source_row.account_type
      and target.legacy_source_key like source_prefix || '%'
      and not exists (
        select 1
        from jsonb_array_elements(decoded) with ordinality as entry(item, ordinality)
        where target.legacy_source_key = source_prefix || entry.ordinality::text
      );

    return source_row;
  end if;

  return source_row;
end;
$function$;

revoke all on function atsrs_private.sync_workspace_normalized_shadow()
  from public, anon, authenticated;

drop trigger if exists atsrs_workspace_data_normalized_shadow
  on public.atsrs_workspace_data;

create trigger atsrs_workspace_data_normalized_shadow
after insert or update or delete
on public.atsrs_workspace_data
for each row
execute function atsrs_private.sync_workspace_normalized_shadow();

-- Normalized tables are a shadow write target during this phase. Prevent
-- authenticated clients from bypassing the legacy source-of-truth write path.
revoke insert, update, delete
  on table public.atsrs_workspace_projects
  from authenticated;
revoke insert, update, delete
  on table public.atsrs_workspace_personnel
  from authenticated;
revoke insert, update, delete
  on table public.atsrs_personnel_certificates
  from authenticated;
revoke insert, update, delete
  on table public.atsrs_project_personnel
  from authenticated;

commit;
