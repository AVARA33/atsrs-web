-- Emergency production activation candidate.
-- This file changes only the SQLSTATE paired with ATSRS_STALE_REVISION.
-- It is intentionally targeted and must not be run through a broad db push.
begin;

set local lock_timeout = '250ms';
set local statement_timeout = '5s';

do $forward_fix$
declare
  target regprocedure :=
    'public.atsrs_apply_workspace_command(uuid,bigint,text,text,jsonb,jsonb)'::regprocedure;
  current_definition text;
  updated_definition text;
  eligible_match_count integer;
begin
  current_definition := pg_get_functiondef(target);

  select count(*)
  into eligible_match_count
  from regexp_matches(
    current_definition,
    'errcode = ''40001''[[:space:]]*,[[:space:]]*message = ''ATSRS_STALE_REVISION''',
    'g'
  );

  if eligible_match_count <> 1 then
    raise exception using
      errcode = 'P0001',
      message = 'ATSRS_EMERGENCY_PATCH_PRECONDITION_FAILED',
      detail = format('expected one eligible stale branch, found %s', eligible_match_count);
  end if;

  updated_definition := regexp_replace(
    current_definition,
    'errcode = ''40001''([[:space:]]*,[[:space:]]*message = ''ATSRS_STALE_REVISION'')',
    'errcode = ''P0001''\1',
    'g'
  );

  if updated_definition = current_definition then
    raise exception using
      errcode = 'P0001',
      message = 'ATSRS_EMERGENCY_PATCH_NO_CHANGE';
  end if;

  execute updated_definition;
end;
$forward_fix$;

revoke all on function public.atsrs_apply_workspace_command(
  uuid, bigint, text, text, jsonb, jsonb
) from public, anon, service_role;
grant execute on function public.atsrs_apply_workspace_command(
  uuid, bigint, text, text, jsonb, jsonb
) to authenticated;

notify pgrst, 'reload schema';

commit;
