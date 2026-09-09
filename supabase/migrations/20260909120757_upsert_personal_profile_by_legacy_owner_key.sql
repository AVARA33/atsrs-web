-- Resolve Personal profile identity upgrades in the shadow UPSERT itself.
-- The legacy owner key is the durable identity for this single workspace row;
-- updating source_entity_id on conflict keeps the row id (and its certificate
-- relationships) intact while making command parity match the current client.
begin;

drop trigger if exists atsrs_personal_profile_stable_id_reconcile
  on public.atsrs_workspace_personnel;
drop function if exists atsrs_private.reconcile_personal_profile_stable_id();

do $patch_function$
declare
  function_sql text;
  conflict_needle constant text :=
    'on conflict (workspace_user_id, workspace_account_type, source_entity_id)';
  conflict_replacement constant text :=
    'on conflict (workspace_user_id, workspace_account_type, legacy_source_key)';
  conflict_position integer;
  update_position integer;
begin
  function_sql := pg_get_functiondef(
    'atsrs_private.sync_workspace_normalized_shadow()'::regprocedure
  );

  conflict_position := strpos(function_sql, conflict_needle);
  if conflict_position = 0 then
    raise exception 'Personal profile shadow UPSERT conflict target was not found';
  end if;

  function_sql := overlay(
    function_sql placing conflict_replacement
    from conflict_position for length(conflict_needle)
  );

  update_position := conflict_position + strpos(
    substring(function_sql from conflict_position),
    'do update set'
  ) - 1;
  if update_position < conflict_position then
    raise exception 'Personal profile shadow UPSERT update clause was not found';
  end if;

  function_sql := overlay(
    function_sql placing E'do update set\n      source_entity_id = excluded.source_entity_id,'
    from update_position for length('do update set')
  );

  execute function_sql;
end;
$patch_function$;

revoke all on function atsrs_private.sync_workspace_normalized_shadow()
  from public, anon, authenticated, service_role;

commit;
