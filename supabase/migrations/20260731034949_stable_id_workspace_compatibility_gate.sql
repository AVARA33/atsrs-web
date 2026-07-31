-- Stage 20: per-workspace stable-ID compatibility gate.
-- Default-off. This migration does not enable strict mode for any workspace.

create table if not exists atsrs_private.stable_id_compatibility_scopes (
  workspace_user_id uuid not null,
  workspace_account_type text not null
    check (workspace_account_type in ('personal', 'company')),
  strict_enabled boolean not null default false,
  minimum_client_build integer not null default 405
    check (minimum_client_build between 1 and 999999),
  kill_switch boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (workspace_user_id, workspace_account_type),
  constraint stable_id_compatibility_scopes_workspace_fkey
    foreign key (workspace_user_id, workspace_account_type)
    references public.atsrs_workspaces (user_id, account_type)
    on delete cascade
);

alter table atsrs_private.stable_id_compatibility_scopes
  enable row level security;

revoke all on table atsrs_private.stable_id_compatibility_scopes
  from public, anon, authenticated, service_role;

create table if not exists atsrs_private.stable_id_compatibility_events (
  event_bucket timestamptz not null,
  workspace_hash text not null
    check (workspace_hash ~ '^[0-9a-f]{64}$'),
  workspace_account_type text not null
    check (workspace_account_type in ('personal', 'company')),
  event_code text not null
    check (event_code in (
      'refresh_required',
      'strict_check_passed',
      'strict_write_rejected'
    )),
  client_build integer,
  route text not null
    check (route in ('compatibility_rpc', 'workspace_write')),
  event_count bigint not null default 1 check (event_count > 0),
  last_seen_at timestamptz not null default now(),
  primary key (
    event_bucket,
    workspace_hash,
    workspace_account_type,
    event_code,
    route
  )
);

alter table atsrs_private.stable_id_compatibility_events
  enable row level security;

revoke all on table atsrs_private.stable_id_compatibility_events
  from public, anon, authenticated, service_role;

create index if not exists stable_id_compatibility_events_recent_idx
  on atsrs_private.stable_id_compatibility_events (last_seen_at desc);

create or replace function atsrs_private.atsrs_client_build_number(
  build_value text
)
returns integer
language sql
immutable
strict
set search_path = ''
as $function$
  select case
    when btrim(build_value) ~ '^V[0-9]{1,6}$'
      then substring(btrim(build_value) from 2)::integer
    else null
  end
$function$;

revoke all on function atsrs_private.atsrs_client_build_number(text)
  from public, anon, authenticated, service_role;

create or replace function atsrs_private.atsrs_stable_id_scope_state(
  target_user_id uuid,
  target_account_type text
)
returns table (
  strict_required boolean,
  minimum_client_build integer,
  kill_switch boolean
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    (
      coalesce(global_flag.enabled, false)
      or coalesce(scope.strict_enabled, false)
    ) and not coalesce(scope.kill_switch, false),
    coalesce(scope.minimum_client_build, 405),
    coalesce(scope.kill_switch, false)
  from (select 1) seed
  left join atsrs_private.runtime_flags global_flag
    on global_flag.flag_name = 'stable_ids_required'
  left join atsrs_private.stable_id_compatibility_scopes scope
    on scope.workspace_user_id = target_user_id
   and scope.workspace_account_type = target_account_type
$function$;

revoke all on function atsrs_private.atsrs_stable_id_scope_state(uuid, text)
  from public, anon, authenticated, service_role;

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
  event_bucket timestamptz;
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
    event_bucket := date_trunc('hour', now());

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
      event_bucket,
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
    on conflict (
      event_bucket,
      workspace_hash,
      workspace_account_type,
      event_code,
      route
    )
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

create or replace function atsrs_private.enforce_stable_id_compatibility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  scope_state record;
  request_headers jsonb;
  request_build text;
  request_build_number integer;
  decoded jsonb;
  missing_identity boolean := false;
begin
  if new.data_key not like '%\_personal\_profile' escape '\'
     and new.data_key not like '%\_company\_personnel' escape '\'
     and new.data_key not like '%\_personal\_certs' escape '\'
     and new.data_key not like '%\_company\_certs' escape '\'
     and new.data_key not like '%\_personal\_projects' escape '\'
     and new.data_key not like '%\_company\_projects' escape '\' then
    return new;
  end if;

  select *
  into strict scope_state
  from atsrs_private.atsrs_stable_id_scope_state(
    new.user_id,
    new.account_type
  );

  if not scope_state.strict_required
     or coalesce(new.payload->>'deleted', 'false') = 'true' then
    return new;
  end if;

  request_headers := coalesce(
    nullif(current_setting('request.headers', true), '')::jsonb,
    '{}'::jsonb
  );
  request_build := request_headers->>'x-atsrs-client-build';
  request_build_number :=
    atsrs_private.atsrs_client_build_number(request_build);

  if request_build_number is null
     or request_build_number < scope_state.minimum_client_build then
    raise exception using
      errcode = 'P0001',
      message = 'ATSRS_STABLE_ID_REFRESH_REQUIRED',
      detail = jsonb_build_object(
        'minimum_client_build',
          'V' || scope_state.minimum_client_build::text
      )::text;
  end if;

  begin
    decoded := (new.payload->>'value')::jsonb;
  exception when others then
    raise exception using
      errcode = '22023',
      message = 'ATSRS_INVALID_STABLE_ID_PAYLOAD';
  end;

  if new.data_key like '%\_personal\_profile' escape '\' then
    missing_identity := jsonb_typeof(decoded) is distinct from 'object'
      or coalesce(decoded->>'atsrsId', '') !~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
  elsif jsonb_typeof(decoded) is distinct from 'array' then
    missing_identity := true;
  else
    select exists (
      select 1
      from jsonb_array_elements(decoded) entry(item)
      where coalesce(item->>'atsrsId', '') !~*
              '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
         or (
           new.data_key like '%\_company\_personnel' escape '\'
           and jsonb_typeof(item->'atsrsProjectIds')
             is distinct from 'array'
         )
         or (
           (
             new.data_key like '%\_personal\_certs' escape '\'
             or new.data_key like '%\_company\_certs' escape '\'
           )
           and coalesce(item->>'atsrsPersonnelId', '') !~*
             '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
         )
    )
    into missing_identity;
  end if;

  if missing_identity then
    raise exception using
      errcode = '22023',
      message = 'ATSRS_INVALID_STABLE_ID_GRAPH';
  end if;

  return new;
end;
$function$;

revoke all on function atsrs_private.enforce_stable_id_compatibility()
  from public, anon, authenticated, service_role;

drop trigger if exists atsrs_workspace_data_compatibility_guard
  on public.atsrs_workspace_data;

create trigger atsrs_workspace_data_compatibility_guard
before insert or update of payload on public.atsrs_workspace_data
for each row
execute function atsrs_private.enforce_stable_id_compatibility();

comment on table atsrs_private.stable_id_compatibility_scopes is
  'Default-off per-workspace stable-ID rollout gate and kill switch.';
comment on table atsrs_private.stable_id_compatibility_events is
  'Privacy-safe aggregated compatibility telemetry; no payload or PII.';
