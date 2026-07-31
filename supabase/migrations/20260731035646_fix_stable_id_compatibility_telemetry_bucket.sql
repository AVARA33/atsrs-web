-- Forward fix for the Stage 20 staging rehearsal.
-- Avoid PL/pgSQL variable/column ambiguity in the telemetry upsert.

create or replace function public.atsrs_get_stable_id_compatibility(
  p_account_type text,
  p_client_build text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set statement_timeout = '2s'
as $function$
declare
  actor_id uuid := (select auth.uid());
  build_number integer;
  scope_state record;
  compatible boolean;
  scope_hash text;
  telemetry_bucket timestamptz;
begin
  if actor_id is null then
    raise exception using
      errcode = '42501',
      message = 'ATSRS_AUTH_REQUIRED';
  end if;

  if p_account_type not in ('personal', 'company') then
    raise exception using
      errcode = '22023',
      message = 'ATSRS_INVALID_ACCOUNT_TYPE';
  end if;

  if not exists (
    select 1
    from public.atsrs_workspaces workspace
    where workspace.user_id = actor_id
      and workspace.account_type = p_account_type
  ) then
    raise exception using
      errcode = '42501',
      message = 'ATSRS_WORKSPACE_FORBIDDEN';
  end if;

  build_number :=
    atsrs_private.atsrs_client_build_number(p_client_build);

  select *
  into strict scope_state
  from atsrs_private.atsrs_stable_id_scope_state(
    actor_id,
    p_account_type
  );

  compatible := not scope_state.strict_required
    or (
      build_number is not null
      and build_number >= scope_state.minimum_client_build
    );

  if scope_state.strict_required then
    scope_hash := encode(
      extensions.digest(
        convert_to(
          actor_id::text || ':' || p_account_type,
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    );
    telemetry_bucket := date_trunc('hour', now());

    insert into atsrs_private.stable_id_compatibility_events (
      event_bucket,
      workspace_hash,
      workspace_account_type,
      event_code,
      client_build,
      route,
      event_count,
      last_seen_at
    )
    values (
      telemetry_bucket,
      scope_hash,
      p_account_type,
      case when compatible
        then 'strict_check_passed'
        else 'refresh_required'
      end,
      build_number,
      'compatibility_rpc',
      1,
      now()
    )
    on conflict on constraint stable_id_compatibility_events_pkey
    do update set
      event_count =
        atsrs_private.stable_id_compatibility_events.event_count + 1,
      client_build = excluded.client_build,
      last_seen_at = excluded.last_seen_at;
  end if;

  return jsonb_build_object(
    'strict_required', scope_state.strict_required,
    'client_compatible', compatible,
    'refresh_required', not compatible,
    'minimum_client_build',
      'V' || scope_state.minimum_client_build::text,
    'kill_switch', scope_state.kill_switch
  );
end;
$function$;

revoke all on function public.atsrs_get_stable_id_compatibility(text, text)
  from public, anon, service_role;
grant execute on function public.atsrs_get_stable_id_compatibility(text, text)
  to authenticated;
