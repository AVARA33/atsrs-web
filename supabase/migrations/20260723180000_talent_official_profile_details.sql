alter table public.atsrs_talent_profiles
  add column if not exists phone_country_code text,
  add column if not exists phone_local text,
  add column if not exists phone_number text,
  add column if not exists phone_verified boolean not null default false,
  add column if not exists zip_code text,
  add column if not exists birth_date date,
  add column if not exists stcw_number text,
  add column if not exists stcw_verified boolean not null default false;

comment on column public.atsrs_talent_profiles.phone_country_code is
  'Selected international calling code for the public candidate profile.';
comment on column public.atsrs_talent_profiles.phone_verified is
  'True only after ATSRS verification workflow confirms the number.';
comment on column public.atsrs_talent_profiles.stcw_verified is
  'True only after ATSRS verification workflow confirms the STCW or seafarer identifier.';
