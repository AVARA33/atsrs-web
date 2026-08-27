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
  constraint atsrs_recruiters_linkedin_url check (linkedin_url ~* '^https://([a-z]{2}\.|www\.)?linkedin\.com/in/'),
  constraint atsrs_recruiters_source_check check (source = 'linkedin'),
  constraint atsrs_recruiters_status_check check (status in ('active', 'inactive')),
  constraint atsrs_recruiters_nurlan_jafarov_exclusion check (
    translate(lower(regexp_replace(btrim(name), '\s+', ' ', 'g')), 'əç', 'ac')
      !~ '^nurlan (jafarov|cafarov|ceferov)$'
  ),
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

insert into public.atsrs_recruiters (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Deepa G.', 'Petrofac', 'Talent Acquisition and Recruitment Operations Leader', 'Sharjah, United Arab Emirates', 'https://www.linkedin.com/in/deepagomathinayagam/', '2026-08-27T17:00:00+04:00'),
  ('Preeya Shetty', 'Petrofac', 'Talent Acquisition Professional', 'Maharashtra, India', 'https://www.linkedin.com/in/preeya-shetty-assoc-cipd-b5ab4756/', '2026-08-27T17:00:00+04:00'),
  ('Nithya Sree', 'Petrofac', 'Talent Acquisition Professional', 'Chennai, India', 'https://www.linkedin.com/in/nithya-sree-393588225/', '2026-08-27T17:00:00+04:00'),
  ('Carolyn Milne', 'Petrofac', 'HR and Workforce Recruitment Manager', 'Aberdeen, United Kingdom', 'https://www.linkedin.com/in/carolyn-milne-07704043/', '2026-08-27T17:00:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Ryan Pattison', 'JDR Cable Systems', 'Resourcing Specialist', 'Blyth, United Kingdom', 'https://www.linkedin.com/in/ryan-pattison-a80579203/', '2026-08-27T16:45:00+04:00'),
  ('Stephanie Foley', 'JDR Cable Systems', 'Resourcing Specialist', 'Jarrow, United Kingdom', 'https://www.linkedin.com/in/stephanie-foley-7517103b/', '2026-08-27T16:45:00+04:00'),
  ('Jewel Shepherd-Fields', 'JDR Cable Systems', 'Human Resources Professional', 'Tomball, United States', 'https://www.linkedin.com/in/jewel-shepherd-fields-85817a12/', '2026-08-27T16:45:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Paul Sanderson', 'Siemens Gamesa', 'Talent Acquisition Team Lead', 'Newcastle upon Tyne, United Kingdom', 'https://www.linkedin.com/in/paulsandersonrec/', '2026-08-27T16:30:00+04:00'),
  ('Manjunath Nanjundappa', 'Siemens Gamesa', 'Talent Acquisition Leader', 'Bengaluru, India', 'https://www.linkedin.com/in/manjunath-nanjundappa-2b8b9395/', '2026-08-27T16:30:00+04:00'),
  ('Sabrina Picard', 'Siemens Gamesa', 'Recruitment Manager', 'Le Havre, France', 'https://www.linkedin.com/in/sabrina-picard/', '2026-08-27T16:30:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Lianne Dowie', 'Shell', 'Talent Acquisition Manager / Talent Attraction Specialist', 'London, United Kingdom', 'https://www.linkedin.com/in/lianne-dowie/', '2026-08-27T16:15:00+04:00'),
  ('Ashwath Kumar', 'Shell', 'Recruitment Specialist', 'Bengaluru, India', 'https://www.linkedin.com/in/ashwath-recruitment-specialist/', '2026-08-27T16:15:00+04:00'),
  ('Jess Garvey', 'Shell', 'Head of Resourcing — Trading & Supply', 'London, United Kingdom', 'https://www.linkedin.com/in/jess-garvey-a0734213/', '2026-08-27T16:15:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Hannah Rodger', 'Elevate Offshore', 'Account Manager — Offshore Subsea Recruitment', 'Great Yarmouth, United Kingdom', 'https://www.linkedin.com/in/hannahrodger1/', '2026-08-27T16:00:00+04:00'),
  ('Jodie Blakeway', 'Elevate Offshore', 'Offshore Recruitment Account Manager', 'Newquay, United Kingdom', 'https://www.linkedin.com/in/jodie-blakeway-0b891883/', '2026-08-27T16:00:00+04:00'),
  ('Sean Donovan', 'Elevate Offshore', 'Offshore Survey Recruitment Consultant', 'Truro, United Kingdom', 'https://www.linkedin.com/in/sean-donovan-66019b22b/', '2026-08-27T16:00:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Luke Stapley', 'Archer', 'Offshore Recruitment Consultant', 'Fareham, United Kingdom', 'https://www.linkedin.com/in/luke-stapley-7279b81a3/', '2026-08-27T15:30:00+04:00'),
  ('Tom O''Connor', 'Archer', 'Offshore Recruitment Consultant', 'Fareham, United Kingdom', 'https://www.linkedin.com/in/tom-o-connor-0a355118a/', '2026-08-27T15:30:00+04:00'),
  ('Hallum Russell', 'Archer', 'Offshore Recruitment Consultant — ROV, Survey & Inspection', 'Gosport, United Kingdom', 'https://www.linkedin.com/in/hallum-russell-20402326b/', '2026-08-27T15:30:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Brian Lie', 'LEVEL Offshore', 'Recruitment Specialist', 'Stavanger, Norway', 'https://no.linkedin.com/in/brianlie', '2026-08-27T22:00:00+04:00'),
  ('Kaj-Stian Apeland', 'LEVEL Offshore', 'Resource Coordinator — Survey & Inspection', 'Haugesund, Norway', 'https://no.linkedin.com/in/kaj-stian-apeland-059a92235', '2026-08-27T22:00:00+04:00'),
  ('Andreas Gilje Heiberg', 'LEVEL Offshore', 'Resource Coordinator — UK Deck Personnel', 'Haugesund, Norway', 'https://no.linkedin.com/in/andreas-gilje-heiberg-622bb1306', '2026-08-27T22:00:00+04:00'),
  ('Kaia Leirvik Haga', 'LEVEL Offshore', 'Resource Coordinator — Scandinavian Deck Personnel & Medics', 'Haugesund, Norway', 'https://no.linkedin.com/in/kaia-leirvik-haga-742635153', '2026-08-27T22:00:00+04:00'),
  ('Eva Dobreva', 'LEVEL Offshore', 'Operation Manager — Shift Supervisors & Offshore Managers', 'Stavanger/Sandnes, Norway', 'https://no.linkedin.com/in/eva-dobreva-ab070777', '2026-08-27T22:00:00+04:00'),
  ('Phil Hargreaves FIRP', 'HPR (UK)', 'Personnel Operations Supervisor', 'Greater Aberdeen Area, United Kingdom', 'https://uk.linkedin.com/in/philhargreaves-hpr-recruitingsubseapersonnel', '2026-08-27T22:00:00+04:00'),
  ('Lucy Petrie', 'HPR (UK)', 'Senior Personnel Coordinator', 'Inverurie, Scotland, United Kingdom', 'https://uk.linkedin.com/in/lucy-petrie-a4672353', '2026-08-27T22:00:00+04:00'),
  ('Diane Ritchie', 'HPR (UK)', 'Personnel Coordinator', 'Aberdeenshire, Scotland, United Kingdom', 'https://uk.linkedin.com/in/diane-ritchie-hpruk', '2026-08-27T22:00:00+04:00'),
  ('Emma Duncan', 'HPR (UK)', 'Senior Personnel Coordinator', 'Greater Aberdeen Area, United Kingdom', 'https://uk.linkedin.com/in/emma-duncan-46a6927a', '2026-08-27T22:00:00+04:00'),
  ('Michele Stuart', 'HPR (UK)', 'Personnel Coordinator', 'Inverurie, Scotland, United Kingdom', 'https://uk.linkedin.com/in/michele-stuart-673191285', '2026-08-27T22:00:00+04:00'),
  ('Emil Tjoflot Aase', 'LEVEL Offshore', 'Resource Coordinator — ROV Pilot/Technicians', 'Haugesund, Norway', 'https://www.linkedin.com/in/emil-tjoflot-aase-7a9907113', '2026-08-27T22:30:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Gavin Beaton', 'Orion Group', 'Group Recruitment Director', 'Inverness, Scotland, United Kingdom', 'https://uk.linkedin.com/in/gavinbeaton', '2026-08-28T09:00:00+04:00'),
  ('Gary Chapman', 'Orion Group', 'Recruitment Manager — International Oil & Gas', 'Manchester, United Kingdom', 'https://uk.linkedin.com/in/gary-chapman-b15909b', '2026-08-28T09:00:00+04:00'),
  ('Shiela Corral', 'Vestas', 'Talent Acquisition / Sourcing Specialist', 'Metro Manila, Philippines', 'https://ph.linkedin.com/in/shielacorral', '2026-08-28T09:00:00+04:00'),
  ('Shane Stec', 'Vestas', 'Director — DEI Talent Acquisition Programs', 'United States', 'https://www.linkedin.com/in/shanestec', '2026-08-28T09:00:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Ujjawal Sah', 'Wood', 'HR Administrator — Global Recruitment Support', 'Gurugram, India', 'https://in.linkedin.com/in/ujjawal-sah-hr', '2026-08-28T09:20:00+04:00'),
  ('Onam Sukhija', 'Wood', 'HR Operations — EMEA Employee Lifecycle', 'Gurugram, India', 'https://in.linkedin.com/in/onam-sukhija-9743a9282', '2026-08-28T09:20:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Eliete Bardela', 'DOF Group', 'Senior Benefits Analyst — Human Resources', 'Macaé, Brazil', 'https://br.linkedin.com/in/eliete-bardela-6b322176', '2026-08-28T09:40:00+04:00'),
  ('Laís Barroso', 'DOF Group', 'Recruitment and Selection Analyst', 'Rio de Janeiro, Brazil', 'https://br.linkedin.com/in/la%C3%ADs-barroso-aaba7a93', '2026-08-28T09:40:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Madeleine París', 'A.P. Moller - Maersk', 'Talent Acquisition Specialist', 'Heredia, Costa Rica', 'https://cr.linkedin.com/in/madeleine-par%C3%ADs', '2026-08-27T01:30:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

update public.atsrs_recruiters
set company = 'Atlas Professionals',
    updated_at = now()
where company = 'Atlas NextWave';

insert into public.atsrs_recruiters (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Andreea Eugenia Coconasu', 'AECOM', 'Talent Acquisition Partner', 'Bucharest, Romania', 'https://ro.linkedin.com/in/andreea-eugenia-coconasu-8b636a119', '2026-08-27T01:40:00+04:00'),
  ('Alina-Mihaela Popescu', 'AECOM', 'Senior Talent Acquisition Partner — UK&I, MEA, India, Spain & Poland', 'Bucharest, Romania', 'https://ro.linkedin.com/in/alina-mihaela-popescu-60853713', '2026-08-27T01:40:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Brenda Laughlin', 'NOV', 'HR Manager', 'Houston, United States', 'https://www.linkedin.com/in/brenda-laughlin-026a233', '2026-08-27T01:50:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Paul Devaraj', 'NOV', 'Country HR Manager', 'Kuala Lumpur, Malaysia', 'https://my.linkedin.com/in/paul-devaraj-85465074', '2026-08-27T02:00:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Simon Halliday', 'Weatherford', 'Technical Talent Acquisition Director', 'United Arab Emirates', 'https://ae.linkedin.com/in/simonhalliday75', '2026-08-27T02:10:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Kim Pommer', 'Weatherford', 'Senior Recruiter', 'United States', 'https://www.linkedin.com/in/kim-pommer-b8500318', '2026-08-27T02:20:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters
  (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Emmanuel Ogunleye', 'Select Offshore', 'Recruitment Consultant — Offshore', 'Colchester, United Kingdom', 'https://uk.linkedin.com/in/emmanuel-ogunleye-1845b0235', '2026-08-27T19:05:00+04:00'),
  ('Jana Fatková', 'Siemens', 'Senior Talent Acquisition Partner & AI Ambassador', 'Prague, Czechia', 'https://cz.linkedin.com/in/fatkovajana', '2026-08-27T19:05:00+04:00'),
  ('Clyde D''Mello', 'Baker Hughes', 'Global Talent Acquisition & Human Resources Leader', 'Houston, Texas, United States', 'https://www.linkedin.com/in/clydedmello', '2026-08-27T19:05:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters
  (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Mike Hardiman', 'AMS', 'Talent Acquisition & Recruiting Professional', 'Albuquerque–Santa Fe, United States', 'https://www.linkedin.com/in/recruiterhardiman', '2026-08-27T19:00:00+04:00'),
  ('Archana Kale', 'AMS', 'HR Operations & Talent Acquisition Professional', 'Pune, India', 'https://in.linkedin.com/in/archana-kale-a23502145', '2026-08-27T19:00:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters
  (name, company, role_title, location, linkedin_url, verified_at)
values
  ('María José Hornig Mateluna', 'Siemens Gamesa', 'HR Business Partner', 'Santiago, Chile', 'https://cl.linkedin.com/in/mar%C3%ADa-jos%C3%A9-hornig-mateluna-06a769224', '2026-08-27T18:55:00+04:00'),
  ('Harinath Reddy', 'A.P. Moller - Maersk', 'Talent Acquisition Professional', 'Bengaluru, India', 'https://in.linkedin.com/in/harinath-reddy-hr', '2026-08-27T18:55:00+04:00'),
  ('Aleksandra Ziajka', 'A.P. Moller - Maersk', 'Talent Acquisition Partner', 'Kraków, Poland', 'https://pl.linkedin.com/in/adebska', '2026-08-27T18:55:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters
  (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Rosie Cole', 'GE Vernova', 'US Talent Acquisition Lead', 'Chicago, Illinois, United States', 'https://www.linkedin.com/in/rosiecole', '2026-08-27T18:50:00+04:00'),
  ('Daniel Manner', 'GE Vernova', 'Talent Acquisition Professional', 'Chicago, Illinois, United States', 'https://www.linkedin.com/in/danielmanner', '2026-08-27T18:50:00+04:00'),
  ('Silvia Sava', 'GE Vernova', 'Senior Talent Acquisition Partner — Central Europe', 'Bucharest, Romania', 'https://ro.linkedin.com/in/silvia-sava', '2026-08-27T18:50:00+04:00'),
  ('Denisse Acosta', 'A.P. Moller - Maersk', 'Recruitment Specialist / HR Generalist', 'Downey, California, United States', 'https://www.linkedin.com/in/denisseacosta', '2026-08-27T18:50:00+04:00'),
  ('Xenia Cunningham', 'A.P. Moller - Maersk', 'Recruitment & Talent Acquisition Professional', 'Salt Lake City, Utah, United States', 'https://www.linkedin.com/in/erin-m-cunningham', '2026-08-27T18:50:00+04:00'),
  ('Jeanine Zucca', 'GE Vernova', 'Talent Advisor / Recruiter', 'Albany, New York, United States', 'https://www.linkedin.com/in/jeaninezuccata', '2026-08-27T18:50:00+04:00'),
  ('Tessa Nguyen', 'GE Vernova', 'Talent Acquisition Partner — Early Talent', 'South Carolina, United States', 'https://www.linkedin.com/in/tessamnguyen', '2026-08-27T18:50:00+04:00'),
  ('Tom Scholey', 'GE Vernova', 'Talent Acquisition Partner — Europe', 'United Kingdom', 'https://uk.linkedin.com/in/tom-scholey-622b2395', '2026-08-27T18:50:00+04:00'),
  ('Sonia Macsim-Grunfeld', 'Siemens Gamesa', 'Senior Talent Acquisition Partner', 'Romania', 'https://ro.linkedin.com/in/sonia-grunfeld', '2026-08-27T18:50:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters
  (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Sonia Gómez Marrasé', 'Ørsted', 'Talent Acquisition Consultant', 'Copenhagen, Denmark', 'https://dk.linkedin.com/in/soniagomeztalentacquisitionrecruiter', '2026-08-27T18:45:00+04:00'),
  ('Helle Mørk Guldborg', 'Vestas', 'Talent Acquisition Partner', 'Copenhagen, Denmark', 'https://dk.linkedin.com/in/helle-m%C3%B8rk-guldborg-919427aa', '2026-08-27T18:45:00+04:00'),
  ('Derek Murphy-Johnson', 'Vestas', 'Talent Acquisition Leader', 'Copenhagen, Denmark', 'https://dk.linkedin.com/in/hrderek', '2026-08-27T18:45:00+04:00'),
  ('Alex Madsen', 'Vestas', 'Talent Acquisition Partner — Manufacturing NCE', 'Vejle, Denmark', 'https://dk.linkedin.com/in/alex-madsen-0815b4a6', '2026-08-27T18:45:00+04:00'),
  ('Nina Ramsland Worts', 'Equinor', 'Senior Talent Acquisition Consultant', 'Stavanger, Norway', 'https://no.linkedin.com/in/nina-worts', '2026-08-27T18:45:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters
  (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Kersten Metz', 'Baker Hughes', 'Global Executive Recruiting Director', 'Houston, Texas, United States', 'https://www.linkedin.com/in/kerstenmetz', '2026-08-27T18:40:00+04:00'),
  ('Harry Cornell', 'Shell', 'Recruiter / Talent Acquisition Partner', 'Chelmsford, United Kingdom', 'https://uk.linkedin.com/in/harry-cornell-assoc-cipd', '2026-08-27T18:40:00+04:00'),
  ('Nicole Appleby Schlegel', 'Shell', 'Talent Acquisition Professional', 'Houston, Texas, United States', 'https://www.linkedin.com/in/nicolejschlegel', '2026-08-27T18:40:00+04:00'),
  ('Vickie Nicholson', 'Baker Hughes', 'Talent Acquisition — Oil & Gas and Energy', 'Aberdeen, United Kingdom', 'https://uk.linkedin.com/in/vickienicholson', '2026-08-27T18:40:00+04:00'),
  ('Shalena Shaheed', 'NES Fircroft', 'Talent Acquisition Professional — Baker Hughes RPO', 'Houston, Texas, United States', 'https://www.linkedin.com/in/shalena-shaheed-955b5144', '2026-08-27T18:40:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters
  (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Iris Turban', 'Halliburton', 'Talent Acquisition & University Relations', 'Mexico', 'https://mx.linkedin.com/in/iris-turban1106', '2026-08-27T18:35:00+04:00'),
  ('Nicola Cantlay', 'Halliburton', 'HR Operations Partner', 'United Kingdom', 'https://uk.linkedin.com/in/nicola-cantlay-58266a48', '2026-08-27T18:35:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters
  (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Shoshana Benavides', 'TechnipFMC', 'Talent Acquisition — Energy', 'Houston, Texas, United States', 'https://www.linkedin.com/in/julia-shoshana-pilloff', '2026-08-27T18:30:00+04:00'),
  ('Lisa Bryant', 'TechnipFMC', 'HR & Talent Acquisition Professional', 'Houston, Texas, United States', 'https://www.linkedin.com/in/lisanbryant', '2026-08-27T18:30:00+04:00'),
  ('Devender Bundela', 'TechnipFMC', 'Talent Acquisition & HR Business Partner', 'Noida, India', 'https://in.linkedin.com/in/devender-bundela-01b92a144', '2026-08-27T18:30:00+04:00'),
  ('Kuldeep Patel', 'TechnipFMC', 'Talent Acquisition Specialist', 'Noida, India', 'https://in.linkedin.com/in/kuldeep0607patel', '2026-08-27T18:30:00+04:00'),
  ('Shalini Singh', 'TechnipFMC', 'Talent Acquisition Professional', 'Hyderabad, India', 'https://in.linkedin.com/in/shalinayasingh', '2026-08-27T18:30:00+04:00'),
  ('Kenneth Strand Liland', 'SLB', 'Global Business Services Talent Acquisition Manager', 'Bucharest, Romania', 'https://ro.linkedin.com/in/kenneth-strand-liland-04140174', '2026-08-27T18:30:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters
  (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Linda Boone', 'DOF Group', 'Human Resources Professional', 'Houston, Texas, United States', 'https://www.linkedin.com/in/linda-boone', '2026-08-27T18:25:00+04:00'),
  ('Joost Bremmer', 'Boskalis', 'Talent & Staffing Specialist', 'Papendrecht, Netherlands', 'https://nl.linkedin.com/in/talentstaffingspecialist', '2026-08-27T18:25:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters
  (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Andreea Călina', 'Saipem', 'HR Development — Recruitment', 'Ploiești, Romania', 'https://ro.linkedin.com/in/calina-andreea', '2026-08-27T18:20:00+04:00'),
  ('Claudine Aina Garcia', 'Saipem', 'Recruitment Officer', 'Doha, Qatar', 'https://qa.linkedin.com/in/claudine-aina-garcia-204078272', '2026-08-27T18:20:00+04:00'),
  ('Cristina Coroian', 'Saipem', 'HR Manager / Europe HR Focal Point', 'Bucharest, Romania', 'https://ro.linkedin.com/in/cristina-coroian-b9339866', '2026-08-27T18:20:00+04:00'),
  ('Elena Biasia', 'Saipem', 'Talent Acquisition & HR Business Partner', 'Milan, Italy', 'https://it.linkedin.com/in/elena-biasia-48945b218', '2026-08-27T18:20:00+04:00'),
  ('Sandrine Pradié', 'Saipem', 'HR Business Partner & International Mobility', 'Montigny-le-Bretonneux, France', 'https://fr.linkedin.com/in/sandrine-pradi%C3%A9-2630b3150', '2026-08-27T18:20:00+04:00'),
  ('Snehajith Allath', 'Saipem', 'Business Support Organization & Services Manager', 'Indonesia', 'https://id.linkedin.com/in/sjithu', '2026-08-27T18:20:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters
  (name, company, role_title, location, linkedin_url, verified_at)
values
  ('James Drew', 'Select Offshore', 'Recruitment Specialist — Marine & Offshore Engineering', 'London, United Kingdom', 'https://uk.linkedin.com/in/james-drew-61aa476a', '2026-08-27T18:15:00+04:00'),
  ('Diana Khristichenko', 'Select Offshore', 'Recruitment Consultant — Offshore & Maritime', 'United Kingdom', 'https://uk.linkedin.com/in/diana-khristichenko-4bab3127a', '2026-08-27T18:15:00+04:00'),
  ('Chris Furneaux', 'Select Offshore', 'Recruitment Specialist — Marine & Offshore', 'Billericay, United Kingdom', 'https://uk.linkedin.com/in/chris-furneaux-5367574a', '2026-08-27T18:15:00+04:00'),
  ('Joseph Dee', 'UTM Consultants', 'Recruitment Consultant', 'Bristol, United Kingdom', 'https://uk.linkedin.com/in/joseph-dee-b6b950231', '2026-08-27T18:15:00+04:00'),
  ('Derek Cowan', 'JDR Cable Systems', 'Senior HR Professional', 'Thornaby-on-Tees, United Kingdom', 'https://uk.linkedin.com/in/derek-cowan-mcipd-468b8928', '2026-08-27T18:15:00+04:00'),
  ('Mark Braybrooke', 'JDR Cable Systems', 'Resourcing Specialist', 'Ely, United Kingdom', 'https://uk.linkedin.com/in/mark-braybrooke-9ba54324', '2026-08-27T18:15:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters
  (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Ross MacKay', 'Orion Group', 'Recruitment Manager — Oil & Gas', 'Houston, Texas, United States', 'https://www.linkedin.com/in/rossmackayoilgasrecruiter', '2026-08-27T18:10:00+04:00'),
  ('Ian H.', 'Orion Group', 'Specialist Recruiter — Oil & Gas', 'London, United Kingdom', 'https://uk.linkedin.com/in/ian-h-47460410', '2026-08-27T18:10:00+04:00'),
  ('Amara Nwaogazie', 'Atlas Professionals', 'Recruitment Coordinator', 'Aberdeen, United Kingdom', 'https://uk.linkedin.com/in/amaranwaogazieatlasprofessionals', '2026-08-27T18:10:00+04:00'),
  ('Tim Barlow', 'Atlas Professionals', 'Personnel Coordinator', 'Newquay, United Kingdom', 'https://uk.linkedin.com/in/tim-barlow-726261282', '2026-08-27T18:10:00+04:00'),
  ('Ryne Ferguson', 'Petroplan', 'Senior Recruitment Consultant — Chemicals', 'Houston, Texas, United States', 'https://www.linkedin.com/in/ryne-ferguson', '2026-08-27T18:10:00+04:00'),
  ('Adrian Davidson', 'Orion Group', 'Recruitment Manager — Oil & Gas', 'Inverness, United Kingdom', 'https://uk.linkedin.com/in/adriandavidsonrecruiter', '2026-08-27T18:10:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters
  (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Kim Monteiro', 'Brunel', 'Talent Acquisition & Recruitment Professional', 'Rio de Janeiro, Brazil', 'https://br.linkedin.com/in/kim-monteiro-headhunter', '2026-08-27T18:05:00+04:00'),
  ('Cindy King', 'Brunel', 'Recruiting Manager', 'United States', 'https://www.linkedin.com/in/cindy-king-5912bb3', '2026-08-27T18:05:00+04:00'),
  ('Joy Bolton', 'Brunel', 'Recruitment Consultant — Global Recruitment Centre', 'Greater Manchester, United Kingdom', 'https://uk.linkedin.com/in/joy-bolton-72833528', '2026-08-27T18:05:00+04:00'),
  ('Louis Wainwright', 'Airswift', 'Contract Recruitment Consultant — IT', 'Sale, United Kingdom', 'https://uk.linkedin.com/in/louis-wainwright-0b8a26203', '2026-08-27T18:05:00+04:00'),
  ('Eve Fenwick', 'Airswift', 'IT Recruitment Consultant', 'Manchester, United Kingdom', 'https://uk.linkedin.com/in/eve-fenwick', '2026-08-27T18:05:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Gabriella Coli', 'NES Fircroft', 'Senior Recruitment Consultant', 'Brazil', 'https://www.linkedin.com/in/gabriella-coli-4446483b/', '2026-08-27T17:50:00+04:00'),
  ('Matthew P.', 'NES Fircroft', 'Senior Recruitment Consultant — EMEA Power & Energy', 'Manchester, United Kingdom', 'https://www.linkedin.com/in/matthew-p-7a7742123/', '2026-08-27T17:50:00+04:00'),
  ('Henry Shears', 'NES Fircroft', 'Principal Recruitment Consultant', 'Thornaby-on-Tees, United Kingdom', 'https://www.linkedin.com/in/henry-shears-a44a2b158/', '2026-08-27T17:50:00+04:00'),
  ('Rob Little', 'NES Fircroft', 'Senior Recruitment Consultant', 'Carlisle, United Kingdom', 'https://www.linkedin.com/in/rob-little-21b80236/', '2026-08-27T17:50:00+04:00'),
  ('Verna Trinidad', 'NES Fircroft', 'Senior Recruitment Consultant', 'Muntinlupa, Philippines', 'https://www.linkedin.com/in/verna-trinidad-04261b24/', '2026-08-27T17:50:00+04:00'),
  ('Ivernel B.', 'NES Fircroft', 'Recruitment Consultant — Subsea & Offshore Projects', 'France', 'https://www.linkedin.com/in/ivernel-bavinguila/', '2026-08-27T17:50:00+04:00'),
  ('Elena B.', 'NES Fircroft', 'Recruitment Team Lead / Senior Recruiter', 'Kranj, Slovenia', 'https://www.linkedin.com/in/elenaberce/', '2026-08-27T17:50:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Robert Caldwell', 'Airswift', 'Senior Recruitment Consultant', 'Aberdeen, United Kingdom', 'https://www.linkedin.com/in/robert-caldwell-resourcer/', '2026-08-27T17:40:00+04:00'),
  ('Beatriz Rodrigues', 'Airswift', 'Senior Delivery Consultant / US & Canada Recruiter', 'Rio de Janeiro, Brazil', 'https://www.linkedin.com/in/beatriz-rodrigues-9575b2186/', '2026-08-27T17:40:00+04:00'),
  ('Niamh Gorse', 'Airswift', 'Recruitment Consultant', 'Carlisle, United Kingdom', 'https://www.linkedin.com/in/niamh-gorse-863523218/', '2026-08-27T17:40:00+04:00'),
  ('Andrews Paulino', 'Airswift', 'Senior Delivery Consultant / Oil & Gas Recruiter', 'Rio de Janeiro, Brazil', 'https://www.linkedin.com/in/andrews-paulino-4b7355241/', '2026-08-27T17:40:00+04:00'),
  ('Mariana Luz', 'Airswift', 'Recruiter / Delivery Centre Lead — Europe & Africa', 'Rio de Janeiro, Brazil', 'https://www.linkedin.com/in/mariana-luz-a1b88619a/', '2026-08-27T17:40:00+04:00'),
  ('Angelo Mercado', 'Airswift', 'Principal Recruiter', 'Qatar', 'https://www.linkedin.com/in/angelo-mercado-1b259a32/', '2026-08-27T17:40:00+04:00'),
  ('Nathalia Barbosa', 'Airswift', 'Senior Delivery Consultant / Recruiter', 'United States', 'https://www.linkedin.com/in/nathaliagbarbosa/', '2026-08-27T17:40:00+04:00'),
  ('Barry O''Sullivan', 'Advance Global Recruitment', 'Crewing Manager', 'Georgetown, Guyana', 'https://www.linkedin.com/in/barry-o-sullivan-3b515539/', '2026-08-27T17:40:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Ishwarya Sathish', 'TASNEEF-RINA Business Assurance', 'Recruitment Officer', 'United Arab Emirates', 'https://www.linkedin.com/in/ishwarya-sathish-chrp-22660589/', '2026-08-27T17:30:00+04:00'),
  ('Diana Lisa Cavallina', 'RINA', 'Senior Talent Recruiter', 'Rome, Italy', 'https://www.linkedin.com/in/diana-lisa-cavallina-8a920493/', '2026-08-27T17:30:00+04:00'),
  ('Meghan Robbins', 'RINA', 'Talent Acquisition Specialist', 'London, United Kingdom', 'https://www.linkedin.com/in/meghanrobbins/', '2026-08-27T17:30:00+04:00'),
  ('Arianna Lodigiani', 'RINA', 'Talent Acquisition Specialist', 'Milan, Italy', 'https://www.linkedin.com/in/arianna-lodigiani-0580293b/', '2026-08-27T17:30:00+04:00'),
  ('Cristiano Memè', 'RINA', 'HR Talent Recruiter', 'Rome, Italy', 'https://www.linkedin.com/in/cristiano-mem%C3%A8-hr/', '2026-08-27T17:30:00+04:00'),
  ('Federica Sanfilippo', 'RINA', 'Talent Recruiter', 'Italy', 'https://www.linkedin.com/in/federica-sanfilippo-55a7292a7/', '2026-08-27T17:30:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Elaine Kearns', 'Expro', 'Recruiter — ESSA', 'Aberdeen, United Kingdom', 'https://www.linkedin.com/in/elaine-kearns-55989a212/', '2026-08-27T17:20:00+04:00'),
  ('Anna Andrea N.', 'NOV', 'Head of Talent Acquisition', 'Kuala Lumpur, Malaysia', 'https://www.linkedin.com/in/annanadaraja/', '2026-08-27T17:20:00+04:00'),
  ('Antu Antoney', 'NOV', 'Senior Talent Acquisition Specialist', 'Kochi, India', 'https://www.linkedin.com/in/antu-antoney/', '2026-08-27T17:20:00+04:00'),
  ('Constance Mbah', 'NOV', 'Talent Acquisition Specialist', 'Houston, United States', 'https://www.linkedin.com/in/constance-mbah-402266196/', '2026-08-27T17:20:00+04:00'),
  ('Jaireese Black', 'CB&I', 'Senior Manager — Talent Acquisition', 'Houston, United States', 'https://www.linkedin.com/in/jaireeseblack/', '2026-08-27T17:20:00+04:00'),
  ('Abhinav Khanna', 'Mindlance', 'Recruitment Team Lead', 'United States', 'https://www.linkedin.com/in/abhinav-khanna-913623118/', '2026-08-27T17:20:00+04:00'),
  ('David M.', 'Seequent', 'Talent Acquisition Specialist', 'United Kingdom', 'https://www.linkedin.com/in/david-m-0aaab1142/', '2026-08-27T17:20:00+04:00'),
  ('Lesley Lister', 'Bureau Veritas Group', 'Recruitment Partner — UK & Europe', 'United Kingdom', 'https://www.linkedin.com/in/lesley-lister-45a41698/', '2026-08-27T17:20:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Gulnaz H.', 'AGR', 'Senior Talent Acquisition Specialist', 'Dubai, United Arab Emirates', 'https://www.linkedin.com/in/gulnazhaidarovna/', '2026-08-27T17:10:00+04:00'),
  ('Rufaidah Simah', 'Grab', 'Talent Acquisition Specialist', 'Malaysia', 'https://www.linkedin.com/in/rufaidah-simah/', '2026-08-27T17:10:00+04:00'),
  ('John Stewart', 'Granite Recruitment', 'Lead Recruiter', 'Aberdeen, United Kingdom', 'https://www.linkedin.com/in/link2john/', '2026-08-27T17:10:00+04:00'),
  ('Hafida Bendouhou', 'Petrofac', 'Human Resources / Talent Acquisition & Resourcing Advisor', 'Algiers, Algeria', 'https://www.linkedin.com/in/hafida-bendouhou-333975163/', '2026-08-27T17:10:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Mohamad Chehade', 'Weatherford', 'Senior Recruiter MENA / Talent Acquisition', 'Abu Dhabi, United Arab Emirates', 'https://www.linkedin.com/in/mohamad-chehade-chrp-crp-16ba93173/', '2026-08-27T17:00:00+04:00'),
  ('Marion D.', 'Weatherford', 'Senior Recruiter — Middle East', 'United Kingdom', 'https://www.linkedin.com/in/mariondonagheyhays/', '2026-08-27T17:00:00+04:00'),
  ('Moussa Al-Khayyat', 'Weatherford', 'Senior Recruiter', 'Dammam, Saudi Arabia', 'https://www.linkedin.com/in/moussa-al-khayyat-9505481b2/', '2026-08-27T17:00:00+04:00'),
  ('Asad Al Balushi', 'BESIX', 'Talent Acquisition Partner', 'Dubai, United Arab Emirates', 'https://www.linkedin.com/in/asad-al-balushi/', '2026-08-27T17:00:00+04:00'),
  ('Supranee Silkosessak', 'Tata Consultancy Services', 'Talent Acquisition Lead — Technology', 'Bangkok, Thailand', 'https://www.linkedin.com/in/supranee-silkosessak-a685316/', '2026-08-27T17:00:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Belqadri Taufik', 'Halliburton', 'Global Talent Acquisition — Southeast Asia & Central Asia', 'Kuala Lumpur, Malaysia', 'https://www.linkedin.com/in/belqadri-taufik-130818/', '2026-08-27T16:00:00+04:00'),
  ('Sadiqur Rahman', 'Halliburton', 'Global Talent Acquisition Manager / Lead — MENA', 'Dubai, United Arab Emirates', 'https://www.linkedin.com/in/sadiqurrahman/', '2026-08-27T16:00:00+04:00'),
  ('Gabriela Manes', 'Halliburton', 'Tech Recruiter / Talent Acquisition Analyst', 'Rio de Janeiro, Brazil', 'https://www.linkedin.com/in/gabrielamanes/', '2026-08-27T16:00:00+04:00'),
  ('Abril Navarro', 'Halliburton', 'Talent Acquisition Recruiter Specialist — Argentina', 'Argentina', 'https://www.linkedin.com/in/abril-navarro-959132164/', '2026-08-27T16:00:00+04:00'),
  ('Ankur Singh', 'Halliburton', 'Senior Human Resources Specialist — Talent Acquisition', 'United Arab Emirates', 'https://www.linkedin.com/in/anksin/', '2026-08-27T16:00:00+04:00'),
  ('Carmen Ogle', 'MSIG Specialty Marine', 'Talent Acquisition Lead', 'Randstad, Netherlands', 'https://www.linkedin.com/in/carmen-ogle-352b6733/', '2026-08-27T16:00:00+04:00'),
  ('Michael Auer', 'Fluor Corporation', 'Executive Talent Acquisition', 'Houston, United States', 'https://www.linkedin.com/in/michael-auer-37a83412/', '2026-08-27T16:00:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters (name, company, role_title, location, linkedin_url, verified_at)
values
  ('D Pili', 'SLB', 'Senior Recruiter — Global Talent Acquisition', 'United Arab Emirates', 'https://www.linkedin.com/in/d-pili-ba453233/', '2026-08-27T15:00:00+04:00'),
  ('Nancy Laeng', 'SLB', 'RPO Recruiter', 'Malaysia', 'https://www.linkedin.com/in/nancy-laeng-81036140/', '2026-08-27T15:00:00+04:00'),
  ('Billal Adel Boussadia', 'SLB', 'New Energy Talent Management & Talent Acquisition Manager', 'Calgary, Canada', 'https://www.linkedin.com/in/billal-adel-boussadia-6355545b/', '2026-08-27T15:00:00+04:00'),
  ('Anton Rublevskyi', 'SLB', 'Talent Acquisition Manager — Europe', 'Bucharest, Romania', 'https://www.linkedin.com/in/anton-rublevskyi/', '2026-08-27T15:00:00+04:00'),
  ('Doğa Küçükersan', 'SLB', 'Recruiting & Staffing Assistant', 'Ankara, Türkiye', 'https://www.linkedin.com/in/dogakucukersan/', '2026-08-27T15:00:00+04:00'),
  ('Abdullah Al Homod', 'SLB', 'Talent Acquisition Recruiter', 'Dhahran, Saudi Arabia', 'https://www.linkedin.com/in/abdullah-al-homod-1b546a83/', '2026-08-27T15:00:00+04:00'),
  ('Gulshat N.', 'Intertasco', 'HR Recruiter — Oil & Gas', 'Almaty, Kazakhstan', 'https://www.linkedin.com/in/nyssambayevag/', '2026-08-27T15:00:00+04:00'),
  ('Roji John', 'Masdar', 'Senior Talent Acquisition Specialist', 'United Arab Emirates', 'https://www.linkedin.com/in/roji-john-842ba317/', '2026-08-27T15:00:00+04:00'),
  ('Fauzan Cahya Bachtiar', 'PT Supraco Indonesia', 'Recruiter — Oil, Gas & Energy', 'Jakarta, Indonesia', 'https://www.linkedin.com/in/fauzancb/', '2026-08-27T15:00:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Sorina Andrei', 'AECOM', 'Talent Acquisition Partner', 'Germany', 'https://www.linkedin.com/in/sorina-andrei-b97a69222/', '2026-08-27T14:00:00+04:00'),
  ('Mark Pereira', 'AECOM', 'Talent Acquisition Advisor', 'Mississauga, Canada', 'https://www.linkedin.com/in/titansfan/', '2026-08-27T14:00:00+04:00'),
  ('Huzaifa Ansari', 'AECOM', 'Talent Acquisition Advisor', 'Dubai, United Arab Emirates', 'https://www.linkedin.com/in/huzaifa-ansari-45b615120/', '2026-08-27T14:00:00+04:00'),
  ('Tanzim Moin', 'BAUER Geotechnical Solutions Middle East', 'Talent Acquisition Specialist', 'Abu Dhabi, United Arab Emirates', 'https://www.linkedin.com/in/tanzimmoin/', '2026-08-27T14:00:00+04:00'),
  ('Gwynne Ellis Peterson', 'ENTRUST Solutions Group', 'Senior Talent Acquisition Specialist', 'Denver, United States', 'https://www.linkedin.com/in/gwynne-ellis/', '2026-08-27T14:00:00+04:00'),
  ('Tessa Sluyter', 'Oyster Personnel', 'International / Maritime Recruitment Manager', 'The Hague, Netherlands', 'https://www.linkedin.com/in/tessasluyter/', '2026-08-27T14:00:00+04:00'),
  ('Kyung Hoon Bang', 'LSP Renewables', 'Senior Recruitment Consultant', 'Seoul, South Korea', 'https://www.linkedin.com/in/kaybbang/', '2026-08-27T14:00:00+04:00'),
  ('Michelle Birnie-Mackintosh', 'Brunel', 'Senior Recruiter', 'Aberdeen, United Kingdom', 'https://www.linkedin.com/in/michelle-birnie-mackintosh-6a30a924/', '2026-08-27T14:00:00+04:00'),
  ('Ben Callander', 'Brunel', 'Recruitment Consultant', 'Warrington, United Kingdom', 'https://www.linkedin.com/in/ben-callander-532567223/', '2026-08-27T14:00:00+04:00'),
  ('Renan Paiva', 'Brunel', 'Senior Recruiter', 'Brazil', 'https://www.linkedin.com/in/paivarenan/', '2026-08-27T14:00:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Gerry Doran', 'Wood', 'Recruiter', 'Glasgow, United Kingdom', 'https://www.linkedin.com/in/gerry-doran-b9ba5b54/', '2026-08-27T13:00:00+04:00'),
  ('Gladwin Nadesan', 'Wood', 'Senior Talent Acquisition Advisor', 'Abu Dhabi, United Arab Emirates', 'https://www.linkedin.com/in/gladwin-timothy/', '2026-08-27T13:00:00+04:00'),
  ('Azan Najeeb', 'Wood', 'Talent Acquisition Manager — MEAC', 'Dubai, United Arab Emirates', 'https://www.linkedin.com/in/azan-najeeb-a37bba97/', '2026-08-27T13:00:00+04:00'),
  ('Alina Shams', 'Euro Mechanical', 'Talent Acquisition Manager', 'Dubai, United Arab Emirates', 'https://www.linkedin.com/in/shamsalina/', '2026-08-27T13:00:00+04:00'),
  ('Tracy Colby', 'GHD', 'Talent Acquisition Business Partner', 'Calgary, Canada', 'https://www.linkedin.com/in/tracycolby/', '2026-08-27T13:00:00+04:00'),
  ('Lee Morley', 'Evolve Technical Recruitment', 'Talent Acquisition Specialist — Energy & Infrastructure', 'United Kingdom', 'https://www.linkedin.com/in/lee-morley-9501707/', '2026-08-27T13:00:00+04:00'),
  ('Holly Angus', 'EthosEnergy', 'Senior Manager Talent Acquisition — Global', 'Aberdeen, United Kingdom', 'https://www.linkedin.com/in/holly-angus-44437616/', '2026-08-27T13:00:00+04:00'),
  ('Andrew Lyons', 'Costain Group', 'Talent Acquisition Specialist — Water', 'Warwick, United Kingdom', 'https://www.linkedin.com/in/andrew-m-lyons/', '2026-08-27T13:00:00+04:00'),
  ('Gursh Chahal', 'Worley', 'Talent Acquisition Specialist', 'Stevenage, United Kingdom', 'https://www.linkedin.com/in/gurshchahal/', '2026-08-27T13:00:00+04:00'),
  ('Mohsan Aslam', 'Worley', 'Talent Acquisition Manager — UK & Nordics', 'Manchester, United Kingdom', 'https://www.linkedin.com/in/mohsan-aslam-54686960/', '2026-08-27T13:00:00+04:00'),
  ('Faye Inglis', 'Worley', 'Senior Talent Acquisition Specialist', 'Aberdeen, United Kingdom', 'https://www.linkedin.com/in/faye-inglis-amcipd-b89a2212/', '2026-08-27T13:00:00+04:00'),
  ('Addie Burson', 'Worley', 'Talent Acquisition Advisor / Recruiter', 'United States', 'https://www.linkedin.com/in/addie-burson-shrm-cp-67a56616a/', '2026-08-27T13:00:00+04:00'),
  ('Preetha Hubert', 'Worley', 'Talent Acquisition Advisor', 'Doha, Qatar', 'https://www.linkedin.com/in/preetha-hubert-88954241/', '2026-08-27T13:00:00+04:00'),
  ('Kathryn McLeod', 'Worley', 'Talent Acquisition Director — Americas & Global Major Projects', 'Houston, United States', 'https://www.linkedin.com/in/kathrynmcleod/', '2026-08-27T13:00:00+04:00'),
  ('Prabhakar Padhi', 'Kent', 'Lead Talent Acquisition Specialist', 'Dubai, United Arab Emirates', 'https://www.linkedin.com/in/prabhakarpadhi/', '2026-08-27T13:00:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Pooja R.', 'TechnipFMC', 'Process Lead — Talent Acquisition', 'Noida, India', 'https://www.linkedin.com/in/pooja-r-732028102/', '2026-08-27T12:00:00+04:00'),
  ('Eman AlHajri', 'TechnipFMC', 'Senior Regional Talent Acquisition — Middle East, Asia & India', 'Saudi Arabia', 'https://www.linkedin.com/in/eman-alhajri/', '2026-08-27T12:00:00+04:00'),
  ('Shadab Alam', 'TechnipFMC', 'Senior Talent Acquisition Specialist', 'United Arab Emirates', 'https://www.linkedin.com/in/shadab-alam-374ab63b/', '2026-08-27T12:00:00+04:00'),
  ('Shoshana Benavides', 'TechnipFMC', 'Talent Acquisition Partner — Americas', 'Houston, United States', 'https://www.linkedin.com/in/julia-shoshana-pilloff/', '2026-08-27T12:00:00+04:00'),
  ('Claudia Carvajal', 'TechnipFMC', 'Recruiter — UK Onshore', 'Aberdeen, United Kingdom', 'https://www.linkedin.com/in/claudiacarvajal/', '2026-08-27T12:00:00+04:00'),
  ('Lee Buchan', 'AMS', 'Talent Acquisition Business Partnering Manager', 'Aberdeen, United Kingdom', 'https://www.linkedin.com/in/lee-buchan-33338a35/', '2026-08-27T12:00:00+04:00'),
  ('Mayada Hassan', 'NES Fircroft', 'Senior Talent Acquisition Consultant', 'Egypt', 'https://www.linkedin.com/in/mayada-hassan-968769133/', '2026-08-27T12:00:00+04:00'),
  ('Nomaan Nafees', 'Baker Hughes', 'Talent Acquisition Recruiter', 'United Arab Emirates', 'https://www.linkedin.com/in/nomaan-nafees-11683a49/', '2026-08-27T12:00:00+04:00'),
  ('Hardik Shah', 'AMS', 'Talent Acquisition Recruiter', 'Mumbai, India', 'https://www.linkedin.com/in/hardik-shah-694b5364/', '2026-08-27T12:00:00+04:00'),
  ('Shiva Ghade', 'AMS', 'Senior Recruiter — Americas', 'Mira-Bhayandar, India', 'https://www.linkedin.com/in/shiva-ghade-4853a1101/', '2026-08-27T12:00:00+04:00'),
  ('Alia Medhat', 'Baker Hughes', 'Senior Talent Acquisition — MENAT', 'Egypt', 'https://www.linkedin.com/in/alia-medhat-823883105/', '2026-08-27T12:00:00+04:00'),
  ('Zdenek Breburda', 'Siemens', 'Talent Acquisition Partner', 'Prague, Czechia', 'https://www.linkedin.com/in/zdenekb/', '2026-08-27T12:00:00+04:00'),
  ('Kamilla Jus', 'Siemens', 'Talent Acquisition Team Leader', 'Czechia', 'https://www.linkedin.com/in/kamilla-jus-361275142/', '2026-08-27T12:00:00+04:00'),
  ('Matthew Riesz', 'Siemens Healthineers', 'Senior Talent Acquisition Recruiter', 'Westborough, United States', 'https://www.linkedin.com/in/matthewriesz/', '2026-08-27T12:00:00+04:00'),
  ('Tomas Tietz', 'Siemens', 'Head of Talent Acquisition — Austria', 'Prague, Czechia', 'https://www.linkedin.com/in/tomastietz/', '2026-08-27T12:00:00+04:00'),
  ('Christel Y. Lilly', 'Siemens', 'Senior Talent Acquisition Partner', 'Florida, United States', 'https://www.linkedin.com/in/christellilly/', '2026-08-27T12:00:00+04:00'),
  ('Ahmed Elghatas', 'Siemens Energy', 'Regional Head of Talent Acquisition — Middle East & Africa', 'Dubai, United Arab Emirates', 'https://www.linkedin.com/in/ahmed-elghatas/', '2026-08-27T12:00:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

insert into public.atsrs_recruiters (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Sally Spaull', 'PR Offshore Services Ltd', 'Senior Offshore Recruiter — ROV, Survey & Inspection', 'Lowestoft, United Kingdom', 'https://www.linkedin.com/in/sally-spaull-2b807920/', '2026-08-27T01:00:00+04:00'),
  ('Zarli H.', 'Archer', 'Offshore Recruiter — Trades & Inspection', 'Southampton, United Kingdom', 'https://www.linkedin.com/in/zarli-htet/', '2026-08-27T01:00:00+04:00'),
  ('Kirsty Emma Tipping', 'Archer', 'Talent Acquisition Lead', 'Norway', 'https://www.linkedin.com/in/kirsty-emma-tipping/', '2026-08-27T01:00:00+04:00'),
  ('Eirik Haugland', 'BSA Offshore AS', 'CEO and Partner', 'Bergen, Norway', 'https://www.linkedin.com/in/eirik-haugland-8632a635/', '2026-08-27T01:00:00+04:00'),
  ('Siobhan Pirie', 'ROVOP', 'Recruitment Advisor', 'Aberdeen, United Kingdom', 'https://www.linkedin.com/in/siobhan-pirie-certrp/', '2026-08-27T01:00:00+04:00'),
  ('Vanessa Queiroz', 'SBM Offshore', 'Talent Acquisition Specialist', 'Rio de Janeiro, Brazil', 'https://www.linkedin.com/in/vanessa-queiroz-6763aa46/', '2026-08-27T01:00:00+04:00'),
  ('Tor Faafeng', 'Maritim / Industri / Offshore', 'Senior Recruitment Manager', 'Norway', 'https://www.linkedin.com/in/tor-faafeng/', '2026-08-27T01:00:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();

update public.atsrs_recruiters
set company = 'Atlas Professionals',
    role_title = 'Human Resources Recruiter',
    location = 'Aberdeen, United Kingdom',
    linkedin_url = 'https://www.linkedin.com/in/lesley-mathieson-453874238/',
    verified_at = '2026-08-27T00:30:00+04:00',
    updated_at = now()
where name = 'Lesley Mathieson';

-- Keep the newer canonical TechnipFMC profile and retire the legacy slash-only duplicate.
update public.atsrs_recruiters
set status = 'inactive', updated_at = now()
where id = '5ba2b50f-c9f7-4e2f-bb09-08dcd9b494a5';

insert into public.atsrs_recruiters (name, company, role_title, location, linkedin_url, verified_at)
values
  ('Katie Reilly', 'Atlas NextWave', 'Senior Consultant — Offshore Wind & Marine', 'Boston, United States', 'https://www.linkedin.com/in/katie-reilly-boston/', '2026-08-27T00:30:00+04:00'),
  ('Montse Raurell', 'Atlas Professionals', 'Personnel Coordinator — Seismic & Environmental', 'Barcelona, Spain', 'https://www.linkedin.com/in/montse-raurell-aa39195b/', '2026-08-27T00:30:00+04:00'),
  ('Francis Stinchcombe', 'UTM Consultants', 'Senior Recruitment Consultant', 'Bristol, United Kingdom', 'https://www.linkedin.com/in/fstinchcombe/', '2026-08-27T00:30:00+04:00'),
  ('Richard Tozer', 'UTM Consultants', 'Chairman', 'Bristol, United Kingdom', 'https://www.linkedin.com/in/richard-tozer-6606a029/', '2026-08-27T00:30:00+04:00'),
  ('Sam Coggins', 'UTM Consultants', 'Operations Director', 'Bristol, United Kingdom', 'https://www.linkedin.com/in/sam-coggins-certrp-19740376/', '2026-08-27T00:30:00+04:00'),
  ('Frank Forge', 'UTM Consultants', 'Renewables Team Leader', 'Bristol, United Kingdom', 'https://www.linkedin.com/in/frank-forge-16957a169/', '2026-08-27T00:30:00+04:00'),
  ('Courtney Trent', 'Oceaneering', 'Recruiter', 'Houston, United States', 'https://www.linkedin.com/in/courtney-trent-85224920/', '2026-08-27T00:30:00+04:00'),
  ('Katelyn Landry', 'Oceaneering', 'Talent Acquisition Recruiter', 'Louisiana, United States', 'https://www.linkedin.com/in/katelyn-landry/', '2026-08-27T00:30:00+04:00'),
  ('Rajesh Shrivastava', 'Oceaneering', 'Lead HR Recruiter — APAC', 'Chandigarh, India', 'https://www.linkedin.com/in/rajeshsrivastavaiilm/', '2026-08-27T00:30:00+04:00'),
  ('Manjula Swaminathan', 'Oceaneering', 'Recruiting Coordinator', 'Texas, United States', 'https://www.linkedin.com/in/manjula-swaminathan-b27669aa/', '2026-08-27T00:30:00+04:00'),
  ('Claire McPherson', 'Oceaneering', 'Recruiter EMEA', 'Aberdeen, United Kingdom', 'https://www.linkedin.com/in/claire-mcpherson-8453a0129/', '2026-08-27T00:30:00+04:00'),
  ('Elaine Lamont', 'Oceaneering', 'Recruiter', 'Aberdeen, United Kingdom', 'https://www.linkedin.com/in/elaine-lamont-98776481/', '2026-08-27T00:30:00+04:00'),
  ('Shadden Samir', 'Subsea7', 'Talent Recruiter — GPC East', 'Cairo, Egypt', 'https://www.linkedin.com/in/shadden-samir/', '2026-08-27T00:30:00+04:00'),
  ('Doug Malcolm', 'Subsea7', 'Senior Recruiter', 'Westhill, United Kingdom', 'https://www.linkedin.com/in/doug-malcolm-8ba23922/', '2026-08-27T00:30:00+04:00'),
  ('Marwa Ahmed', 'Subsea7', 'Recruiter — Talent Hub', 'Giza, Egypt', 'https://www.linkedin.com/in/marwa-ahmed-aa90811b3/', '2026-08-27T00:30:00+04:00'),
  ('Lyndsey Ritchie', 'Subsea7', 'Onshore Recruiter', 'Aberdeen, United Kingdom', 'https://www.linkedin.com/in/lyndseywells/', '2026-08-27T00:30:00+04:00'),
  ('Jill Inggall', 'Subsea7', 'Onshore Recruiter', 'Aberdeen, United Kingdom', 'https://www.linkedin.com/in/jill-inggall-2baa232/', '2026-08-27T00:30:00+04:00'),
  ('Rayane Souza', 'Subsea7', 'Recruiter', 'Rio de Janeiro, Brazil', 'https://www.linkedin.com/in/rayaneflorencio/', '2026-08-27T00:30:00+04:00'),
  ('Elwin Jude C.', 'Fugro', 'Talent Acquisition Partner', 'Wallingford, United Kingdom', 'https://www.linkedin.com/in/elwin-jude-c/', '2026-08-27T00:30:00+04:00'),
  ('Stephanie El Hitti', 'Fugro', 'Senior Talent Acquisition Partner', 'Dubai, United Arab Emirates', 'https://www.linkedin.com/in/stephaniehitti/', '2026-08-27T00:30:00+04:00'),
  ('Liz S.', 'Fugro', 'Talent Acquisition Manager', 'Oxford, United Kingdom', 'https://www.linkedin.com/in/liz-s-89416b12/', '2026-08-27T00:30:00+04:00'),
  ('Lolwah AlDossary', 'Fugro', 'Senior Talent Acquisition Professional', 'Al Khobar, Saudi Arabia', 'https://www.linkedin.com/in/lolwah-aldossary-818ab61ba/', '2026-08-27T00:30:00+04:00'),
  ('Ümit Nesar', 'Fugro', 'Talent Acquisition Partner', 'Rotterdam, Netherlands', 'https://www.linkedin.com/in/%C3%BCmitnesar/', '2026-08-27T00:30:00+04:00'),
  ('Katrine Rav Hallas', 'DOF Group', 'HR Business Partner', 'Copenhagen, Denmark', 'https://www.linkedin.com/in/katrinerav/', '2026-08-27T00:30:00+04:00'),
  ('Renan Ribeiro', 'DOF Group', 'Senior Recruitment Analyst', 'Macaé, Brazil', 'https://www.linkedin.com/in/renan-ribeiro-1a695935/', '2026-08-27T00:30:00+04:00'),
  ('Matthew Hurrel', 'Boskalis', 'Corporate Recruiter — Energy', 'Aberdeen, United Kingdom', 'https://www.linkedin.com/in/matthew-hurrel-860b8515a/', '2026-08-27T00:30:00+04:00'),
  ('Emilie Wabbijn-Stratenus', 'Boskalis', 'Corporate Recruiter', 'Rotterdam, Netherlands', 'https://www.linkedin.com/in/emiliestratenus/', '2026-08-27T00:30:00+04:00'),
  ('Melisha Nazareth', 'Boskalis', 'Corporate Recruiter', 'Abu Dhabi, United Arab Emirates', 'https://www.linkedin.com/in/melisha-nazareth/', '2026-08-27T00:30:00+04:00'),
  ('Rob van Niftrik', 'Boskalis', 'Flexdesk Recruiter', 'Netherlands', 'https://www.linkedin.com/in/robvanniftrik/', '2026-08-27T00:30:00+04:00'),
  ('Juliana Barreto', 'Saipem', 'Talent Acquisition & Global Mobility Lead', 'Rio de Janeiro, Brazil', 'https://www.linkedin.com/in/juliana-barreto-dealcantara/', '2026-08-27T00:30:00+04:00'),
  ('Lauriane Fortin', 'Saipem', 'Senior Talent Acquisition — Europe', 'Milan, Italy', 'https://www.linkedin.com/in/lauriane-fortin/', '2026-08-27T00:30:00+04:00'),
  ('Giacomo Salipante', 'Saipem', 'Senior Talent Acquisition Specialist — Europe', 'Milan, Italy', 'https://www.linkedin.com/in/giacomo-salipante-human-resources/', '2026-08-27T00:30:00+04:00'),
  ('Menna Karaman', 'Saipem', 'Senior Recruitment Training & Development', 'Cairo, Egypt', 'https://www.linkedin.com/in/menna-karaman/', '2026-08-27T00:30:00+04:00'),
  ('Holly Bulmer', 'Elevate Offshore', 'Personnel Coordinator / Recruiter', 'United Kingdom', 'https://www.linkedin.com/in/holly-bulmer/', '2026-08-27T00:30:00+04:00'),
  ('Rhea Fraser', 'Elevate Offshore', 'Account Manager — Recruitment', 'Aberdeen, United Kingdom', 'https://www.linkedin.com/in/rhea-fraser-251a4625/', '2026-08-27T00:30:00+04:00')
on conflict (linkedin_url) do update set
  name = excluded.name,
  company = excluded.company,
  role_title = excluded.role_title,
  location = excluded.location,
  status = 'active',
  verified_at = excluded.verified_at,
  updated_at = now();
