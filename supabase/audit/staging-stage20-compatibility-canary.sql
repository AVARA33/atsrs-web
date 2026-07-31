-- STAGING ONLY. All synthetic rows and gate changes are rolled back.
begin;

set local statement_timeout = '30s';
set local lock_timeout = '5s';

create temporary table stage20_compat_before as
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
    raise exception 'production-style global strict flag must remain false';
  end if;
end;
$guard$;

insert into auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values (
  '20502050-2050-4050-8050-205020502050'::uuid,
  'authenticated',
  'authenticated',
  'stage20-compat@example.invalid',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

insert into public.atsrs_workspaces (user_id, account_type)
values
  ('20502050-2050-4050-8050-205020502050'::uuid, 'personal'),
  ('20502050-2050-4050-8050-205020502050'::uuid, 'company');

select set_config(
  'request.jwt.claim.sub',
  '20502050-2050-4050-8050-205020502050',
  true
);

set local role authenticated;

do $default_off$
declare
  result jsonb;
begin
  result := public.atsrs_get_stable_id_compatibility(
    'company',
    'V1'
  );
  if coalesce((result->>'strict_required')::boolean, true)
     or not coalesce((result->>'client_compatible')::boolean, false)
     or coalesce((result->>'refresh_required')::boolean, true) then
    raise exception 'default-off compatibility state failed';
  end if;
end;
$default_off$;

reset role;

insert into atsrs_private.stable_id_compatibility_scopes (
  workspace_user_id,
  workspace_account_type,
  strict_enabled,
  minimum_client_build,
  kill_switch
)
values (
  '20502050-2050-4050-8050-205020502050'::uuid,
  'company',
  true,
  405,
  false
);

set local role authenticated;

do $old_client$
declare
  result jsonb;
  rejected boolean := false;
begin
  result := public.atsrs_get_stable_id_compatibility(
    'company',
    'V404'
  );
  if not coalesce((result->>'strict_required')::boolean, false)
     or coalesce((result->>'client_compatible')::boolean, true)
     or not coalesce((result->>'refresh_required')::boolean, false)
     or result->>'minimum_client_build' <> 'V405' then
    raise exception 'old-client compatibility response failed';
  end if;

  perform set_config(
    'request.headers',
    '{"x-atsrs-client-build":"V404"}',
    true
  );

  begin
    insert into public.atsrs_workspace_data (
      user_id, account_type, data_key, payload, updated_at
    )
    values (
      '20502050-2050-4050-8050-205020502050'::uuid,
      'company',
      'atsrs_20502050-2050-4050-8050-205020502050_company_projects',
      jsonb_build_object(
        'value',
        jsonb_build_array(jsonb_build_object(
          'atsrsId', '20502050-2050-4050-8050-205020502150',
          'project', 'Old build must refresh'
        ))::text
      ),
      now()
    );
  exception when others then
    rejected := sqlerrm = 'ATSRS_STABLE_ID_REFRESH_REQUIRED';
  end;

  if not rejected then
    raise exception 'old client was not rejected before write';
  end if;
end;
$old_client$;

select set_config(
  'request.headers',
  '{"x-atsrs-client-build":"V405"}',
  true
);

do $new_client$
declare
  result jsonb;
  rejected boolean := false;
begin
  result := public.atsrs_get_stable_id_compatibility(
    'company',
    'V405'
  );
  if not coalesce((result->>'strict_required')::boolean, false)
     or not coalesce((result->>'client_compatible')::boolean, false)
     or coalesce((result->>'refresh_required')::boolean, true) then
    raise exception 'V405 compatibility response failed';
  end if;

  insert into public.atsrs_workspace_data (
    user_id, account_type, data_key, payload, updated_at
  )
  values (
    '20502050-2050-4050-8050-205020502050'::uuid,
    'company',
    'atsrs_20502050-2050-4050-8050-205020502050_company_projects',
    jsonb_build_object(
      'value',
      jsonb_build_array(jsonb_build_object(
        'atsrsId', '20502050-2050-4050-8050-205020502150',
        'project', 'V405 synthetic project'
      ))::text
    ),
    now()
  );

  begin
    update public.atsrs_workspace_data
    set payload = jsonb_build_object(
      'value',
      jsonb_build_array(jsonb_build_object(
        'project', 'ID-less write must fail'
      ))::text
    )
    where user_id =
        '20502050-2050-4050-8050-205020502050'::uuid
      and account_type = 'company'
      and data_key =
        'atsrs_20502050-2050-4050-8050-205020502050_company_projects';
  exception when others then
    rejected := sqlerrm = 'ATSRS_INVALID_STABLE_ID_GRAPH';
  end;

  if not rejected then
    raise exception 'V405 ID-less graph was not rejected';
  end if;

  if not exists (
    select 1
    from public.atsrs_workspace_projects
    where workspace_user_id =
        '20502050-2050-4050-8050-205020502050'::uuid
      and source_entity_id =
        '20502050-2050-4050-8050-205020502150'::uuid
  ) then
    raise exception 'valid stable project was not mirrored';
  end if;
end;
$new_client$;

do $rpc_replay_and_cas$
declare
  revision bigint;
  first_result jsonb;
  replay_result jsonb;
  stale_rejected boolean := false;
begin
  revision := public.atsrs_get_workspace_command_revision('company');

  first_result := public.atsrs_apply_workspace_command(
    '20502050-2050-4050-8050-205020502250'::uuid,
    revision,
    'company',
    'V405',
    jsonb_build_array(jsonb_build_object(
      'data_key',
        'atsrs_20502050-2050-4050-8050-205020502050_company_projects',
      'value',
        jsonb_build_array(jsonb_build_object(
          'atsrsId', '20502050-2050-4050-8050-205020502150',
          'project', 'V405 synthetic project updated'
        ))
    )),
    '{"channel":"staging_sql","rollout_stage":"strict_canary"}'::jsonb
  );

  replay_result := public.atsrs_apply_workspace_command(
    '20502050-2050-4050-8050-205020502250'::uuid,
    revision,
    'company',
    'V405',
    jsonb_build_array(jsonb_build_object(
      'data_key',
        'atsrs_20502050-2050-4050-8050-205020502050_company_projects',
      'value',
        jsonb_build_array(jsonb_build_object(
          'atsrsId', '20502050-2050-4050-8050-205020502150',
          'project', 'V405 synthetic project updated'
        ))
    )),
    '{"channel":"staging_sql","rollout_stage":"strict_canary"}'::jsonb
  );

  if replay_result <> first_result then
    raise exception 'operation replay changed the receipt';
  end if;

  begin
    perform public.atsrs_apply_workspace_command(
      '20502050-2050-4050-8050-205020502251'::uuid,
      revision,
      'company',
      'V405',
      jsonb_build_array(jsonb_build_object(
        'data_key',
          'atsrs_20502050-2050-4050-8050-205020502050_company_projects',
        'value', '[]'::jsonb
      )),
      '{"channel":"staging_sql","rollout_stage":"strict_canary"}'::jsonb
    );
  exception when others then
    stale_rejected := sqlerrm = 'ATSRS_STALE_REVISION';
  end;

  if not stale_rejected then
    raise exception 'stale revision was not rejected';
  end if;
end;
$rpc_replay_and_cas$;

reset role;

do $telemetry$
begin
  if (
    select coalesce(sum(event_count), 0)
    from atsrs_private.stable_id_compatibility_events
    where workspace_hash = encode(
      extensions.digest(
        convert_to(
          '20502050-2050-4050-8050-205020502050:company',
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    )
      and event_code = 'refresh_required'
  ) <> 1 then
    raise exception 'privacy-safe refresh telemetry mismatch';
  end if;

  if exists (
    select 1
    from atsrs_private.stable_id_compatibility_events
    where workspace_hash like '%20502050%'
  ) then
    raise exception 'raw workspace identifier leaked into telemetry';
  end if;
end;
$telemetry$;

update atsrs_private.stable_id_compatibility_scopes
set kill_switch = true,
    updated_at = now()
where workspace_user_id =
    '20502050-2050-4050-8050-205020502050'::uuid
  and workspace_account_type = 'company';

set local role authenticated;

do $kill_switch$
declare
  result jsonb;
begin
  result := public.atsrs_get_stable_id_compatibility(
    'company',
    'V1'
  );
  if coalesce((result->>'strict_required')::boolean, true)
     or not coalesce((result->>'kill_switch')::boolean, false)
     or not coalesce((result->>'client_compatible')::boolean, false) then
    raise exception 'kill switch did not disable strict enforcement';
  end if;
end;
$kill_switch$;

reset role;

select jsonb_build_object(
  'result', 'PASS',
  'default_off', true,
  'minimum_build', true,
  'old_client_refresh', true,
  'valid_stable_write', true,
  'idless_reject', true,
  'legacy_mirror', true,
  'replay', true,
  'cas', true,
  'telemetry', true,
  'kill_switch', true,
  'rollback', true
) as stage20_compatibility_canary;

rollback;
