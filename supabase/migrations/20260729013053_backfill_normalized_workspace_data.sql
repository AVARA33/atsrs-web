-- Copy the validated legacy workspace snapshot into the normalized tables.
-- The application continues to read and write public.atsrs_workspace_data.
begin;

do $preflight$
declare
  source_rows bigint;
  source_snapshot_md5 text;
  target_rows bigint;
begin
  select
    count(*),
    md5(coalesce(
      jsonb_agg(to_jsonb(d) order by d.user_id, d.account_type, d.data_key)::text,
      '[]'
    ))
  into source_rows, source_snapshot_md5
  from public.atsrs_workspace_data d;

  if source_rows <> 17
     or source_snapshot_md5 <> '986a09c1becdfcf148f83a668338bd58' then
    raise exception
      'atsrs_workspace_data changed after validation; expected 17 rows and snapshot 986a09c1becdfcf148f83a668338bd58';
  end if;

  select
    (select count(*) from public.atsrs_workspace_projects)
    + (select count(*) from public.atsrs_workspace_personnel)
    + (select count(*) from public.atsrs_personnel_certificates)
    + (select count(*) from public.atsrs_project_personnel)
  into target_rows;

  if target_rows <> 0 then
    raise exception 'normalized target tables are not empty';
  end if;
end
$preflight$;

-- 1. Projects. The validated legacy snapshot contains no project collection,
-- so this statement intentionally inserts zero rows while preserving order.
with raw as (
  select
    d.user_id,
    d.account_type,
    d.data_key,
    d.updated_at,
    (d.payload->>'value')::jsonb as decoded
  from public.atsrs_workspace_data d
  where d.data_key like '%\_projects' escape '\'
),
project_source as (
  select
    r.user_id as workspace_user_id,
    r.account_type as workspace_account_type,
    nullif(btrim(e.item->>'project'), '') as project_name,
    nullif(btrim(e.item->>'vessel'), '') as vessel_name,
    nullif(btrim(e.item->>'client'), '') as client_name,
    nullif(btrim(e.item->>'team'), '') as team_name,
    'workspace_data:' || r.data_key || ':item:' || e.ordinality::text
      as legacy_source_key,
    e.item - array['project', 'vessel', 'client', 'team']::text[] as metadata,
    r.updated_at
  from raw r
  cross join lateral jsonb_array_elements(r.decoded)
    with ordinality as e(item, ordinality)
)
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
  workspace_user_id,
  workspace_account_type,
  project_name,
  vessel_name,
  client_name,
  team_name,
  legacy_source_key,
  metadata,
  updated_at,
  updated_at
from project_source
where project_name is not null
on conflict (workspace_user_id, workspace_account_type, legacy_source_key)
do nothing;

-- 2. Personnel: personal workspace owners plus corporate personnel records.
with raw as (
  select
    d.user_id,
    d.account_type,
    d.data_key,
    d.updated_at,
    (d.payload->>'value')::jsonb as decoded
  from public.atsrs_workspace_data d
  where d.data_key like '%\_personal\_profile' escape '\'
     or d.data_key like '%\_company\_personnel' escape '\'
),
personal_profiles as (
  select
    r.user_id as workspace_user_id,
    r.account_type as workspace_account_type,
    r.user_id as linked_user_id,
    btrim(r.decoded->>'name') as first_name,
    nullif(btrim(r.decoded->>'surname'), '') as last_name,
    nullif(btrim(r.decoded->>'position'), '') as position,
    nullif(btrim(r.decoded->>'company'), '') as company_name,
    nullif(btrim(u.email), '') as email,
    nullif(btrim(r.decoded->>'phone'), '') as phone,
    nullif(btrim(r.decoded->>'whatsapp'), '') as whatsapp,
    nullif(btrim(r.decoded->>'country'), '') as nationality,
    null::text as employee_id,
    'workspace_data_personal_profile'::text as source,
    null::text as access_status,
    'linked'::text as linked_status,
    null::text as tracker_status,
    coalesce((r.decoded->>'phoneVerified')::boolean, false) as phone_verified,
    coalesce((r.decoded->>'whatsappVerified')::boolean, false)
      as whatsapp_verified,
    'workspace_data:' || r.data_key || ':owner' as legacy_source_key,
    r.decoded - array[
      'name', 'surname', 'position', 'company', 'phone', 'whatsapp',
      'country', 'phoneVerified', 'whatsappVerified'
    ]::text[] as metadata,
    r.updated_at
  from raw r
  join auth.users u on u.id = r.user_id
  where r.data_key like '%\_personal\_profile' escape '\'
),
company_personnel as (
  select
    r.user_id as workspace_user_id,
    r.account_type as workspace_account_type,
    (nullif(btrim(e.item->>'linkedUserId'), ''))::uuid as linked_user_id,
    btrim(e.item->>'name') as first_name,
    nullif(btrim(e.item->>'surname'), '') as last_name,
    nullif(btrim(e.item->>'position'), '') as position,
    nullif(btrim(e.item->>'company'), '') as company_name,
    nullif(btrim(e.item->>'email'), '') as email,
    nullif(btrim(e.item->>'phone'), '') as phone,
    nullif(btrim(e.item->>'whatsapp'), '') as whatsapp,
    coalesce(
      nullif(btrim(e.item->>'nationality'), ''),
      nullif(btrim(e.item->>'country'), '')
    ) as nationality,
    nullif(btrim(e.item->>'employeeId'), '') as employee_id,
    nullif(btrim(e.item->>'source'), '') as source,
    nullif(btrim(e.item->>'accessStatus'), '') as access_status,
    nullif(btrim(e.item->>'linkedStatus'), '') as linked_status,
    nullif(btrim(e.item->>'trackerStatus'), '') as tracker_status,
    coalesce((e.item->>'phoneVerified')::boolean, false) as phone_verified,
    coalesce((e.item->>'whatsappVerified')::boolean, false)
      as whatsapp_verified,
    'workspace_data:' || r.data_key || ':item:' || e.ordinality::text
      as legacy_source_key,
    e.item - array[
      'linkedUserId', 'name', 'surname', 'position', 'company', 'email',
      'phone', 'whatsapp', 'nationality', 'country', 'employeeId',
      'source', 'accessStatus', 'linkedStatus', 'trackerStatus',
      'phoneVerified', 'whatsappVerified'
    ]::text[] as metadata,
    r.updated_at
  from raw r
  cross join lateral jsonb_array_elements(r.decoded)
    with ordinality as e(item, ordinality)
  where r.data_key like '%\_company\_personnel' escape '\'
),
personnel_source as (
  select * from personal_profiles
  union all
  select * from company_personnel
)
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
  updated_at,
  updated_at
from personnel_source
on conflict (workspace_user_id, workspace_account_type, legacy_source_key)
do nothing;

-- 3. Certificates. A file is linked only after exact ID, workspace and
-- file metadata validation performed against the frozen source snapshot.
with raw as (
  select
    d.user_id,
    d.account_type,
    d.data_key,
    d.updated_at,
    (d.payload->>'value')::jsonb as decoded
  from public.atsrs_workspace_data d
  where d.data_key like '%\_personal\_certs' escape '\'
),
certificate_source as (
  select
    r.user_id as workspace_user_id,
    r.account_type as workspace_account_type,
    p.id as personnel_id,
    f.id as file_id,
    btrim(e.item->>'type') as certificate_type,
    nullif(btrim(e.item->>'provider'), '') as provider_name,
    nullif(btrim(e.item->>'docNo'), '') as document_number,
    nullif(btrim(e.item->>'country'), '') as issuing_country,
    case
      when nullif(btrim(e.item->>'issue'), '') is null
        or upper(btrim(e.item->>'issue')) in ('N/A', 'NA') then null
      else (btrim(e.item->>'issue'))::date
    end as issue_date,
    case
      when nullif(btrim(e.item->>'expiry'), '') is null
        or upper(btrim(e.item->>'expiry')) in ('N/A', 'NA') then null
      else (btrim(e.item->>'expiry'))::date
    end as expiry_date,
    'workspace_data:' || r.data_key || ':item:' || e.ordinality::text
      as legacy_source_key,
    e.item - array[
      'person', 'type', 'provider', 'docNo', 'country', 'issue', 'expiry',
      'cloudFileId', 'fileName', 'mimeType', 'fileSize'
    ]::text[] as metadata,
    r.updated_at
  from raw r
  cross join lateral jsonb_array_elements(r.decoded)
    with ordinality as e(item, ordinality)
  join public.atsrs_workspace_personnel p
    on p.workspace_user_id = r.user_id
   and p.workspace_account_type = r.account_type
   and p.legacy_source_key = 'workspace_data:'
     || replace(r.data_key, '_personal_certs', '_personal_profile')
     || ':owner'
  left join public.atsrs_files f
    on nullif(btrim(e.item->>'cloudFileId'), '') is not null
   and f.id = (nullif(btrim(e.item->>'cloudFileId'), ''))::uuid
   and f.user_id = r.user_id
   and f.account_type = r.account_type
   and f.file_name = e.item->>'fileName'
   and f.mime_type = e.item->>'mimeType'
   and f.size_bytes = (e.item->>'fileSize')::bigint
)
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
  updated_at,
  updated_at
from certificate_source
on conflict (workspace_user_id, workspace_account_type, legacy_source_key)
do nothing;

-- 4. Personnel-project assignments. No assignment is present in the validated
-- source snapshot, so this remains an idempotent zero-row insert.
insert into public.atsrs_project_personnel (
  workspace_user_id,
  workspace_account_type,
  project_id,
  personnel_id,
  legacy_source_key
)
select
  project.workspace_user_id,
  project.workspace_account_type,
  project.id,
  personnel.id,
  'workspace_data:unreachable_assignment'
from public.atsrs_workspace_projects project
join public.atsrs_workspace_personnel personnel
  on false
on conflict (workspace_user_id, workspace_account_type, legacy_source_key)
do nothing;

do $postflight$
begin
  if (select count(*) from public.atsrs_workspace_projects) <> 0 then
    raise exception 'project source/target count mismatch';
  end if;
  if (select count(*) from public.atsrs_workspace_personnel) <> 4 then
    raise exception 'personnel source/target count mismatch';
  end if;
  if (select count(*) from public.atsrs_personnel_certificates) <> 25 then
    raise exception 'certificate source/target count mismatch';
  end if;
  if (select count(*) from public.atsrs_project_personnel) <> 0 then
    raise exception 'assignment source/target count mismatch';
  end if;
end
$postflight$;

commit;

;
