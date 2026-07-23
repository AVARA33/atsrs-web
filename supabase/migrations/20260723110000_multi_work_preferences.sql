alter table public.atsrs_talent_profiles
  add column if not exists work_preferences text[] not null default array['any']::text[];

update public.atsrs_talent_profiles
set work_preferences = case
  when work_preference in ('freelance', 'contract', 'permanent')
    then array[work_preference]::text[]
  else array['any']::text[]
end
where work_preferences = array['any']::text[]
  and work_preference <> 'any';

alter table public.atsrs_talent_profiles
  drop constraint if exists atsrs_talent_profiles_work_preferences_check,
  add constraint atsrs_talent_profiles_work_preferences_check
    check (
      cardinality(work_preferences) between 1 and 3
      and work_preferences <@ array['any', 'freelance', 'contract', 'permanent']::text[]
      and (
        work_preferences = array['any']::text[]
        or not ('any' = any(work_preferences))
      )
    );

create index if not exists atsrs_talent_profiles_work_preferences_idx
  on public.atsrs_talent_profiles using gin (work_preferences)
  where discoverable = true;
