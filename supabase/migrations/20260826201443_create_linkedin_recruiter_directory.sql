create table if not exists public.atsrs_recruiters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  role_title text,
  location text,
  linkedin_url text not null,
  source text not null default 'linkedin',
  status text not null default 'active',
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint atsrs_recruiters_name_present check (btrim(name) <> ''),
  constraint atsrs_recruiters_linkedin_url check (linkedin_url ~* '^https://([a-z]{2}\.)?linkedin\.com/in/'),
  constraint atsrs_recruiters_source_check check (source = 'linkedin'),
  constraint atsrs_recruiters_status_check check (status in ('active', 'inactive')),
  constraint atsrs_recruiters_nurlan_jafarov_exclusion check (lower(regexp_replace(btrim(name), '\s+', ' ', 'g')) <> 'nurlan jafarov'),
  constraint atsrs_recruiters_linkedin_url_unique unique (linkedin_url)
);

comment on table public.atsrs_recruiters is
  'Verified public LinkedIn recruiter profiles shown in the ATSRS Recruiter directory. Nurlan Jafarov is explicitly excluded by Owner instruction.';

create index if not exists atsrs_recruiters_active_name_idx
  on public.atsrs_recruiters (status, lower(name));

alter table public.atsrs_recruiters enable row level security;

create policy atsrs_recruiters_authenticated_read
on public.atsrs_recruiters
for select
to authenticated
using (status = 'active' or (select atsrs_private.is_jobs_admin()));

create policy atsrs_recruiters_admin_insert
on public.atsrs_recruiters
for insert
to authenticated
with check ((select atsrs_private.is_jobs_admin()));

create policy atsrs_recruiters_admin_update
on public.atsrs_recruiters
for update
to authenticated
using ((select atsrs_private.is_jobs_admin()))
with check ((select atsrs_private.is_jobs_admin()));

create policy atsrs_recruiters_admin_delete
on public.atsrs_recruiters
for delete
to authenticated
using ((select atsrs_private.is_jobs_admin()));

revoke all on table public.atsrs_recruiters from public, anon, authenticated, service_role;
grant select on table public.atsrs_recruiters to authenticated;
grant insert, update, delete on table public.atsrs_recruiters to authenticated;

insert into public.atsrs_recruiters (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Marie Owen', 'PR Offshore Services Ltd', 'Offshore recruitment', 'United Kingdom', 'https://uk.linkedin.com/in/marie-owen-a4404551', '2026-08-27T00:00:00+04:00'),
  ('Emmanuel Escabillo', 'iPS Powerful People', 'Medior Recruiter', 'Dubai, United Arab Emirates', 'https://ae.linkedin.com/in/emmanuel-escabillo-922a042ab', '2026-08-27T00:00:00+04:00'),
  ('Eva Mak', 'Subsea7', 'Talent acquisition and HR', 'Singapore', 'https://sg.linkedin.com/in/eva-mak-06a5b4247', '2026-08-27T00:00:00+04:00'),
  ('Paul Freeland', 'SYNNRGi Offshore', 'Offshore staffing and operations', 'United Kingdom', 'https://uk.linkedin.com/in/paul-freeland-aa5077b5', '2026-08-27T00:00:00+04:00'),
  ('Aaliyah Thurkettle', 'Darwin Recruitment', 'Recruitment Consultant', 'Netherlands', 'https://nl.linkedin.com/in/aaliyah-thurkettle-2b361a38b', '2026-08-27T00:00:00+04:00'),
  ('Mike Tann', 'Select Offshore', 'Founder and offshore recruitment leader', 'United Kingdom', 'https://uk.linkedin.com/in/miketann', '2026-08-27T00:00:00+04:00'),
  ('Lesley Mathieson', 'Noble Drilling', 'Recruitment and talent professional', 'United Kingdom', 'https://uk.linkedin.com/in/lesley-mathieson-28642975', '2026-08-27T00:00:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();
