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

update public.atsrs_recruiters
set company = 'Atlas Professionals',
    role_title = 'Human Resources Recruiter',
    location = 'Aberdeen, United Kingdom',
    linkedin_url = 'https://www.linkedin.com/in/lesley-mathieson-453874238/',
    verified_at = '2026-08-27T00:30:00+04:00',
    updated_at = now()
where name = 'Lesley Mathieson';

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
  ('Matthew Hurrel', 'Boskalis Subsea Services', 'Corporate Recruiter — Energy', 'Aberdeen, United Kingdom', 'https://www.linkedin.com/in/matthew-hurrel-860b8515a/', '2026-08-27T00:30:00+04:00'),
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
