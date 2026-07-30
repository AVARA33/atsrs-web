-- Stage 19 forward fix: distinguish business changes from technical JSON drift.
-- The original command implementation remains intact in atsrs_private and is
-- called inside a rollbackable subtransaction for semantic no-op requests.
begin;

create or replace function atsrs_private.atsrs_strip_technical_metadata(
  source_value jsonb
)
returns jsonb
language sql
immutable
parallel safe
security invoker
set search_path = ''
as $function$
  select case jsonb_typeof(source_value)
    when 'object' then coalesce((
      select jsonb_object_agg(
        entry.key,
        atsrs_private.atsrs_strip_technical_metadata(entry.value)
        order by entry.key
      )
      from jsonb_each(source_value) entry
      where entry.key not in (
        'capturedAt', 'recoveredAt', 'updated_at', 'created_at',
        'updatedAt', 'createdAt', 'uploadedAt', 'client_build',
        'clientBuild', 'audit_metadata', 'auditMetadata'
      )
    ), '{}'::jsonb)
    when 'array' then coalesce((
      select jsonb_agg(
        atsrs_private.atsrs_strip_technical_metadata(entry.value)
        order by entry.ordinality
      )
      from jsonb_array_elements(source_value)
        with ordinality entry(value, ordinality)
    ), '[]'::jsonb)
    else source_value
  end;
$function$;

revoke all on function atsrs_private.atsrs_strip_technical_metadata(jsonb)
  from public, anon, authenticated, service_role;

create or replace function atsrs_private.atsrs_workspace_business_semantic(
  operation_key text,
  operation_value jsonb
)
returns jsonb
language plpgsql
immutable
parallel safe
security invoker
set search_path = ''
as $function$
declare
  canonical jsonb;
begin
  if operation_key like '%\_personal\_profile' escape '\'
     and jsonb_typeof(operation_value) = 'object' then
    return jsonb_build_object(
      'source_entity_id', lower(operation_value->>'atsrsId'),
      'first_name', btrim(operation_value->>'name'),
      'last_name', nullif(btrim(operation_value->>'surname'), ''),
      'position', nullif(btrim(operation_value->>'position'), ''),
      'company_name', nullif(btrim(operation_value->>'company'), ''),
      'phone', nullif(btrim(operation_value->>'phone'), ''),
      'whatsapp', nullif(btrim(operation_value->>'whatsapp'), ''),
      'nationality', nullif(btrim(operation_value->>'country'), ''),
      'phone_verified',
        coalesce((operation_value->>'phoneVerified')::boolean, false),
      'whatsapp_verified',
        coalesce((operation_value->>'whatsappVerified')::boolean, false),
      'metadata', atsrs_private.atsrs_strip_technical_metadata(
        operation_value - array[
          'atsrsId', 'name', 'surname', 'position', 'company', 'phone',
          'whatsapp', 'country', 'phoneVerified', 'whatsappVerified'
        ]::text[]
      )
    );
  end if;

  if jsonb_typeof(operation_value) <> 'array' then
    return operation_value;
  end if;

  if operation_key like '%\_company\_personnel' escape '\' then
    select coalesce(
      jsonb_agg(row_value order by row_value->>'source_entity_id'),
      '[]'::jsonb
    )
    into canonical
    from (
      select jsonb_build_object(
        'source_entity_id', lower(item->>'atsrsId'),
        'linked_user_id', nullif(lower(btrim(item->>'linkedUserId')), ''),
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
        'whatsapp_verified',
          coalesce((item->>'whatsappVerified')::boolean, false),
        'project_source_ids', coalesce((
          select jsonb_agg(lower(project_id) order by lower(project_id))
          from jsonb_array_elements_text(
            coalesce(item->'atsrsProjectIds', '[]'::jsonb)
          ) project(project_id)
        ), '[]'::jsonb),
        'metadata', atsrs_private.atsrs_strip_technical_metadata(
          item - array[
            'atsrsId', 'atsrsProjectIds', 'linkedUserId', 'name', 'surname',
            'position', 'company', 'email', 'phone', 'whatsapp',
            'nationality', 'country', 'employeeId', 'source', 'accessStatus',
            'linkedStatus', 'trackerStatus', 'phoneVerified',
            'whatsappVerified'
          ]::text[]
        )
      ) row_value
      from jsonb_array_elements(operation_value) entry(item)
    ) rows;
    return canonical;
  end if;

  if operation_key like '%\_projects' escape '\' then
    select coalesce(
      jsonb_agg(row_value order by row_value->>'source_entity_id'),
      '[]'::jsonb
    )
    into canonical
    from (
      select jsonb_build_object(
        'source_entity_id', lower(item->>'atsrsId'),
        'project_name', btrim(item->>'project'),
        'vessel_name', nullif(btrim(item->>'vessel'), ''),
        'client_name', nullif(btrim(item->>'client'), ''),
        'team_name', nullif(btrim(item->>'team'), ''),
        'metadata', atsrs_private.atsrs_strip_technical_metadata(
          item - array[
            'atsrsId', 'project', 'vessel', 'client', 'team'
          ]::text[]
        )
      ) row_value
      from jsonb_array_elements(operation_value) entry(item)
    ) rows;
    return canonical;
  end if;

  if operation_key like '%\_certs' escape '\' then
    select coalesce(
      jsonb_agg(row_value order by row_value->>'source_entity_id'),
      '[]'::jsonb
    )
    into canonical
    from (
      select jsonb_build_object(
        'source_entity_id', lower(item->>'atsrsId'),
        'personnel_source_entity_id', lower(item->>'atsrsPersonnelId'),
        'file_id', nullif(lower(btrim(item->>'cloudFileId')), ''),
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
        'metadata', atsrs_private.atsrs_strip_technical_metadata(
          item - array[
            'atsrsId', 'atsrsPersonnelId', 'person', 'type', 'provider',
            'docNo', 'country', 'issue', 'expiry', 'cloudFileId', 'fileName',
            'mimeType', 'fileSize'
          ]::text[]
        )
      ) row_value
      from jsonb_array_elements(operation_value) entry(item)
    ) rows;
    return canonical;
  end if;

  return operation_value;
end;
$function$;

revoke all on function atsrs_private.atsrs_workspace_business_semantic(
  text, jsonb
) from public, anon, authenticated, service_role;

do $move_original$
begin
  if to_regprocedure(
    'atsrs_private.atsrs_apply_workspace_command_v1(uuid,bigint,text,text,jsonb,jsonb)'
  ) is null then
    alter function public.atsrs_apply_workspace_command(
      uuid, bigint, text, text, jsonb, jsonb
    ) set schema atsrs_private;
    alter function atsrs_private.atsrs_apply_workspace_command(
      uuid, bigint, text, text, jsonb, jsonb
    ) rename to atsrs_apply_workspace_command_v1;
  end if;
end;
$move_original$;

revoke all on function atsrs_private.atsrs_apply_workspace_command_v1(
  uuid, bigint, text, text, jsonb, jsonb
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
  request_hash text;
  prior_request_hash text;
  prior_result jsonb;
  implementation_result jsonb;
  no_op_result jsonb;
  semantic_no_op boolean := false;
begin
  -- Let the original implementation own all validation errors.
  if actor_id is null or not exists (
    select 1
    from public.atsrs_workspaces workspace
    where workspace.user_id = actor_id
      and workspace.account_type = p_account_type
  ) then
    return atsrs_private.atsrs_apply_workspace_command_v1(
      p_operation_id, p_expected_revision, p_account_type, p_client_build,
      p_operations, p_audit_metadata
    );
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

  if jsonb_typeof(p_operations) = 'array'
     and jsonb_array_length(p_operations) > 0 then
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
  end if;

  begin
    implementation_result :=
      atsrs_private.atsrs_apply_workspace_command_v1(
        p_operation_id, p_expected_revision, p_account_type, p_client_build,
        p_operations, p_audit_metadata
      );
    if semantic_no_op then
      raise exception using errcode = 'A1901',
        message = 'ATSRS_SEMANTIC_NOOP_ROLLBACK';
    end if;
    return implementation_result;
  exception
    when sqlstate 'A1901' then
      null;
  end;

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
    coalesce(p_audit_metadata, '{}'::jsonb),
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
