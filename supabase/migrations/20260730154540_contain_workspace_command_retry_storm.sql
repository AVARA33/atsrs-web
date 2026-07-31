-- Stage 19 containment candidate. Production application is intentionally
-- out of scope: this migration is rehearsed only on ATSRS staging first.
--
-- The wrapper keeps idempotent replay ahead of all locks, rejects stale CAS
-- revisions before graph canonicalization, and permits at most one concurrent
-- command per authenticated session and one per workspace.
begin;

do $preserve_previous$
begin
  if to_regprocedure(
    'atsrs_private.atsrs_apply_workspace_command_pre_containment_v1(uuid,bigint,text,text,jsonb,jsonb)'
  ) is null then
    alter function public.atsrs_apply_workspace_command(
      uuid, bigint, text, text, jsonb, jsonb
    ) set schema atsrs_private;
    alter function atsrs_private.atsrs_apply_workspace_command(
      uuid, bigint, text, text, jsonb, jsonb
    ) rename to atsrs_apply_workspace_command_pre_containment_v1;
  end if;
end;
$preserve_previous$;

revoke all on function
  atsrs_private.atsrs_apply_workspace_command_pre_containment_v1(
    uuid, bigint, text, text, jsonb, jsonb
  )
from public, anon, authenticated, service_role;

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
set lock_timeout = '500ms'
set statement_timeout = '6s'
as $function$
declare
  actor_id uuid := (select auth.uid());
  verified_session_id text := coalesce(
    nullif(auth.jwt() ->> 'session_id', ''),
    'legacy-session'
  );
  request_hash text;
  prior_request_hash text;
  prior_result jsonb;
  current_revision bigint;
  session_lock_key bigint;
  workspace_lock_key bigint;
begin
  if actor_id is null
     or p_operation_id is null
     or p_expected_revision is null
     or p_expected_revision < 0
     or p_account_type not in ('personal', 'company')
     or jsonb_typeof(p_operations) is distinct from 'array' then
    return atsrs_private.atsrs_apply_workspace_command_pre_containment_v1(
      p_operation_id, p_expected_revision, p_account_type, p_client_build,
      p_operations, p_audit_metadata
    );
  end if;

  if not exists (
    select 1
    from public.atsrs_workspaces workspace
    where workspace.user_id = actor_id
      and workspace.account_type = p_account_type
  ) then
    return atsrs_private.atsrs_apply_workspace_command_pre_containment_v1(
      p_operation_id, p_expected_revision, p_account_type, p_client_build,
      p_operations, p_audit_metadata
    );
  end if;

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

  -- A response-loss replay is read-only and must remain available even when
  -- the workspace circuit is busy or its revision has advanced.
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

  -- Cheap fail-fast CAS guard: a stale client never reaches graph
  -- canonicalization, mirror writes, or row-lock acquisition.
  select state.revision
  into current_revision
  from atsrs_private.workspace_write_revisions state
  where state.workspace_user_id = actor_id
    and state.workspace_account_type = p_account_type;

  current_revision := coalesce(current_revision, 0);
  if current_revision <> p_expected_revision then
    raise exception using
      errcode = '40001',
      message = 'ATSRS_STALE_REVISION',
      detail = jsonb_build_object(
        'current_revision', current_revision,
        'expected_revision', p_expected_revision
      )::text;
  end if;

  session_lock_key := hashtextextended(
    actor_id::text || ':' || p_account_type || ':' || verified_session_id,
    190020::bigint
  );
  if not pg_try_advisory_xact_lock(session_lock_key) then
    raise exception using errcode = '55P03',
      message = 'ATSRS_SESSION_BUSY';
  end if;

  workspace_lock_key := hashtextextended(
    actor_id::text || ':' || p_account_type,
    190019::bigint
  );
  if not pg_try_advisory_xact_lock(workspace_lock_key) then
    raise exception using errcode = '55P03',
      message = 'ATSRS_WORKSPACE_BUSY';
  end if;

  insert into atsrs_private.workspace_write_revisions (
    workspace_user_id, workspace_account_type, revision
  )
  values (actor_id, p_account_type, 0)
  on conflict (workspace_user_id, workspace_account_type) do nothing;

  begin
    select state.revision
    into current_revision
    from atsrs_private.workspace_write_revisions state
    where state.workspace_user_id = actor_id
      and state.workspace_account_type = p_account_type
    for update nowait;
  exception
    when lock_not_available then
      raise exception using errcode = '55P03',
        message = 'ATSRS_WORKSPACE_BUSY';
  end;

  if current_revision <> p_expected_revision then
    raise exception using
      errcode = '40001',
      message = 'ATSRS_STALE_REVISION',
      detail = jsonb_build_object(
        'current_revision', current_revision,
        'expected_revision', p_expected_revision
      )::text;
  end if;

  return atsrs_private.atsrs_apply_workspace_command_pre_containment_v1(
    p_operation_id, p_expected_revision, p_account_type, p_client_build,
    p_operations, p_audit_metadata
  );
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
