-- Fresh Personal profiles may not yet have directory visibility or availability.
-- Treat SQL NULL as an unset/invalid value instead of allowing three-valued
-- NOT IN semantics to reach NOT NULL projection columns.

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
  if requested_visibility is null
     or requested_visibility not in ('Private', 'Link Only', 'Public') then
    return;
  end if;

  requested_status := source_profile ->> 'availabilityStatus';
  if requested_status is null or requested_status not in (
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
    user_id, name, surname, "position", country, company, available,
    discoverable, last_active_at, updated_at, availability_status,
    available_from, profile_visibility
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

comment on function public.atsrs_reconcile_talent_profile_from_workspace(uuid) is
  'Projects complete owner-controlled Personal profiles into the Candidate directory; incomplete profiles remain private and do not fail workspace writes.';
