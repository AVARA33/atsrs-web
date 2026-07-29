alter table public.atsrs_talent_profiles
  add column if not exists profile_visibility text not null default 'Public';

alter table public.atsrs_talent_profiles
  drop constraint if exists atsrs_talent_profiles_profile_visibility_check;

alter table public.atsrs_talent_profiles
  add constraint atsrs_talent_profiles_profile_visibility_check
  check (profile_visibility in ('Private', 'Link Only', 'Public'));

drop policy if exists "Companies can discover complete talent profiles"
  on public.atsrs_talent_profiles;

create policy "Companies can discover public talent profiles"
on public.atsrs_talent_profiles
for select
to authenticated
using (
  discoverable = true
  and profile_visibility = 'Public'
  and exists (
    select 1
    from public.atsrs_workspaces workspace
    where workspace.user_id = (select auth.uid())
      and workspace.account_type = 'company'
  )
);;
