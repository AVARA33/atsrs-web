create table if not exists public.atsrs_talent_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  surname text not null,
  position text not null,
  country text not null,
  company text,
  available boolean not null default true,
  discoverable boolean not null default true,
  last_active_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint atsrs_talent_profiles_name_present check (length(btrim(name)) > 0),
  constraint atsrs_talent_profiles_surname_present check (length(btrim(surname)) > 0),
  constraint atsrs_talent_profiles_position_present check (length(btrim(position)) > 0),
  constraint atsrs_talent_profiles_country_present check (length(btrim(country)) > 0)
);

create index if not exists atsrs_talent_profiles_discovery_idx
  on public.atsrs_talent_profiles (discoverable, available, last_active_at desc);
create index if not exists atsrs_talent_profiles_position_idx
  on public.atsrs_talent_profiles (lower(position));
create index if not exists atsrs_talent_profiles_country_idx
  on public.atsrs_talent_profiles (lower(country));

alter table public.atsrs_talent_profiles enable row level security;

drop policy if exists "Talent owners can view their profile" on public.atsrs_talent_profiles;
create policy "Talent owners can view their profile"
  on public.atsrs_talent_profiles for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Companies can discover complete talent profiles" on public.atsrs_talent_profiles;
create policy "Companies can discover complete talent profiles"
  on public.atsrs_talent_profiles for select to authenticated
  using (
    discoverable
    and exists (
      select 1
      from public.atsrs_workspaces workspace
      where workspace.user_id = (select auth.uid())
        and workspace.account_type = 'company'
    )
  );

drop policy if exists "Talent owners can publish their profile" on public.atsrs_talent_profiles;
create policy "Talent owners can publish their profile"
  on public.atsrs_talent_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Talent owners can update their profile" on public.atsrs_talent_profiles;
create policy "Talent owners can update their profile"
  on public.atsrs_talent_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Talent owners can remove their profile" on public.atsrs_talent_profiles;
create policy "Talent owners can remove their profile"
  on public.atsrs_talent_profiles for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.atsrs_talent_profiles from anon;
grant select, insert, update, delete on table public.atsrs_talent_profiles to authenticated;
grant all on table public.atsrs_talent_profiles to service_role;

insert into public.atsrs_talent_profiles (
  user_id, name, surname, position, country, company, available, discoverable, last_active_at, updated_at
)
select
  data.user_id,
  btrim(profile.value->>'name'),
  btrim(profile.value->>'surname'),
  btrim(profile.value->>'position'),
  btrim(profile.value->>'country'),
  nullif(btrim(profile.value->>'company'), ''),
  true,
  true,
  now(),
  now()
from public.atsrs_workspace_data data
cross join lateral (
  select (data.payload->>'value')::jsonb as value
) profile
where data.account_type = 'personal'
  and data.data_key like '%_personal_profile'
  and length(btrim(profile.value->>'name')) > 0
  and length(btrim(profile.value->>'surname')) > 0
  and length(btrim(profile.value->>'position')) > 0
  and length(btrim(profile.value->>'country')) > 0
on conflict (user_id) do update set
  name = excluded.name,
  surname = excluded.surname,
  position = excluded.position,
  country = excluded.country,
  company = excluded.company,
  discoverable = true,
  updated_at = now();
