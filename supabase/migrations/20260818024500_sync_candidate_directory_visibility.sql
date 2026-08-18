-- Keep the server-side Candidate directory projection aligned with the
-- visibility choice saved by the Personal user in their authoritative profile.
create or replace function public.atsrs_sync_talent_visibility_from_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_payload jsonb;
  requested_visibility text;
begin
  if new.account_type <> 'personal'
     or new.data_key not like '%\_personal\_profile' escape '\' then
    return new;
  end if;

  begin
    profile_payload := (new.payload ->> 'value')::jsonb;
  exception when others then
    return new;
  end;

  requested_visibility := profile_payload ->> 'visibility';
  if requested_visibility not in ('Private', 'Link Only', 'Public') then
    return new;
  end if;

  update public.atsrs_talent_profiles
     set profile_visibility = requested_visibility,
         discoverable = (requested_visibility = 'Public'),
         updated_at = greatest(updated_at, new.updated_at)
   where user_id = new.user_id;

  return new;
end;
$$;

revoke all on function public.atsrs_sync_talent_visibility_from_workspace()
  from public, anon, authenticated;

drop trigger if exists sync_candidate_directory_visibility
  on public.atsrs_workspace_data;

create trigger sync_candidate_directory_visibility
after insert or update of payload on public.atsrs_workspace_data
for each row
execute function public.atsrs_sync_talent_visibility_from_workspace();

-- One-time reconciliation for profiles whose user-facing Public selection was
-- saved before this synchronization existed. Private and incomplete profiles
-- remain excluded; certificate eligibility is still evaluated separately by
-- atsrs_talent_directory_page.
with authoritative_profiles as (
  select
    workspace.user_id,
    (workspace.payload ->> 'value')::jsonb ->> 'visibility' as visibility,
    workspace.updated_at
  from public.atsrs_workspace_data workspace
  where workspace.account_type = 'personal'
    and workspace.data_key like '%\_personal\_profile' escape '\'
    and jsonb_typeof(workspace.payload -> 'value') = 'string'
)
update public.atsrs_talent_profiles profile
   set profile_visibility = source.visibility,
       discoverable = (source.visibility = 'Public'),
       updated_at = greatest(profile.updated_at, source.updated_at)
  from authoritative_profiles source
 where profile.user_id = source.user_id
   and source.visibility in ('Private', 'Link Only', 'Public')
   and (
     profile.profile_visibility is distinct from source.visibility
     or profile.discoverable is distinct from (source.visibility = 'Public')
   );

comment on function public.atsrs_sync_talent_visibility_from_workspace() is
  'Synchronizes Candidate directory consent from the authoritative Personal profile without exposing certificate files.';
