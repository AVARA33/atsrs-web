-- Staging-only authenticated rehearsal. Every synthetic mutation and receipt is
-- rolled back by the outer transaction. Do not run against production.
begin;

do $identity$
declare
  actor_id uuid;
begin
  select data.user_id
  into actor_id
  from public.atsrs_workspace_data data
  where data.data_key like '%\_certs' escape '\'
    and jsonb_typeof(data.payload->'value') = 'string'
    and jsonb_typeof((data.payload->>'value')::jsonb) = 'array'
    and jsonb_array_length((data.payload->>'value')::jsonb) > 0
  order by data.user_id, data.account_type, data.data_key
  limit 1;

  if actor_id is null then
    raise exception 'ATSRS_STAGING_CERTIFICATE_SCOPE_MISSING';
  end if;

  perform set_config('request.jwt.claim.sub', actor_id::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', actor_id, 'role', 'authenticated')::text,
    true
  );
end;
$identity$;

do $rehearsal$
declare
  actor_id uuid := (select auth.uid());
  target_account_type text;
  operation_key text;
  mutation_key text;
  original_value jsonb;
  mutation_original_value jsonb;
  technical_value jsonb;
  reordered_value jsonb;
  created_value jsonb;
  updated_value jsonb;
  synthetic_id uuid := gen_random_uuid();
  base_revision bigint;
  current_revision bigint;
  base_receipts bigint;
  current_receipts bigint;
  base_project_count bigint;
  result jsonb;
  exact_no_op_id uuid := gen_random_uuid();
  technical_no_op_id uuid := gen_random_uuid();
  reorder_no_op_id uuid := gen_random_uuid();
  create_id uuid := gen_random_uuid();
  stale_id uuid := gen_random_uuid();
  update_id uuid := gen_random_uuid();
  delete_id uuid := gen_random_uuid();
  audit_metadata jsonb := jsonb_build_object(
    'channel', 'browser',
    'rollout_stage', 'staging',
    'client_instance_hash', 'aaaaaaaaaaaaaaaa'
  );
begin
  select data.account_type, data.data_key, (data.payload->>'value')::jsonb
  into target_account_type, operation_key, original_value
  from public.atsrs_workspace_data data
  where data.user_id = actor_id
    and data.data_key like '%\_certs' escape '\'
    and jsonb_typeof(data.payload->'value') = 'string'
    and jsonb_typeof((data.payload->>'value')::jsonb) = 'array'
    and jsonb_array_length((data.payload->>'value')::jsonb) > 0
  order by data.account_type, data.data_key
  limit 1;

  mutation_key := 'atsrs_' || actor_id::text || '_' ||
    target_account_type || '_projects';
  select (data.payload->>'value')::jsonb
  into mutation_original_value
  from public.atsrs_workspace_data data
  where data.user_id = actor_id
    and data.account_type = target_account_type
    and data.data_key = mutation_key
    and jsonb_typeof(data.payload->'value') = 'string'
    and jsonb_typeof((data.payload->>'value')::jsonb) = 'array'
  limit 1;
  mutation_original_value := coalesce(mutation_original_value, '[]'::jsonb);

  select revision
  into base_revision
  from atsrs_private.workspace_write_revisions
  where workspace_user_id = actor_id
    and workspace_account_type = target_account_type;

  select count(*) into base_receipts
  from atsrs_private.workspace_write_commands
  where workspace_user_id = actor_id
    and workspace_account_type = target_account_type;

  select count(*) into base_project_count
  from public.atsrs_workspace_projects
  where workspace_user_id = actor_id
    and workspace_account_type = target_account_type;

  -- Capture privileged audit baselines first, then exercise the public RPC as
  -- the real Data API role. Reset the role only for private post-conditions.
  execute 'set local role authenticated';

  result := public.atsrs_apply_workspace_command(
    exact_no_op_id,
    base_revision,
    target_account_type,
    'V402-TEST',
    jsonb_build_array(jsonb_build_object(
      'data_key', operation_key,
      'value', original_value
    )),
    audit_metadata
  );
  if result->>'status' <> 'no_op'
     or (result->>'committed_revision')::bigint <> base_revision then
    raise exception 'ATSRS_EXACT_NOOP_FAILED';
  end if;

  -- Response-loss replay: identical operation_id and envelope must return the
  -- same receipt without creating another record.
  if public.atsrs_apply_workspace_command(
    exact_no_op_id,
    base_revision,
    target_account_type,
    'V402-TEST',
    jsonb_build_array(jsonb_build_object(
      'data_key', operation_key,
      'value', original_value
    )),
    audit_metadata
  ) <> result then
    raise exception 'ATSRS_NOOP_REPLAY_CHANGED_RESULT';
  end if;

  technical_value := original_value;
  if not (technical_value->0 ? 'cloudFileId') then
    technical_value := jsonb_set(
      technical_value, '{0,cloudFileId}', '""'::jsonb, true
    );
  end if;
  if not (technical_value->0 ? 'fileName') then
    technical_value := jsonb_set(
      technical_value, '{0,fileName}', '""'::jsonb, true
    );
  end if;
  if not (technical_value->0 ? 'mimeType') then
    technical_value := jsonb_set(
      technical_value, '{0,mimeType}', '""'::jsonb, true
    );
  end if;
  if not (technical_value->0 ? 'fileSize') then
    technical_value := jsonb_set(
      technical_value, '{0,fileSize}', '0'::jsonb, true
    );
  end if;
  technical_value := jsonb_set(
    technical_value, '{0,uploadedAt}', to_jsonb(clock_timestamp()::text), true
  );
  technical_value := jsonb_set(
    technical_value, '{0,capturedAt}', to_jsonb(clock_timestamp()::text), true
  );

  result := public.atsrs_apply_workspace_command(
    technical_no_op_id,
    base_revision,
    target_account_type,
    'V402-TEST',
    jsonb_build_array(jsonb_build_object(
      'data_key', operation_key,
      'value', technical_value
    )),
    audit_metadata
  );
  if result->>'status' <> 'no_op'
     or (result->>'committed_revision')::bigint <> base_revision then
    raise exception 'ATSRS_TECHNICAL_NOOP_FAILED';
  end if;

  select coalesce(jsonb_agg(item order by ordinality desc), '[]'::jsonb)
  into reordered_value
  from jsonb_array_elements(original_value)
    with ordinality entry(item, ordinality);

  result := public.atsrs_apply_workspace_command(
    reorder_no_op_id,
    base_revision,
    target_account_type,
    'V402-TEST',
    jsonb_build_array(jsonb_build_object(
      'data_key', operation_key,
      'value', reordered_value
    )),
    audit_metadata
  );
  if result->>'status' <> 'no_op'
     or (result->>'committed_revision')::bigint <> base_revision then
    raise exception 'ATSRS_REORDER_NOOP_FAILED';
  end if;

  created_value := mutation_original_value || jsonb_build_array(jsonb_build_object(
    'atsrsId', synthetic_id,
    'project', 'ATSRS_STAGE19_SEMANTIC_NOOP_TEST',
    'vessel', 'Synthetic',
    'client', 'Synthetic'
  ));

  result := public.atsrs_apply_workspace_command(
    create_id,
    base_revision,
    target_account_type,
    'V402-TEST',
    jsonb_build_array(jsonb_build_object(
      'data_key', mutation_key,
      'value', created_value
    )),
    audit_metadata
  );
  if result->>'status' <> 'committed'
     or (result->>'committed_revision')::bigint <> base_revision + 1 then
    raise exception 'ATSRS_SYNTHETIC_CREATE_FAILED';
  end if;

  -- Same request replay must be idempotent.
  if public.atsrs_apply_workspace_command(
    create_id,
    base_revision,
    target_account_type,
    'V402-TEST',
    jsonb_build_array(jsonb_build_object(
      'data_key', mutation_key,
      'value', created_value
    )),
    audit_metadata
  ) <> result then
    raise exception 'ATSRS_CREATE_REPLAY_CHANGED_RESULT';
  end if;

  -- A stale same-field writer must be rejected rather than overwriting.
  begin
    perform public.atsrs_apply_workspace_command(
      stale_id,
      base_revision,
      target_account_type,
      'V402-TEST',
      jsonb_build_array(jsonb_build_object(
        'data_key', operation_key,
        'value', jsonb_set(
          created_value,
          array[(jsonb_array_length(created_value) - 1)::text, 'client'],
          '"Stale overwrite"'::jsonb,
          false
        )
      )),
      audit_metadata
    );
    raise exception 'ATSRS_STALE_REVISION_WAS_ACCEPTED';
  exception
    when sqlstate '40001' then
      null;
  end;

  updated_value := jsonb_set(
    created_value,
    array[(jsonb_array_length(created_value) - 1)::text, 'client'],
    '"Synthetic Updated"'::jsonb,
    false
  );
  result := public.atsrs_apply_workspace_command(
    update_id,
    base_revision + 1,
    target_account_type,
    'V402-TEST',
    jsonb_build_array(jsonb_build_object(
      'data_key', mutation_key,
      'value', updated_value
    )),
    audit_metadata
  );
  if result->>'status' <> 'committed'
     or (result->>'committed_revision')::bigint <> base_revision + 2 then
    raise exception 'ATSRS_SYNTHETIC_UPDATE_FAILED';
  end if;

  result := public.atsrs_apply_workspace_command(
    delete_id,
    base_revision + 2,
    target_account_type,
    'V402-TEST',
    jsonb_build_array(jsonb_build_object(
      'data_key', mutation_key,
      'value', mutation_original_value
    )),
    audit_metadata
  );
  if result->>'status' <> 'committed'
     or (result->>'committed_revision')::bigint <> base_revision + 3 then
    raise exception 'ATSRS_SYNTHETIC_DELETE_FAILED';
  end if;

  execute 'reset role';

  select revision
  into current_revision
  from atsrs_private.workspace_write_revisions
  where workspace_user_id = actor_id
    and workspace_account_type = target_account_type;
  if current_revision <> base_revision + 3 then
    raise exception 'ATSRS_REVISION_DELTA_MISMATCH';
  end if;

  select count(*) into current_receipts
  from atsrs_private.workspace_write_commands
  where workspace_user_id = actor_id
    and workspace_account_type = target_account_type;
  if current_receipts <> base_receipts + 6 then
    raise exception 'ATSRS_RECEIPT_DELTA_MISMATCH';
  end if;

  if (
    select count(*)
    from public.atsrs_workspace_projects
    where workspace_user_id = actor_id
      and workspace_account_type = target_account_type
  ) <> base_project_count then
    raise exception 'ATSRS_SYNTHETIC_PROJECT_RESIDUE';
  end if;

  if exists (
    select 1
    from public.atsrs_workspace_projects
    where workspace_user_id = actor_id
      and workspace_account_type = target_account_type
      and source_entity_id = synthetic_id
  ) then
    raise exception 'ATSRS_SYNTHETIC_STABLE_ID_RESIDUE';
  end if;
end;
$rehearsal$;

select jsonb_build_object(
  'status', 'PASS',
  'rolled_back', true,
  'synthetic_residue', 0
)::text as staging_semantic_noop_rehearsal;

rollback;
