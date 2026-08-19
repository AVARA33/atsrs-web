-- The Personal workspace profile is the authoritative source for Candidate
-- directory consent. Cached clients may update the projection only after the
-- matching workspace value exists; they cannot overwrite Public/Private state
-- with an unhydrated form default.
create or replace function public.enforce_atsrs_talent_profile_visibility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_value jsonb;
  source_profile jsonb;
  authoritative_visibility text;
begin
  select workspace.payload -> 'value'
    into source_value
  from public.atsrs_workspace_data workspace
  where workspace.user_id = new.user_id
    and workspace.account_type = 'personal'
    and workspace.data_key like '%\_personal\_profile' escape '\'
  order by workspace.updated_at desc
  limit 1;

  if jsonb_typeof(source_value) = 'object' then
    source_profile := source_value;
  elsif jsonb_typeof(source_value) = 'string' then
    begin
      source_profile := (source_value #>> '{}')::jsonb;
    exception when others then
      source_profile := null;
    end;
  end if;

  authoritative_visibility := source_profile ->> 'visibility';
  if authoritative_visibility in ('Private', 'Link Only', 'Public') then
    new.profile_visibility := authoritative_visibility;
    new.discoverable := (authoritative_visibility = 'Public');
  else
    new.profile_visibility := 'Private';
    new.discoverable := false;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_atsrs_talent_profile_visibility()
  from public, anon, authenticated;

-- Repair every projection from its owner-controlled Personal profile. This is
-- intentionally generic and idempotent; no account IDs or candidate rows are
-- inserted manually.
do $$
declare
  profile_owner record;
begin
  for profile_owner in
    select distinct workspace.user_id
    from public.atsrs_workspace_data workspace
    where workspace.account_type = 'personal'
      and workspace.data_key like '%\_personal\_profile' escape '\'
  loop
    perform public.atsrs_reconcile_talent_profile_from_workspace(profile_owner.user_id);
  end loop;
end;
$$;

comment on function public.enforce_atsrs_talent_profile_visibility() is
  'Prevents Candidate directory consent drift by deriving projection visibility from the authoritative Personal workspace profile.';
