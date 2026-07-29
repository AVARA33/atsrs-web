create or replace function public.enforce_atsrs_talent_profile_visibility()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.profile_visibility <> 'Public' then
    new.discoverable := false;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_atsrs_talent_profile_visibility
  on public.atsrs_talent_profiles;

create trigger enforce_atsrs_talent_profile_visibility
before insert or update of discoverable, profile_visibility
on public.atsrs_talent_profiles
for each row
execute function public.enforce_atsrs_talent_profile_visibility();

update public.atsrs_talent_profiles
set discoverable = false
where profile_visibility <> 'Public'
  and discoverable = true;;
