begin;

-- V315 shipped a Public database default while the account UI defaulted to
-- Private. Existing Public rows cannot be distinguished from rows created by
-- that unsafe database default, so require an explicit re-publication.
alter table public.atsrs_talent_profiles
  alter column profile_visibility set default 'Private';

update public.atsrs_talent_profiles
set profile_visibility = 'Private',
    discoverable = false,
    updated_at = now()
where profile_visibility = 'Public';

-- Never grant companies SELECT on the base profile table: it also contains
-- phone, WhatsApp, birth date, postal code and other private fields.
drop policy if exists "Companies can discover public talent profiles"
  on public.atsrs_talent_profiles;

drop function if exists public.atsrs_list_public_talent_profiles();
create function public.atsrs_list_public_talent_profiles()
returns table (
  user_id uuid,
  name text,
  surname text,
  position text,
  country text,
  company text,
  avatar_url text,
  available boolean,
  availability_status text,
  available_from date,
  work_preference text,
  work_preferences text[],
  availability_confirmed_at timestamptz,
  last_active_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.atsrs_workspaces as workspace
    where workspace.user_id = auth.uid()
      and workspace.account_type = 'company'
  ) then
    raise exception 'A Corporate workspace is required.' using errcode = '42501';
  end if;

  return query
  select
    profile.user_id,
    profile.name,
    profile.surname,
    profile.position,
    profile.country,
    profile.company,
    profile.avatar_url,
    profile.available,
    profile.availability_status,
    profile.available_from,
    profile.work_preference,
    profile.work_preferences,
    profile.availability_confirmed_at,
    profile.last_active_at,
    profile.updated_at
  from public.atsrs_talent_profiles as profile
  where profile.discoverable = true
    and profile.profile_visibility = 'Public';
end;
$$;

revoke all on function public.atsrs_list_public_talent_profiles() from public, anon;
grant execute on function public.atsrs_list_public_talent_profiles() to authenticated;

-- A failed provider call should not consume the user's monthly allowance. Only
-- the service-role Edge Function may release a reservation.
create or replace function public.atsrs_release_ai_scan(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows integer;
  v_period date := date_trunc('month', timezone('UTC', now()))::date;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required.' using errcode = '42501';
  end if;

  if p_user_id is null then
    raise exception 'A user id is required.' using errcode = '22023';
  end if;

  update public.atsrs_ai_scan_usage as usage
  set scan_count = greatest(usage.scan_count - 1, 0),
      updated_at = now() - interval '8 seconds'
  where usage.user_id = p_user_id
    and usage.period_start = v_period
    and usage.scan_count > 0;

  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

revoke all on function public.atsrs_release_ai_scan(uuid) from public, anon, authenticated;
grant execute on function public.atsrs_release_ai_scan(uuid) to service_role;

-- Existing production databases already have the V317 function, so harden its
-- lookup path even when the historical migration is not replayed.
alter function public.atsrs_get_admin_overview() set search_path = '';

commit;
