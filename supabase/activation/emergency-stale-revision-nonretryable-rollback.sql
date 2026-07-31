-- Non-destructive inverse of emergency-stale-revision-nonretryable.sql.
-- It restores only the previous retryable SQLSTATE.
begin;

set local lock_timeout = '250ms';
set local statement_timeout = '5s';

do $rollback_fix$
declare
  target regprocedure :=
    'public.atsrs_apply_workspace_command(uuid,bigint,text,text,jsonb,jsonb)'::regprocedure;
  current_definition text;
  restored_definition text;
  eligible_match_count integer;
begin
  current_definition := pg_get_functiondef(target);

  select count(*)
  into eligible_match_count
  from regexp_matches(
    current_definition,
    'errcode = ''P0001''[[:space:]]*,[[:space:]]*message = ''ATSRS_STALE_REVISION''',
    'g'
  );

  if eligible_match_count <> 1 then
    raise exception using
      errcode = 'P0001',
      message = 'ATSRS_EMERGENCY_ROLLBACK_PRECONDITION_FAILED',
      detail = format('expected one eligible stale branch, found %s', eligible_match_count);
  end if;

  restored_definition := regexp_replace(
    current_definition,
    'errcode = ''P0001''([[:space:]]*,[[:space:]]*message = ''ATSRS_STALE_REVISION'')',
    'errcode = ''40001''\1',
    'g'
  );

  if restored_definition = current_definition then
    raise exception using
      errcode = 'P0001',
      message = 'ATSRS_EMERGENCY_ROLLBACK_NO_CHANGE';
  end if;

  execute restored_definition;
end;
$rollback_fix$;

revoke all on function public.atsrs_apply_workspace_command(
  uuid, bigint, text, text, jsonb, jsonb
) from public, anon, service_role;
grant execute on function public.atsrs_apply_workspace_command(
  uuid, bigint, text, text, jsonb, jsonb
) to authenticated;

notify pgrst, 'reload schema';

commit;
