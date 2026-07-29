-- Read-only canonical source/target verification. Run after the stable-ID
-- migration exists. A safe result has every *_match=true and every anomaly=0.
with
settings as (
  select '9fe1439e-5b5a-5c86-9d7c-28a67036e814'::uuid namespace_id
),
raw as (
  select d.user_id, d.account_type, d.data_key, (d.payload->>'value')::jsonb decoded
  from public.atsrs_workspace_data d
  where jsonb_typeof(d.payload->'value') = 'string'
),
personnel_source as (
  select
    coalesce(
      nullif(btrim(r.decoded->>'atsrsId'), '')::uuid,
      extensions.uuid_generate_v5(s.namespace_id, 'workspace_data:' || r.data_key || ':owner')
    ) source_entity_id,
    jsonb_build_object(
      'workspace_user_id', r.user_id,
      'workspace_account_type', r.account_type,
      'linked_user_id', r.user_id,
      'first_name', btrim(r.decoded->>'name'),
      'last_name', nullif(btrim(r.decoded->>'surname'), ''),
      'position', nullif(btrim(r.decoded->>'position'), ''),
      'company_name', nullif(btrim(r.decoded->>'company'), ''),
      'email', nullif(btrim(u.email), ''),
      'phone', nullif(btrim(r.decoded->>'phone'), ''),
      'whatsapp', nullif(btrim(r.decoded->>'whatsapp'), ''),
      'nationality', nullif(btrim(r.decoded->>'country'), ''),
      'employee_id', null,
      'source', 'workspace_data_personal_profile',
      'access_status', null,
      'linked_status', 'linked',
      'tracker_status', null,
      'phone_verified', coalesce((r.decoded->>'phoneVerified')::boolean, false),
      'whatsapp_verified', coalesce((r.decoded->>'whatsappVerified')::boolean, false),
      'metadata', r.decoded - array[
        'atsrsId', 'name', 'surname', 'position', 'company', 'phone',
        'whatsapp', 'country', 'phoneVerified', 'whatsappVerified'
      ]::text[]
    ) canonical
  from raw r
  join auth.users u on u.id = r.user_id
  cross join settings s
  where r.data_key like '%\_personal\_profile' escape '\'

  union all

  select
    coalesce(
      nullif(btrim(e.item->>'atsrsId'), '')::uuid,
      extensions.uuid_generate_v5(
        s.namespace_id,
        'workspace_data:' || r.data_key || ':item:' || e.ordinality::text
      )
    ),
    jsonb_build_object(
      'workspace_user_id', r.user_id,
      'workspace_account_type', r.account_type,
      'linked_user_id', nullif(btrim(e.item->>'linkedUserId'), '')::uuid,
      'first_name', btrim(e.item->>'name'),
      'last_name', nullif(btrim(e.item->>'surname'), ''),
      'position', nullif(btrim(e.item->>'position'), ''),
      'company_name', nullif(btrim(e.item->>'company'), ''),
      'email', nullif(btrim(e.item->>'email'), ''),
      'phone', nullif(btrim(e.item->>'phone'), ''),
      'whatsapp', nullif(btrim(e.item->>'whatsapp'), ''),
      'nationality', coalesce(
        nullif(btrim(e.item->>'nationality'), ''),
        nullif(btrim(e.item->>'country'), '')
      ),
      'employee_id', nullif(btrim(e.item->>'employeeId'), ''),
      'source', nullif(btrim(e.item->>'source'), ''),
      'access_status', nullif(btrim(e.item->>'accessStatus'), ''),
      'linked_status', nullif(btrim(e.item->>'linkedStatus'), ''),
      'tracker_status', nullif(btrim(e.item->>'trackerStatus'), ''),
      'phone_verified', coalesce((e.item->>'phoneVerified')::boolean, false),
      'whatsapp_verified', coalesce((e.item->>'whatsappVerified')::boolean, false),
      'metadata', e.item - array[
        'atsrsId', 'atsrsProjectIds', 'linkedUserId', 'name', 'surname',
        'position', 'company', 'email', 'phone', 'whatsapp', 'nationality',
        'country', 'employeeId', 'source', 'accessStatus', 'linkedStatus',
        'trackerStatus', 'phoneVerified', 'whatsappVerified'
      ]::text[]
    )
  from raw r
  cross join lateral jsonb_array_elements(r.decoded)
    with ordinality as e(item, ordinality)
  cross join settings s
  where r.data_key like '%\_company\_personnel' escape '\'
),
personnel_target as (
  select
    p.source_entity_id,
    jsonb_build_object(
      'workspace_user_id', p.workspace_user_id,
      'workspace_account_type', p.workspace_account_type,
      'linked_user_id', p.linked_user_id,
      'first_name', p.first_name,
      'last_name', p.last_name,
      'position', p.position,
      'company_name', p.company_name,
      'email', p.email,
      'phone', p.phone,
      'whatsapp', p.whatsapp,
      'nationality', p.nationality,
      'employee_id', p.employee_id,
      'source', p.source,
      'access_status', p.access_status,
      'linked_status', p.linked_status,
      'tracker_status', p.tracker_status,
      'phone_verified', p.phone_verified,
      'whatsapp_verified', p.whatsapp_verified,
      'metadata', p.metadata
    ) canonical
  from public.atsrs_workspace_personnel p
),
project_source as (
  select
    coalesce(
      nullif(btrim(e.item->>'atsrsId'), '')::uuid,
      extensions.uuid_generate_v5(
        s.namespace_id,
        'workspace_data:' || r.data_key || ':item:' || e.ordinality::text
      )
    ) source_entity_id,
    jsonb_build_object(
      'workspace_user_id', r.user_id,
      'workspace_account_type', r.account_type,
      'project_name', btrim(e.item->>'project'),
      'vessel_name', nullif(btrim(e.item->>'vessel'), ''),
      'client_name', nullif(btrim(e.item->>'client'), ''),
      'team_name', nullif(btrim(e.item->>'team'), ''),
      'metadata', e.item - array['atsrsId', 'project', 'vessel', 'client', 'team']::text[]
    ) canonical
  from raw r
  cross join lateral jsonb_array_elements(r.decoded)
    with ordinality as e(item, ordinality)
  cross join settings s
  where r.data_key like '%\_projects' escape '\'
),
project_target as (
  select
    p.source_entity_id,
    jsonb_build_object(
      'workspace_user_id', p.workspace_user_id,
      'workspace_account_type', p.workspace_account_type,
      'project_name', p.project_name,
      'vessel_name', p.vessel_name,
      'client_name', p.client_name,
      'team_name', p.team_name,
      'metadata', p.metadata
    ) canonical
  from public.atsrs_workspace_projects p
),
certificate_source as (
  select
    coalesce(
      nullif(btrim(e.item->>'atsrsId'), '')::uuid,
      extensions.uuid_generate_v5(
        s.namespace_id,
        'workspace_data:' || r.data_key || ':item:' || e.ordinality::text
      )
    ) source_entity_id,
    jsonb_build_object(
      'workspace_user_id', r.user_id,
      'workspace_account_type', r.account_type,
      'personnel_source_entity_id',
        case
          when r.data_key like '%\_personal\_certs' escape '\' then
            coalesce(
              nullif(btrim(e.item->>'atsrsPersonnelId'), '')::uuid,
              extensions.uuid_generate_v5(
                s.namespace_id,
                'workspace_data:' ||
                  replace(r.data_key, '_personal_certs', '_personal_profile') ||
                  ':owner'
              )
            )
          else nullif(btrim(e.item->>'atsrsPersonnelId'), '')::uuid
        end,
      'file_id', f.id,
      'certificate_type', btrim(e.item->>'type'),
      'provider_name', nullif(btrim(e.item->>'provider'), ''),
      'document_number', nullif(btrim(e.item->>'docNo'), ''),
      'issuing_country', nullif(btrim(e.item->>'country'), ''),
      'issue_date',
        case
          when nullif(btrim(e.item->>'issue'), '') is null
            or upper(btrim(e.item->>'issue')) in ('N/A', 'NA') then null
          else btrim(e.item->>'issue')::date
        end,
      'expiry_date',
        case
          when nullif(btrim(e.item->>'expiry'), '') is null
            or upper(btrim(e.item->>'expiry')) in ('N/A', 'NA') then null
          else btrim(e.item->>'expiry')::date
        end,
      'metadata', e.item - array[
        'atsrsId', 'atsrsPersonnelId', 'person', 'type', 'provider', 'docNo',
        'country', 'issue', 'expiry', 'cloudFileId', 'fileName', 'mimeType', 'fileSize'
      ]::text[]
    ) canonical
  from raw r
  cross join lateral jsonb_array_elements(r.decoded)
    with ordinality as e(item, ordinality)
  cross join settings s
  left join public.atsrs_files f
    on nullif(btrim(e.item->>'cloudFileId'), '') is not null
   and f.id = nullif(btrim(e.item->>'cloudFileId'), '')::uuid
   and f.user_id = r.user_id
   and f.account_type = r.account_type
   and f.file_name = e.item->>'fileName'
   and f.mime_type = e.item->>'mimeType'
   and f.size_bytes = (e.item->>'fileSize')::bigint
  where r.data_key like '%\_personal\_certs' escape '\'
     or r.data_key like '%\_company\_certs' escape '\'
),
certificate_target as (
  select
    c.source_entity_id,
    jsonb_build_object(
      'workspace_user_id', c.workspace_user_id,
      'workspace_account_type', c.workspace_account_type,
      'personnel_source_entity_id', p.source_entity_id,
      'file_id', c.file_id,
      'certificate_type', c.certificate_type,
      'provider_name', c.provider_name,
      'document_number', c.document_number,
      'issuing_country', c.issuing_country,
      'issue_date', c.issue_date,
      'expiry_date', c.expiry_date,
      'metadata', c.metadata
    ) canonical
  from public.atsrs_personnel_certificates c
  join public.atsrs_workspace_personnel p
    on p.id = c.personnel_id
   and p.workspace_user_id = c.workspace_user_id
   and p.workspace_account_type = c.workspace_account_type
),
assignment_source as (
  select
    extensions.uuid_generate_v5(
      s.namespace_id,
      personnel.source_entity_id::text || ':' || project_ref.project_id
    ) source_entity_id,
    jsonb_build_object(
      'workspace_user_id', r.user_id,
      'workspace_account_type', r.account_type,
      'personnel_source_entity_id', personnel.source_entity_id,
      'project_source_entity_id', project_ref.project_id::uuid
    ) canonical
  from raw r
  cross join lateral jsonb_array_elements(r.decoded)
    with ordinality as e(item, ordinality)
  cross join lateral jsonb_array_elements_text(
    coalesce(e.item->'atsrsProjectIds', '[]'::jsonb)
  ) project_ref(project_id)
  cross join settings s
  join personnel_source personnel
    on personnel.source_entity_id = coalesce(
      nullif(btrim(e.item->>'atsrsId'), '')::uuid,
      extensions.uuid_generate_v5(
        s.namespace_id,
        'workspace_data:' || r.data_key || ':item:' || e.ordinality::text
      )
    )
  where r.data_key like '%\_company\_personnel' escape '\'
),
assignment_target as (
  select
    a.source_entity_id,
    jsonb_build_object(
      'workspace_user_id', a.workspace_user_id,
      'workspace_account_type', a.workspace_account_type,
      'personnel_source_entity_id', p.source_entity_id,
      'project_source_entity_id', j.source_entity_id
    ) canonical
  from public.atsrs_project_personnel a
  join public.atsrs_workspace_personnel p on p.id = a.personnel_id
  join public.atsrs_workspace_projects j on j.id = a.project_id
)
select jsonb_build_object(
  'personnel_source_count', (select count(*) from personnel_source),
  'personnel_target_count', (select count(*) from personnel_target),
  'personnel_source_md5', (select md5(coalesce(jsonb_agg(canonical order by source_entity_id)::text, '[]')) from personnel_source),
  'personnel_target_md5', (select md5(coalesce(jsonb_agg(canonical order by source_entity_id)::text, '[]')) from personnel_target),
  'personnel_match', (
    select count(*) from personnel_source
  ) = (
    select count(*) from personnel_target
  ) and (
    select md5(coalesce(jsonb_agg(canonical order by source_entity_id)::text, '[]')) from personnel_source
  ) = (
    select md5(coalesce(jsonb_agg(canonical order by source_entity_id)::text, '[]')) from personnel_target
  ),
  'certificate_source_count', (select count(*) from certificate_source),
  'certificate_target_count', (select count(*) from certificate_target),
  'certificate_match', (
    select count(*) from certificate_source
  ) = (
    select count(*) from certificate_target
  ) and (
    select md5(coalesce(jsonb_agg(canonical order by source_entity_id)::text, '[]')) from certificate_source
  ) = (
    select md5(coalesce(jsonb_agg(canonical order by source_entity_id)::text, '[]')) from certificate_target
  ),
  'project_source_count', (select count(*) from project_source),
  'project_target_count', (select count(*) from project_target),
  'project_match', (
    select count(*) from project_source
  ) = (
    select count(*) from project_target
  ) and (
    select md5(coalesce(jsonb_agg(canonical order by source_entity_id)::text, '[]')) from project_source
  ) = (
    select md5(coalesce(jsonb_agg(canonical order by source_entity_id)::text, '[]')) from project_target
  ),
  'assignment_source_count', (select count(*) from assignment_source),
  'assignment_target_count', (select count(*) from assignment_target),
  'assignment_match', (
    select count(*) from assignment_source
  ) = (
    select count(*) from assignment_target
  ) and (
    select md5(coalesce(jsonb_agg(canonical order by source_entity_id)::text, '[]')) from assignment_source
  ) = (
    select md5(coalesce(jsonb_agg(canonical order by source_entity_id)::text, '[]')) from assignment_target
  ),
  'duplicate_source_entity_ids', (
    select count(*) from (
      select workspace_user_id, workspace_account_type, source_entity_id
      from public.atsrs_workspace_personnel group by 1, 2, 3 having count(*) > 1
      union all
      select workspace_user_id, workspace_account_type, source_entity_id
      from public.atsrs_workspace_projects group by 1, 2, 3 having count(*) > 1
      union all
      select workspace_user_id, workspace_account_type, source_entity_id
      from public.atsrs_personnel_certificates group by 1, 2, 3 having count(*) > 1
      union all
      select workspace_user_id, workspace_account_type, source_entity_id
      from public.atsrs_project_personnel group by 1, 2, 3 having count(*) > 1
    ) duplicates
  ),
  'certificate_orphans', (
    select count(*)
    from public.atsrs_personnel_certificates c
    left join public.atsrs_workspace_personnel p
      on p.id = c.personnel_id
     and p.workspace_user_id = c.workspace_user_id
     and p.workspace_account_type = c.workspace_account_type
    where p.id is null
  ),
  'assignment_orphans', (
    select count(*)
    from public.atsrs_project_personnel a
    left join public.atsrs_workspace_personnel p
      on p.id = a.personnel_id
     and p.workspace_user_id = a.workspace_user_id
     and p.workspace_account_type = a.workspace_account_type
    left join public.atsrs_workspace_projects j
      on j.id = a.project_id
     and j.workspace_user_id = a.workspace_user_id
     and j.workspace_account_type = a.workspace_account_type
    where p.id is null or j.id is null
  ),
  'stable_ids_required', (
    select enabled
    from atsrs_private.runtime_flags
    where flag_name = 'stable_ids_required'
  )
)::text as stable_id_verification;
