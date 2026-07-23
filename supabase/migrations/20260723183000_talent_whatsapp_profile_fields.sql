alter table public.atsrs_talent_profiles
  add column if not exists whatsapp_country_code text,
  add column if not exists whatsapp_local text,
  add column if not exists whatsapp_number text,
  add column if not exists whatsapp_verified boolean not null default false;
