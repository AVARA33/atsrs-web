-- Candidate eligibility is exactly: authoritative Public Personal profile plus
-- at least one canonical certificate row linked to a persisted Personal file.

create or replace function public.atsrs_reconcile_talent_profile_from_workspace(
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_value jsonb;
  source_profile jsonb;
  source_updated_at timestamptz;
  requested_visibility text;
  requested_status text;
  requested_available_from date;
begin
  select
    workspace.payload -> 'value',
    workspace.updated_at
  into source_value, source_updated_at
  from public.atsrs_workspace_data workspace
  where workspace.user_id = p_user_id
    and workspace.account_type = 'personal'
    and workspace.data_key like '%\_personal\_profile' escape '\'
  order by workspace.updated_at desc
  limit 1;

  if source_value is null then
    return;
  end if;

  if jsonb_typeof(source_value) = 'object' then
    source_profile := source_value;
  elsif jsonb_typeof(source_value) = 'string' then
    begin
      source_profile := (source_value #>> '{}')::jsonb;
    exception when others then
      return;
    end;
  else
    return;
  end if;

  requested_visibility := source_profile ->> 'visibility';
  if requested_visibility not in ('Private', 'Link Only', 'Public') then
    return;
  end if;

  requested_status := source_profile ->> 'availabilityStatus';
  if requested_status not in (
    'not_set', 'available_now', 'available_from', 'open_to_offers', 'not_available'
  ) then
    requested_status := 'not_set';
  end if;

  if nullif(btrim(source_profile ->> 'availableFrom'), '') ~ '^\d{4}-\d{2}-\d{2}$' then
    begin
      requested_available_from := (source_profile ->> 'availableFrom')::date;
    exception when others then
      requested_available_from := null;
    end;
  end if;
  if requested_status = 'available_from' and requested_available_from is null then
    requested_status := 'not_set';
  end if;

  insert into public.atsrs_talent_profiles (
    user_id,
    name,
    surname,
    "position",
    country,
    company,
    available,
    discoverable,
    last_active_at,
    updated_at,
    availability_status,
    available_from,
    profile_visibility
  ) values (
    p_user_id,
    coalesce(nullif(btrim(source_profile ->> 'name'), ''), 'ATSRS'),
    coalesce(nullif(btrim(source_profile ->> 'surname'), ''), 'Candidate'),
    coalesce(nullif(btrim(source_profile ->> 'position'), ''), 'Not specified'),
    coalesce(nullif(btrim(source_profile ->> 'country'), ''), 'Not specified'),
    nullif(btrim(source_profile ->> 'company'), ''),
    requested_status in ('available_now', 'available_from', 'open_to_offers'),
    requested_visibility = 'Public',
    source_updated_at,
    source_updated_at,
    requested_status,
    requested_available_from,
    requested_visibility
  )
  on conflict (user_id) do update
  set name = coalesce(
        nullif(btrim(source_profile ->> 'name'), ''),
        public.atsrs_talent_profiles.name
      ),
      surname = coalesce(
        nullif(btrim(source_profile ->> 'surname'), ''),
        public.atsrs_talent_profiles.surname
      ),
      "position" = coalesce(
        nullif(btrim(source_profile ->> 'position'), ''),
        public.atsrs_talent_profiles."position",
        'Not specified'
      ),
      country = coalesce(
        nullif(btrim(source_profile ->> 'country'), ''),
        public.atsrs_talent_profiles.country,
        'Not specified'
      ),
      company = nullif(btrim(source_profile ->> 'company'), ''),
      available = requested_status in ('available_now', 'available_from', 'open_to_offers'),
      availability_status = requested_status,
      available_from = requested_available_from,
      profile_visibility = requested_visibility,
      discoverable = (requested_visibility = 'Public'),
      last_active_at = greatest(
        public.atsrs_talent_profiles.last_active_at,
        source_updated_at
      ),
      updated_at = greatest(
        public.atsrs_talent_profiles.updated_at,
        source_updated_at
      );
end;
$$;

revoke all on function public.atsrs_reconcile_talent_profile_from_workspace(uuid)
  from public, anon, authenticated;

create or replace function public.atsrs_sync_talent_visibility_from_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.account_type = 'personal'
     and new.data_key like '%\_personal\_profile' escape '\' then
    perform public.atsrs_reconcile_talent_profile_from_workspace(new.user_id);
  end if;
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

-- Reconcile every existing Personal profile without modifying workspace data.
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

create or replace function public.atsrs_talent_directory_page(
  p_limit integer default 31,
  p_before_active_at timestamptz default null,
  p_before_user_id uuid default null
)
returns table (
  user_id uuid,
  name text,
  surname text,
  "position" text,
  country text,
  company text,
  avatar_url text,
  phone_country_code text,
  phone_local text,
  phone_number text,
  phone_verified boolean,
  whatsapp_country_code text,
  whatsapp_local text,
  whatsapp_number text,
  whatsapp_verified boolean,
  zip_code text,
  birth_date date,
  available boolean,
  availability_status text,
  available_from date,
  work_preference text,
  work_preferences text[],
  availability_confirmed_at timestamptz,
  last_active_at timestamptz,
  updated_at timestamptz,
  profile_visibility text,
  discoverable boolean,
  total_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with eligible as (
    select profile.*
    from public.atsrs_talent_profiles profile
    where profile.discoverable = true
      and profile.profile_visibility = 'Public'
      and exists (
        select 1
        from public.atsrs_personnel_certificates certificate
        join public.atsrs_files file
          on file.id = certificate.file_id
         and file.user_id = certificate.workspace_user_id
         and file.account_type = certificate.workspace_account_type
         and file.category = 'document'
        where certificate.workspace_user_id = profile.user_id
          and certificate.workspace_account_type = 'personal'
      )
  ), counted as (
    select count(*)::bigint as total_count from eligible
  )
  select
    profile.user_id,
    profile.name,
    profile.surname,
    profile.position,
    profile.country,
    profile.company,
    profile.avatar_url,
    profile.phone_country_code,
    profile.phone_local,
    profile.phone_number,
    profile.phone_verified,
    profile.whatsapp_country_code,
    profile.whatsapp_local,
    profile.whatsapp_number,
    profile.whatsapp_verified,
    profile.zip_code,
    profile.birth_date,
    profile.available,
    profile.availability_status,
    profile.available_from,
    profile.work_preference,
    profile.work_preferences,
    profile.availability_confirmed_at,
    profile.last_active_at,
    profile.updated_at,
    profile.profile_visibility,
    profile.discoverable,
    counted.total_count
  from eligible profile
  cross join counted
  where p_before_active_at is null
     or profile.last_active_at < p_before_active_at
     or (
       profile.last_active_at = p_before_active_at
       and p_before_user_id is not null
       and profile.user_id > p_before_user_id
     )
  order by profile.last_active_at desc, profile.user_id asc
  limit greatest(1, least(coalesce(p_limit, 31), 101));
$$;

revoke all on function public.atsrs_talent_directory_page(integer, timestamptz, uuid)
  from public, anon, authenticated;
grant execute on function public.atsrs_talent_directory_page(integer, timestamptz, uuid)
  to service_role;

comment on function public.atsrs_reconcile_talent_profile_from_workspace(uuid) is
  'Builds the Candidate projection from the authoritative Personal profile; missing display fields receive non-sensitive fallbacks.';
comment on function public.atsrs_sync_talent_visibility_from_workspace() is
  'Idempotently reconciles Candidate projection and visibility from the authoritative Personal profile.';
comment on function public.atsrs_talent_directory_page(integer, timestamptz, uuid) is
  'Service-only Candidate page: Public Personal projection plus at least one canonical certificate linked to a persisted Personal document.';

