-- Keep the Personal profile row aligned with the stable ID submitted by the
-- current client before the normalized-shadow UPSERT runs. Older profile rows
-- can carry a deterministic rollout ID while a newer browser already has a
-- different valid stable ID. The shadow writer targets source_entity_id, so
-- leaving the old value in place makes the same legacy owner collide with the
-- legacy-key constraint.
begin;

create or replace function atsrs_private.reconcile_personal_profile_stable_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  existing_personnel_id uuid;
  incoming_source_id uuid;
begin
  if new.source <> 'workspace_data_personal_profile'
     or new.legacy_source_key is null
     or new.source_entity_id is null then
    return new;
  end if;

  incoming_source_id := new.source_entity_id;

  select personnel.id
  into existing_personnel_id
  from public.atsrs_workspace_personnel personnel
  where personnel.workspace_user_id = new.workspace_user_id
    and personnel.workspace_account_type = new.workspace_account_type
    and personnel.legacy_source_key = new.legacy_source_key
  for update;

  if existing_personnel_id is null then
    return new;
  end if;

  if exists (
    select 1
    from public.atsrs_workspace_personnel personnel
    where personnel.workspace_user_id = new.workspace_user_id
      and personnel.workspace_account_type = new.workspace_account_type
      and personnel.source_entity_id = incoming_source_id
      and personnel.id <> existing_personnel_id
  ) then
    raise exception using
      errcode = '23505',
      message = 'personal profile stable ID belongs to another personnel row';
  end if;

  update public.atsrs_workspace_personnel
  set source_entity_id = incoming_source_id
  where id = existing_personnel_id
    and source_entity_id is distinct from incoming_source_id;

  return new;
end;
$function$;

revoke all on function atsrs_private.reconcile_personal_profile_stable_id()
  from public, anon, authenticated, service_role;

drop trigger if exists atsrs_personal_profile_stable_id_reconcile
  on public.atsrs_workspace_personnel;

create trigger atsrs_personal_profile_stable_id_reconcile
before insert on public.atsrs_workspace_personnel
for each row
execute function atsrs_private.reconcile_personal_profile_stable_id();

commit;
