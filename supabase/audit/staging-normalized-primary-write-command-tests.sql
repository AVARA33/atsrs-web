-- STAGING ONLY. Every synthetic row and command result is rolled back.
begin;

do $guard$
begin
  if current_database() is null then
    raise exception 'database target is not available';
  end if;
  if exists (
    select 1
    from atsrs_private.runtime_flags
    where flag_name = 'stable_ids_required'
      and enabled
  ) then
    raise exception 'stable_ids_required must remain false';
  end if;
end;
$guard$;

create temporary table stage19_before as
select
  (select count(*) from public.atsrs_workspace_data) workspace_data,
  (select count(*) from public.atsrs_workspace_personnel) personnel,
  (select count(*) from public.atsrs_personnel_certificates) certificates,
  (select count(*) from public.atsrs_workspace_projects) projects,
  (select count(*) from public.atsrs_project_personnel) assignments;

insert into auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values (
  '11111111-1111-4111-8111-111111111119'::uuid,
  'authenticated',
  'authenticated',
  'stage19-synthetic@example.invalid',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

insert into public.atsrs_workspaces (user_id, account_type)
values
  ('11111111-1111-4111-8111-111111111119'::uuid, 'personal'),
  ('11111111-1111-4111-8111-111111111119'::uuid, 'company');

insert into public.atsrs_files (
  id, user_id, account_type, category, file_name, mime_type, size_bytes,
  storage_path
)
values (
  '11111111-1111-4111-8111-111111111519'::uuid,
  '11111111-1111-4111-8111-111111111119'::uuid,
  'company',
  'certificate',
  'stage19-synthetic.pdf',
  'application/pdf',
  128,
  'stage19/synthetic/not-uploaded'
);

select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111119',
  true
);

create temporary table stage19_results (
  step text primary key,
  result jsonb not null
);

insert into stage19_results
select 'create', public.atsrs_apply_workspace_command(
  '11111111-1111-4111-8111-111111111619'::uuid,
  0,
  'company',
  'V400-stage19',
  jsonb_build_array(
    jsonb_build_object(
      'data_key',
        'atsrs_11111111-1111-4111-8111-111111111119_company_projects',
      'value',
        jsonb_build_array(jsonb_build_object(
          'atsrsId', '11111111-1111-4111-8111-111111111219',
          'project', 'Synthetic project',
          'vessel', 'Synthetic vessel'
        ))
    ),
    jsonb_build_object(
      'data_key',
        'atsrs_11111111-1111-4111-8111-111111111119_company_personnel',
      'value',
        jsonb_build_array(jsonb_build_object(
          'atsrsId', '11111111-1111-4111-8111-111111111319',
          'atsrsProjectIds',
            jsonb_build_array('11111111-1111-4111-8111-111111111219'),
          'name', 'Synthetic',
          'surname', 'Tester'
        ))
    ),
    jsonb_build_object(
      'data_key',
        'atsrs_11111111-1111-4111-8111-111111111119_company_certs',
      'value',
        jsonb_build_array(jsonb_build_object(
          'atsrsId', '11111111-1111-4111-8111-111111111419',
          'atsrsPersonnelId', '11111111-1111-4111-8111-111111111319',
          'cloudFileId', '11111111-1111-4111-8111-111111111519',
          'fileName', 'stage19-synthetic.pdf',
          'mimeType', 'application/pdf',
          'fileSize', 128,
          'type', 'Synthetic certificate'
        ))
    )
  ),
  jsonb_build_object(
    'channel', 'staging_sql',
    'rollout_stage', 'synthetic',
    'client_instance_hash', repeat('a', 32)
  )
);

insert into stage19_results
select 'duplicate', public.atsrs_apply_workspace_command(
  '11111111-1111-4111-8111-111111111619'::uuid,
  0,
  'company',
  'V400-stage19',
  jsonb_build_array(
    jsonb_build_object(
      'data_key',
        'atsrs_11111111-1111-4111-8111-111111111119_company_projects',
      'value',
        jsonb_build_array(jsonb_build_object(
          'atsrsId', '11111111-1111-4111-8111-111111111219',
          'project', 'Synthetic project',
          'vessel', 'Synthetic vessel'
        ))
    ),
    jsonb_build_object(
      'data_key',
        'atsrs_11111111-1111-4111-8111-111111111119_company_personnel',
      'value',
        jsonb_build_array(jsonb_build_object(
          'atsrsId', '11111111-1111-4111-8111-111111111319',
          'atsrsProjectIds',
            jsonb_build_array('11111111-1111-4111-8111-111111111219'),
          'name', 'Synthetic',
          'surname', 'Tester'
        ))
    ),
    jsonb_build_object(
      'data_key',
        'atsrs_11111111-1111-4111-8111-111111111119_company_certs',
      'value',
        jsonb_build_array(jsonb_build_object(
          'atsrsId', '11111111-1111-4111-8111-111111111419',
          'atsrsPersonnelId', '11111111-1111-4111-8111-111111111319',
          'cloudFileId', '11111111-1111-4111-8111-111111111519',
          'fileName', 'stage19-synthetic.pdf',
          'mimeType', 'application/pdf',
          'fileSize', 128,
          'type', 'Synthetic certificate'
        ))
    )
  ),
  jsonb_build_object(
    'channel', 'staging_sql',
    'rollout_stage', 'synthetic',
    'client_instance_hash', repeat('a', 32)
  )
);

insert into stage19_results
select 'no_op', public.atsrs_apply_workspace_command(
  '11111111-1111-4111-8111-111111111629'::uuid,
  1,
  'company',
  'V400-stage19',
  jsonb_build_array(
    jsonb_build_object(
      'data_key',
        'atsrs_11111111-1111-4111-8111-111111111119_company_projects',
      'value',
        jsonb_build_array(jsonb_build_object(
          'atsrsId', '11111111-1111-4111-8111-111111111219',
          'project', 'Synthetic project',
          'vessel', 'Synthetic vessel'
        ))
    )
  ),
  '{"channel":"staging_sql","rollout_stage":"synthetic"}'::jsonb
);

do $negative_tests$
declare
  rejected boolean;
begin
  rejected := false;
  begin
    perform public.atsrs_apply_workspace_command(
      '11111111-1111-4111-8111-111111111639'::uuid,
      0,
      'company',
      'V400-stage19',
      jsonb_build_array(jsonb_build_object(
        'data_key',
          'atsrs_11111111-1111-4111-8111-111111111119_company_projects',
        'value', '[]'::jsonb
      )),
      '{}'::jsonb
    );
  exception when serialization_failure then
    rejected := sqlerrm = 'ATSRS_STALE_REVISION';
  end;
  if not rejected then
    raise exception 'stale revision was not rejected';
  end if;

  rejected := false;
  begin
    perform public.atsrs_apply_workspace_command(
      '11111111-1111-4111-8111-111111111619'::uuid,
      0,
      'company',
      'V400-stage19',
      jsonb_build_array(jsonb_build_object(
        'data_key',
          'atsrs_11111111-1111-4111-8111-111111111119_company_projects',
        'value', '[]'::jsonb
      )),
      '{}'::jsonb
    );
  exception when others then
    rejected := sqlerrm = 'ATSRS_IDEMPOTENCY_CONFLICT';
  end;
  if not rejected then
    raise exception 'idempotency conflict was not rejected';
  end if;

  rejected := false;
  begin
    perform public.atsrs_apply_workspace_command(
      '11111111-1111-4111-8111-111111111649'::uuid,
      1,
      'company',
      'V400-stage19',
      jsonb_build_array(jsonb_build_object(
        'data_key',
          'atsrs_11111111-1111-4111-8111-111111111119_company_certs',
        'value', jsonb_build_array(jsonb_build_object(
          'atsrsId', '11111111-1111-4111-8111-111111111429',
          'atsrsPersonnelId', '11111111-1111-4111-8111-111111111329',
          'type', 'Broken owner'
        ))
      )),
      '{}'::jsonb
    );
  exception when others then
    rejected := sqlerrm like '%mapping%'
      or sqlerrm like 'ATSRS_PARITY_MISMATCH:%';
  end;
  if not rejected then
    raise exception 'broken certificate owner did not rollback';
  end if;

  rejected := false;
  begin
    perform public.atsrs_apply_workspace_command(
      '11111111-1111-4111-8111-111111111659'::uuid,
      1,
      'company',
      'V400-stage19',
      jsonb_build_array(jsonb_build_object(
        'data_key',
          'atsrs_11111111-1111-4111-8111-111111111119_company_projects',
        'value', '[]'::jsonb
      )),
      '{"email":"must-not-be-logged@example.invalid"}'::jsonb
    );
  exception when others then
    rejected := sqlerrm = 'ATSRS_INVALID_AUDIT_METADATA';
  end;
  if not rejected then
    raise exception 'unsafe audit metadata was not rejected';
  end if;
end;
$negative_tests$;

insert into stage19_results
select 'update', public.atsrs_apply_workspace_command(
  '11111111-1111-4111-8111-111111111669'::uuid,
  1,
  'company',
  'V400-stage19',
  jsonb_build_array(
    jsonb_build_object(
      'data_key',
        'atsrs_11111111-1111-4111-8111-111111111119_company_projects',
      'value',
        jsonb_build_array(jsonb_build_object(
          'atsrsId', '11111111-1111-4111-8111-111111111219',
          'project', 'Synthetic project updated',
          'vessel', 'Synthetic vessel'
        ))
    ),
    jsonb_build_object(
      'data_key',
        'atsrs_11111111-1111-4111-8111-111111111119_company_personnel',
      'value',
        jsonb_build_array(jsonb_build_object(
          'atsrsId', '11111111-1111-4111-8111-111111111319',
          'atsrsProjectIds',
            jsonb_build_array('11111111-1111-4111-8111-111111111219'),
          'name', 'Synthetic',
          'surname', 'Tester'
        ))
    ),
    jsonb_build_object(
      'data_key',
        'atsrs_11111111-1111-4111-8111-111111111119_company_certs',
      'value',
        jsonb_build_array(jsonb_build_object(
          'atsrsId', '11111111-1111-4111-8111-111111111419',
          'atsrsPersonnelId', '11111111-1111-4111-8111-111111111319',
          'cloudFileId', '11111111-1111-4111-8111-111111111519',
          'fileName', 'stage19-synthetic.pdf',
          'mimeType', 'application/pdf',
          'fileSize', 128,
          'type', 'Synthetic certificate'
        ))
    )
  ),
  '{"channel":"staging_sql","rollout_stage":"synthetic"}'::jsonb
);

insert into stage19_results
select 'delete', public.atsrs_apply_workspace_command(
  '11111111-1111-4111-8111-111111111679'::uuid,
  2,
  'company',
  'V400-stage19',
  jsonb_build_array(
    jsonb_build_object(
      'data_key',
        'atsrs_11111111-1111-4111-8111-111111111119_company_certs',
      'deleted', true
    ),
    jsonb_build_object(
      'data_key',
        'atsrs_11111111-1111-4111-8111-111111111119_company_personnel',
      'deleted', true
    ),
    jsonb_build_object(
      'data_key',
        'atsrs_11111111-1111-4111-8111-111111111119_company_projects',
      'deleted', true
    )
  ),
  '{"channel":"staging_sql","rollout_stage":"synthetic"}'::jsonb
);

do $assertions$
declare
  before_row record;
begin
  select * into before_row from stage19_before;

  if (select result->>'status' from stage19_results where step = 'create')
     <> 'committed' then
    raise exception 'create command did not commit';
  end if;
  if (select result from stage19_results where step = 'duplicate')
     <> (select result from stage19_results where step = 'create') then
    raise exception 'duplicate command did not return the original result';
  end if;
  if (select result->>'status' from stage19_results where step = 'no_op')
     <> 'no_op' then
    raise exception 'no-op command changed business data';
  end if;
  if (select result->>'committed_revision' from stage19_results where step = 'delete')
     <> '3' then
    raise exception 'workspace revision did not advance once per command';
  end if;

  if exists (
    select 1 from public.atsrs_workspace_personnel
    where workspace_user_id = '11111111-1111-4111-8111-111111111119'::uuid
  ) or exists (
    select 1 from public.atsrs_personnel_certificates
    where workspace_user_id = '11111111-1111-4111-8111-111111111119'::uuid
  ) or exists (
    select 1 from public.atsrs_workspace_projects
    where workspace_user_id = '11111111-1111-4111-8111-111111111119'::uuid
  ) or exists (
    select 1 from public.atsrs_project_personnel
    where workspace_user_id = '11111111-1111-4111-8111-111111111119'::uuid
  ) then
    raise exception 'synthetic normalized graph was not deleted';
  end if;

  if (select count(*) from public.atsrs_workspace_data)
       <> before_row.workspace_data + 3
     or (select count(*) from public.atsrs_workspace_personnel)
       <> before_row.personnel
     or (select count(*) from public.atsrs_personnel_certificates)
       <> before_row.certificates
     or (select count(*) from public.atsrs_workspace_projects)
       <> before_row.projects
     or (select count(*) from public.atsrs_project_personnel)
       <> before_row.assignments then
    raise exception 'unexpected synthetic count after delete/tombstone';
  end if;

  if exists (
    select 1
    from atsrs_private.workspace_write_commands command
    where command.workspace_user_id =
      '11111111-1111-4111-8111-111111111119'::uuid
      and command.audit_metadata ?| array['email', 'payload', 'operations']
  ) then
    raise exception 'PII or raw payload entered command audit metadata';
  end if;
end;
$assertions$;

select jsonb_build_object(
  'result', 'PASS',
  'steps', (select jsonb_object_agg(step, result) from stage19_results),
  'synthetic_business_residue_after_rollback', 0
) stage19_staging_rehearsal;

rollback;
