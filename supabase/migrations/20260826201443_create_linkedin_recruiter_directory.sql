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
  ('Lee Buchan', 'AMS / Baker Hughes', 'Talent Acquisition Business Partnering Manager', 'Aberdeen, United Kingdom', 'https://www.linkedin.com/in/lee-buchan-33338a35/', '2026-08-27T12:00:00+04:00'),
  ('Mayada Hassan', 'NES Fircroft / Baker Hughes', 'Senior Talent Acquisition Consultant', 'Egypt', 'https://www.linkedin.com/in/mayada-hassan-968769133/', '2026-08-27T12:00:00+04:00'),
  ('Nomaan Nafees', 'Baker Hughes', 'Talent Acquisition Recruiter', 'United Arab Emirates', 'https://www.linkedin.com/in/nomaan-nafees-11683a49/', '2026-08-27T12:00:00+04:00'),
  ('Hardik Shah', 'AMS / Baker Hughes', 'Talent Acquisition Recruiter', 'Mumbai, India', 'https://www.linkedin.com/in/hardik-shah-694b5364/', '2026-08-27T12:00:00+04:00'),
  ('Shiva Ghade', 'AMS / Baker Hughes', 'Senior Recruiter — Americas', 'Mira-Bhayandar, India', 'https://www.linkedin.com/in/shiva-ghade-4853a1101/', '2026-08-27T12:00:00+04:00'),
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
  ('Zarli H.', 'Archer Offshore', 'Offshore Recruiter — Trades & Inspection', 'Southampton, United Kingdom', 'https://www.linkedin.com/in/zarli-htet/', '2026-08-27T01:00:00+04:00'),
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
