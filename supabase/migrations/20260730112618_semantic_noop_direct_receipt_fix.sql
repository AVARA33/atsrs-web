-- Stage 19 staging follow-up: a semantic no-op must not enter the legacy
-- graph validator or any write path. A single idempotency receipt is retained
-- so an offline/retried operation_id returns the same result.
begin;

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
  request_hash text;
  prior_request_hash text;
  prior_result jsonb;
  no_op_result jsonb;
  semantic_no_op boolean := false;
  safe_audit jsonb;
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
    workspace_user_id, workspace_account_type, revision
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
         expected_prefix || case
           when p_account_type = 'personal' then 'profile'
           else 'personnel'
         end,
         expected_prefix || 'certs',
         expected_prefix || 'projects'
       )
  ) then
    raise exception using errcode = '22023',
      message = 'ATSRS_INVALID_OPERATION_KEY';
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
    raise exception using errcode = '22023',
      message = 'ATSRS_DUPLICATE_OPERATION_KEY';
  end if;

  select coalesce(bool_and(
    case
      when coalesce((operation.item->>'deleted')::boolean, false) then
        data.payload is null
        or coalesce((data.payload->>'deleted')::boolean, false)
      else
        data.payload is not null
        and not coalesce((data.payload->>'deleted')::boolean, false)
        and jsonb_typeof(data.payload->'value') = 'string'
        and atsrs_private.atsrs_workspace_business_semantic(
          operation.item->>'data_key',
          (data.payload->>'value')::jsonb
        ) = atsrs_private.atsrs_workspace_business_semantic(
          operation.item->>'data_key',
          operation.item->'value'
        )
    end
  ), false)
  into semantic_no_op
  from jsonb_array_elements(p_operations) operation(item)
  left join public.atsrs_workspace_data data
    on data.user_id = actor_id
   and data.account_type = p_account_type
   and data.data_key = operation.item->>'data_key';

  if not semantic_no_op then
    return atsrs_private.atsrs_apply_workspace_command_v1(
      p_operation_id, p_expected_revision, p_account_type, p_client_build,
      p_operations, p_audit_metadata
    );
  end if;

  no_op_result := jsonb_build_object(
    'status', 'no_op',
    'operation_id', p_operation_id,
    'workspace_account_type', p_account_type,
    'committed_revision', current_revision,
    'changed_keys', 0,
    'entity_count', 0
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
    current_revision,
    p_client_build,
    safe_audit,
    no_op_result
  );

  return no_op_result;
end;
$function$;

revoke all on function public.atsrs_apply_workspace_command(
  uuid, bigint, text, text, jsonb, jsonb
) from public, anon, service_role;
grant execute on function public.atsrs_apply_workspace_command(
  uuid, bigint, text, text, jsonb, jsonb
) to authenticated;

notify pgrst, 'reload schema';

commit;
