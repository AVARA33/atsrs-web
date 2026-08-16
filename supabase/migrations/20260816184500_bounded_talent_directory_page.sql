-- Return only one deterministic Candidate directory page at a time.
-- Eligibility stays server-side so the client never scans every file owner.
create index if not exists atsrs_talent_profiles_public_activity_idx
  on public.atsrs_talent_profiles (last_active_at desc, user_id asc)
  where discoverable = true and profile_visibility = 'Public';

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
set search_path = public, pg_temp
as $$
  with eligible as (
    select profile.*
    from public.atsrs_talent_profiles profile
    where profile.discoverable = true
      and profile.profile_visibility = 'Public'
      and exists (
        select 1
        from public.atsrs_files file
        where file.user_id = profile.user_id
          and file.account_type = 'personal'
          and file.category = 'document'
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

comment on function public.atsrs_talent_directory_page(integer, timestamptz, uuid) is
  'Service-only bounded Candidate directory projection with certificate eligibility and keyset pagination.';
