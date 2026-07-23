alter table public.atsrs_talent_profiles
  add column if not exists availability_status text not null default 'not_set',
  add column if not exists available_from date,
  add column if not exists work_preference text not null default 'any',
  add column if not exists availability_confirmed_at timestamptz;

alter table public.atsrs_talent_profiles
  drop constraint if exists atsrs_talent_profiles_availability_status_check,
  add constraint atsrs_talent_profiles_availability_status_check
    check (availability_status in (
      'not_set',
      'available_now',
      'available_from',
      'open_to_offers',
      'not_available'
    )),
  drop constraint if exists atsrs_talent_profiles_work_preference_check,
  add constraint atsrs_talent_profiles_work_preference_check
    check (work_preference in ('any', 'freelance', 'contract', 'permanent')),
  drop constraint if exists atsrs_talent_profiles_available_from_check,
  add constraint atsrs_talent_profiles_available_from_check
    check (
      availability_status <> 'available_from'
      or available_from is not null
    );

create index if not exists atsrs_talent_profiles_availability_idx
  on public.atsrs_talent_profiles (
    availability_status,
    available_from,
    work_preference
  )
  where discoverable = true;

create table if not exists public.atsrs_system_status (
  status_key text primary key,
  active boolean not null default false,
  title text not null,
  message text not null,
  updated_at timestamptz not null default now(),
  constraint atsrs_system_status_key_length
    check (char_length(status_key) between 2 and 60),
  constraint atsrs_system_status_title_length
    check (char_length(title) between 2 and 140),
  constraint atsrs_system_status_message_length
    check (char_length(message) between 2 and 600)
);

alter table public.atsrs_system_status enable row level security;

revoke all on table public.atsrs_system_status from public, anon, authenticated;
grant all on table public.atsrs_system_status to service_role;

insert into public.atsrs_system_status (
  status_key,
  active,
  title,
  message
)
values (
  'maintenance',
  false,
  'ATSRS improvements are in progress',
  'We are improving ATSRS. Some services may be temporarily unavailable. Please try again shortly. We apologise for the inconvenience and appreciate your patience.'
)
on conflict (status_key) do nothing;

comment on table public.atsrs_system_status is
  'Service-only operational status read by the public read-only system-status Edge Function.';
