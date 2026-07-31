-- STAGING ONLY.
-- Stage 20 stable-ID strict-mode rehearsal. Every change is rolled back.
begin;

set local statement_timeout = '30s';
set local lock_timeout = '5s';

create temporary table stage20_before as
select
  (select count(*) from public.atsrs_workspace_data) workspace_data,
  (select count(*) from public.atsrs_workspace_personnel) personnel,
  (select count(*) from public.atsrs_personnel_certificates) certificates,
  (select count(*) from public.atsrs_workspace_projects) projects,
  (select count(*) from public.atsrs_project_personnel) assignments;

do $guard$
begin
  if coalesce((
    select enabled
    from atsrs_private.runtime_flags
    where flag_name = 'stable_ids_required'
  ), true) then
    raise exception 'Stage 20 must start with stable_ids_required=false';
  end if;
end;
$guard$;

insert into auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values (
  '20202020-2020-4020-8020-202020202020'::uuid,
  'authenticated',
  'authenticated',
  'stage20-synthetic@example.invalid',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

insert into public.atsrs_workspaces (user_id, account_type)
values
  ('20202020-2020-4020-8020-202020202020'::uuid, 'personal'),
  ('20202020-2020-4020-8020-202020202020'::uuid, 'company');

select set_config(
  'request.jwt.claim.sub',
  '20202020-2020-4020-8020-202020202020',
  true
);

update atsrs_private.runtime_flags
set enabled = true, updated_at = now()
where flag_name = 'stable_ids_required';

do $strict_rejects$
declare
  rejected boolean := false;
begin
  begin
    insert into public.atsrs_workspace_data (
      user_id, account_type, data_key, payload, updated_at
    )
    values (
      '20202020-2020-4020-8020-202020202020'::uuid,
      'company',
      'atsrs_20202020-2020-4020-8020-202020202020_company_projects',
      jsonb_build_object(
        'value',
        jsonb_build_array(jsonb_build_object(
          'project', 'ID-less direct legacy write'
        ))::text
      ),
      now()
    );
  exception when others then
    rejected := sqlerrm like '%stable ID compatibility refresh required%';
  end;

  if not rejected then
    raise exception 'strict trigger accepted an ID-less direct legacy write';
  end if;

  rejected := false;
  begin
    perform public.atsrs_apply_workspace_command(
      '20202020-2020-4020-8020-202020202101'::uuid,
      0,
      'company',
      'V404-stage20',
      jsonb_build_array(jsonb_build_object(
        'data_key',
          'atsrs_20202020-2020-4020-8020-202020202020_company_projects',
        'value',
          jsonb_build_array(jsonb_build_object(
            'project', 'ID-less synthetic project'
          ))
      )),
      '{"channel":"staging_sql","rollout_stage":"strict_default_off"}'::jsonb
    );
  exception when others then
    rejected := sqlerrm = 'ATSRS_INVALID_STABLE_ID_GRAPH'
      or sqlerrm like '%stable ID compatibility refresh required%';
  end;

  if not rejected then
    raise exception 'strict mode accepted an ID-less company project';
  end if;

  rejected := false;
  begin
    perform public.atsrs_apply_workspace_command(
      '20202020-2020-4020-8020-202020202102'::uuid,
      0,
      'personal',
      'V404-stage20',
      jsonb_build_array(jsonb_build_object(
        'data_key',
          'atsrs_20202020-2020-4020-8020-202020202020_personal_profile',
        'value',
          jsonb_build_object('name', 'ID-less synthetic owner')
      )),
      '{"channel":"staging_sql","rollout_stage":"strict_default_off"}'::jsonb
    );
  exception when others then
    rejected := sqlerrm = 'ATSRS_INVALID_PROFILE_GRAPH'
      or sqlerrm like '%stable ID compatibility refresh required%';
  end;

  if not rejected then
    raise exception 'strict mode accepted an ID-less personal profile';
  end if;
end;
$strict_rejects$;

create temporary table stage20_results (
  step text primary key,
  result jsonb not null
);

insert into stage20_results
select 'company_create', public.atsrs_apply_workspace_command(
  '20202020-2020-4020-8020-202020202111'::uuid,
  0,
  'company',
  'V404-stage20',
  jsonb_build_array(
    jsonb_build_object(
      'data_key',
        'atsrs_20202020-2020-4020-8020-202020202020_company_projects',
      'value',
        jsonb_build_array(jsonb_build_object(
          'atsrsId', '20202020-2020-4020-8020-202020202211',
          'project', 'Strict synthetic project'
        ))
    ),
    jsonb_build_object(
      'data_key',
        'atsrs_20202020-2020-4020-8020-202020202020_company_personnel',
      'value',
        jsonb_build_array(jsonb_build_object(
          'atsrsId', '20202020-2020-4020-8020-202020202311',
          'atsrsProjectIds',
            jsonb_build_array('20202020-2020-4020-8020-202020202211'),
          'name', 'Strict synthetic',
          'surname', 'Personnel'
        ))
    ),
    jsonb_build_object(
      'data_key',
        'atsrs_20202020-2020-4020-8020-202020202020_company_certs',
      'value',
        jsonb_build_array(jsonb_build_object(
          'atsrsId', '20202020-2020-4020-8020-202020202411',
          'atsrsPersonnelId', '20202020-2020-4020-8020-202020202311',
          'type', 'Strict synthetic certificate'
        ))
    )
  ),
  '{"channel":"staging_sql","rollout_stage":"strict_default_off"}'::jsonb
);

insert into stage20_results
select 'company_replay', public.atsrs_apply_workspace_command(
  '20202020-2020-4020-8020-202020202111'::uuid,
  0,
  'company',
  'V404-stage20',
  jsonb_build_array(
    jsonb_build_object(
      'data_key',
        'atsrs_20202020-2020-4020-8020-202020202020_company_projects',
      'value',
        jsonb_build_array(jsonb_build_object(
          'atsrsId', '20202020-2020-4020-8020-202020202211',
          'project', 'Strict synthetic project'
        ))
    ),
    jsonb_build_object(
      'data_key',
        'atsrs_20202020-2020-4020-8020-202020202020_company_personnel',
      'value',
        jsonb_build_array(jsonb_build_object(
          'atsrsId', '20202020-2020-4020-8020-202020202311',
          'atsrsProjectIds',
            jsonb_build_array('20202020-2020-4020-8020-202020202211'),
          'name', 'Strict synthetic',
          'surname', 'Personnel'
        ))
    ),
    jsonb_build_object(
      'data_key',
        'atsrs_20202020-2020-4020-8020-202020202020_company_certs',
      'value',
        jsonb_build_array(jsonb_build_object(
          'atsrsId', '20202020-2020-4020-8020-202020202411',
          'atsrsPersonnelId', '20202020-2020-4020-8020-202020202311',
          'type', 'Strict synthetic certificate'
        ))
    )
  ),
  '{"channel":"staging_sql","rollout_stage":"strict_default_off"}'::jsonb
);

insert into stage20_results
select 'company_noop', public.atsrs_apply_workspace_command(
  '20202020-2020-4020-8020-202020202112'::uuid,
  1,
  'company',
  'V404-stage20',
  jsonb_build_array(jsonb_build_object(
    'data_key',
      'atsrs_20202020-2020-4020-8020-202020202020_company_projects',
    'value',
      jsonb_build_array(jsonb_build_object(
        'atsrsId', '20202020-2020-4020-8020-202020202211',
        'project', 'Strict synthetic project'
      ))
  )),
  '{"channel":"staging_sql","rollout_stage":"strict_default_off"}'::jsonb
);

insert into stage20_results
select 'personal_create', public.atsrs_apply_workspace_command(
  '20202020-2020-4020-8020-202020202121'::uuid,
  0,
  'personal',
  'V404-stage20',
  jsonb_build_array(
    jsonb_build_object(
      'data_key',
        'atsrs_20202020-2020-4020-8020-202020202020_personal_profile',
      'value',
        jsonb_build_object(
          'atsrsId', '20202020-2020-4020-8020-202020202221',
          'name', 'Strict synthetic owner'
        )
    ),
    jsonb_build_object(
      'data_key',
        'atsrs_20202020-2020-4020-8020-202020202020_personal_certs',
      'value',
        jsonb_build_array(jsonb_build_object(
          'atsrsId', '20202020-2020-4020-8020-202020202421',
          'atsrsPersonnelId', '20202020-2020-4020-8020-202020202221',
          'type', 'Strict personal certificate'
        ))
    )
  ),
  '{"channel":"staging_sql","rollout_stage":"strict_default_off"}'::jsonb
);

do $assertions$
declare
  stale_rejected boolean := false;
begin
  if (select result from stage20_results where step = 'company_create')
     <> (select result from stage20_results where step = 'company_replay') then
    raise exception 'operation replay did not return the original receipt';
  end if;

  if (select result->>'status' from stage20_results where step = 'company_noop')
     <> 'no_op' then
    raise exception 'strict semantic no-op changed business state';
  end if;

  begin
    perform public.atsrs_apply_workspace_command(
      '20202020-2020-4020-8020-202020202113'::uuid,
      0,
      'company',
      'V404-stage20',
      jsonb_build_array(jsonb_build_object(
        'data_key',
          'atsrs_20202020-2020-4020-8020-202020202020_company_projects',
        'value', '[]'::jsonb
      )),
      '{"channel":"staging_sql","rollout_stage":"strict_default_off"}'::jsonb
    );
  exception when others then
    stale_rejected := sqlerrm = 'ATSRS_STALE_REVISION';
  end;

  if not stale_rejected then
    raise exception 'stale revision was not rejected immediately';
  end if;

  if not exists (
    select 1
    from public.atsrs_workspace_projects
    where workspace_user_id = '20202020-2020-4020-8020-202020202020'::uuid
      and source_entity_id = '20202020-2020-4020-8020-202020202211'::uuid
  ) or not exists (
    select 1
    from public.atsrs_workspace_personnel
    where workspace_user_id = '20202020-2020-4020-8020-202020202020'::uuid
      and source_entity_id in (
        '20202020-2020-4020-8020-202020202311'::uuid,
        '20202020-2020-4020-8020-202020202221'::uuid
      )
  ) or not exists (
    select 1
    from public.atsrs_personnel_certificates
    where workspace_user_id = '20202020-2020-4020-8020-202020202020'::uuid
      and source_entity_id in (
        '20202020-2020-4020-8020-202020202411'::uuid,
        '20202020-2020-4020-8020-202020202421'::uuid
      )
  ) then
    raise exception 'valid stable-ID graph was not mirrored';
  end if;

  if not exists (
    select 1
    from public.atsrs_workspace_data
    where user_id = '20202020-2020-4020-8020-202020202020'::uuid
      and data_key like
        'atsrs_20202020-2020-4020-8020-202020202020_%'
  ) then
    raise exception 'legacy JSON mirror is missing';
  end if;
end;
$assertions$;

update atsrs_private.runtime_flags
set enabled = false, updated_at = now()
where flag_name = 'stable_ids_required';

select jsonb_build_object(
  'result', 'PASS',
  'strict_default_before', false,
  'strict_enabled_inside_rollback', true,
  'idless_direct_legacy_rejected', true,
  'idless_company_rejected', true,
  'idless_personal_rejected', true,
  'valid_company_graph', true,
  'valid_personal_graph', true,
  'legacy_mirror', true,
  'operation_replay', true,
  'semantic_noop', true,
  'stale_revision_reject', true,
  'rollback', true
) as stage20_strict_canary;

rollback;
