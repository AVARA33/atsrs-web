begin;

create table public.atsrs_jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text not null,
  location text not null,
  country text,
  work_type text,
  worksite text,
  equipment text,
  joining_date date,
  mobilisation text,
  duration text,
  rate text,
  currency text,
  summary text,
  description text,
  requirements text,
  recruiter_name text,
  recruiter_company text,
  recruiter_phone text,
  recruiter_email text,
  source_type text not null default 'manual',
  source_url text,
  application_url text,
  external_id text,
  role_key text not null,
  source_item_key text,
  normalized_title text not null,
  normalized_company text not null,
  normalized_location text not null,
  normalized_source_url text,
  source_posted_at date,
  received_at date,
  status text not null default 'draft',
  published_at timestamptz,
  archived_at timestamptz,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint atsrs_jobs_title_length check (char_length(title) between 1 and 180),
  constraint atsrs_jobs_company_length check (char_length(company) between 1 and 160),
  constraint atsrs_jobs_location_length check (char_length(location) between 1 and 180),
  constraint atsrs_jobs_country_length check (country is null or char_length(country) between 1 and 100),
  constraint atsrs_jobs_work_type_length check (work_type is null or char_length(work_type) between 1 and 80),
  constraint atsrs_jobs_worksite_length check (worksite is null or char_length(worksite) between 1 and 180),
  constraint atsrs_jobs_equipment_length check (equipment is null or char_length(equipment) between 1 and 180),
  constraint atsrs_jobs_mobilisation_length check (mobilisation is null or char_length(mobilisation) between 1 and 180),
  constraint atsrs_jobs_duration_length check (duration is null or char_length(duration) between 1 and 240),
  constraint atsrs_jobs_rate_length check (rate is null or char_length(rate) between 1 and 180),
  constraint atsrs_jobs_currency_format check (currency is null or currency ~ '^[A-Z]{3}$'),
  constraint atsrs_jobs_summary_length check (summary is null or char_length(summary) between 1 and 1000),
  constraint atsrs_jobs_description_length check (description is null or char_length(description) between 1 and 12000),
  constraint atsrs_jobs_requirements_length check (requirements is null or char_length(requirements) between 1 and 12000),
  constraint atsrs_jobs_recruiter_name_length check (recruiter_name is null or char_length(recruiter_name) between 1 and 160),
  constraint atsrs_jobs_recruiter_company_length check (recruiter_company is null or char_length(recruiter_company) between 1 and 160),
  constraint atsrs_jobs_recruiter_phone_format check (recruiter_phone is null or (char_length(recruiter_phone) between 5 and 40 and recruiter_phone ~ '^[0-9+(). /-]+$')),
  constraint atsrs_jobs_recruiter_email_format check (recruiter_email is null or (char_length(recruiter_email) <= 254 and recruiter_email ~* '^[A-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$')),
  constraint atsrs_jobs_source_type_allowed check (source_type in ('linkedin', 'manual', 'legacy')),
  constraint atsrs_jobs_source_url_http check (source_url is null or (char_length(source_url) <= 2048 and source_url ~* '^https?://[^[:space:]]+$')),
  constraint atsrs_jobs_application_url_http check (application_url is null or (char_length(application_url) <= 2048 and application_url ~* '^https?://[^[:space:]]+$')),
  constraint atsrs_jobs_external_id_length check (external_id is null or char_length(external_id) between 1 and 240),
  constraint atsrs_jobs_status_allowed check (status in ('draft', 'published', 'archived')),
  constraint atsrs_jobs_published_timestamp check (status <> 'published' or published_at is not null),
  constraint atsrs_jobs_expiry_order check (expires_at is null or published_at is null or expires_at > published_at)
);

comment on table public.atsrs_jobs is
  'Owner-managed ATSRS vacancies. Public readers only receive published, non-expired rows through RLS.';
comment on column public.atsrs_jobs.published_at is
  'ATSRS real publish timestamp, assigned by the server on a transition into published status.';
comment on column public.atsrs_jobs.source_posted_at is
  'Verified concrete date on which the source published the vacancy; never a relative phrase.';
comment on column public.atsrs_jobs.joining_date is
  'Role joining/start date, separate from source_posted_at.';

create or replace function atsrs_private.normalize_job_identity_text(value text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select lower(regexp_replace(btrim(value), '[[:space:]]+', ' ', 'g'));
$$;

create or replace function atsrs_private.normalize_job_identity_url(value text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select lower(regexp_replace(btrim(value), '/+$', ''));
$$;

create or replace function atsrs_private.prepare_job_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  identity_origin text;
begin
  new.title := btrim(new.title);
  new.company := btrim(new.company);
  new.location := btrim(new.location);
  new.country := nullif(btrim(new.country), '');
  new.work_type := nullif(btrim(new.work_type), '');
  new.worksite := nullif(btrim(new.worksite), '');
  new.equipment := nullif(btrim(new.equipment), '');
  new.mobilisation := nullif(btrim(new.mobilisation), '');
  new.duration := nullif(btrim(new.duration), '');
  new.rate := nullif(btrim(new.rate), '');
  new.currency := upper(nullif(btrim(new.currency), ''));
  new.summary := nullif(btrim(new.summary), '');
  new.description := nullif(btrim(new.description), '');
  new.requirements := nullif(btrim(new.requirements), '');
  new.recruiter_name := nullif(btrim(new.recruiter_name), '');
  new.recruiter_company := nullif(btrim(new.recruiter_company), '');
  new.recruiter_phone := nullif(btrim(new.recruiter_phone), '');
  new.recruiter_email := lower(nullif(btrim(new.recruiter_email), ''));
  new.source_type := lower(btrim(new.source_type));
  new.source_url := nullif(btrim(new.source_url), '');
  new.application_url := nullif(btrim(new.application_url), '');
  new.external_id := nullif(btrim(new.external_id), '');

  new.normalized_title := atsrs_private.normalize_job_identity_text(new.title);
  new.normalized_company := atsrs_private.normalize_job_identity_text(new.company);
  new.normalized_location := atsrs_private.normalize_job_identity_text(new.location);
  new.normalized_source_url := case
    when new.source_url is null then null
    else atsrs_private.normalize_job_identity_url(new.source_url)
  end;
  new.role_key := md5(concat_ws('|', new.normalized_title, new.normalized_company, new.normalized_location));

  identity_origin := case
    when new.external_id is not null then 'external:' || lower(new.external_id)
    when new.normalized_source_url is not null then 'url:' || new.normalized_source_url
    else null
  end;
  new.source_item_key := case
    when identity_origin is null then null
    else md5(new.source_type || '|' || identity_origin || '|' || new.role_key)
  end;
  return new;
end;
$$;

create trigger atsrs_jobs_prepare_identity
before insert or update of title, company, location, country, work_type, worksite, equipment,
  mobilisation, duration, rate, currency, summary, description, requirements,
  recruiter_name, recruiter_company, recruiter_phone, recruiter_email,
  source_type, source_url, application_url, external_id
on public.atsrs_jobs
for each row execute function atsrs_private.prepare_job_identity();

insert into public.atsrs_jobs (
  title, company, location, worksite, equipment, mobilisation, duration, rate,
  summary, requirements, recruiter_phone, recruiter_email,
  source_type, external_id, received_at, status, published_at, created_at, updated_at
)
values
  ('ROV Supervisor','Accord People','Norfolk, UK','Vessel · MS Server','Super Mohawk','1–5 Sep 2026','Approx. 12 operational days, plus mobilisation and demobilisation',null,'Nearshore UK assignment within 12 nautical miles.','GWO certificates, UK Right to Work, and Super Mohawk or Seaeye experience.',null,'ryan.webster@accordbps.com','legacy','accord-supervisor-sep','2026-08-14','published','2026-08-16 06:35:00+00','2026-08-16 06:35:00+00','2026-08-16 06:35:00+00'),
  ('ROV Pilot Technician','Accord People','Norfolk, UK','Vessel · MS Server','Super Mohawk','1–5 Sep 2026','Approx. 12 operational days, plus mobilisation and demobilisation',null,'Two Pilot Technician positions on a nearshore UK assignment.','GWO certificates, UK Right to Work, and Super Mohawk or Seaeye experience.',null,'ryan.webster@accordbps.com','legacy','accord-pilot-sep','2026-08-14','published','2026-08-16 06:35:00+00','2026-08-16 06:35:00+00','2026-08-16 06:35:00+00'),
  ('ROV Supervisor','Maris Subsea','Taiwan','Vessel','Seaeye Falcon','1 Sep 2026','3–4 weeks, plus two travel days either side',null,'Platform inspection scope covering GVI, CP and marine-growth cleaning.','Seaeye Falcon or similar experience; OPITO Survival, CA-EBS, OEUK, passport, Seaman’s Book and Full GWO.','01224001215','ellie.malim@marissubsea.com','legacy','maris-taiwan-supervisor','2026-08-06','published','2026-08-16 06:35:00+00','2026-08-16 06:35:00+00','2026-08-16 06:35:00+00'),
  ('ROV Pilot Technician','Maris Subsea','Taiwan','Vessel','Seaeye Falcon','1 Sep 2026','3–4 weeks, plus two travel days either side',null,'Platform inspection scope covering GVI, CP and marine-growth cleaning.','Seaeye Falcon or similar experience; OPITO Survival, CA-EBS, OEUK, passport, Seaman’s Book and Full GWO.','01224001215','ellie.malim@marissubsea.com','legacy','maris-taiwan-pilot','2026-08-06','published','2026-08-16 06:35:00+00','2026-08-16 06:35:00+00','2026-08-16 06:35:00+00'),
  ('ROV Supervisor','Maris Subsea','North Sea, UK','Platform · outside 12 nm','Seaeye Falcon','10 Sep 2026','3 weeks; possible rotation through October',null,'Platform inspection scope including FMD, GVI, CP and marine-growth cleaning.','Seaeye Falcon or similar experience; offshore certificates and valid UK work eligibility.','01224001215','ellie.malim@marissubsea.com','legacy','maris-north-sea-supervisor','2026-08-06','published','2026-08-16 06:35:00+00','2026-08-16 06:35:00+00','2026-08-16 06:35:00+00'),
  ('ROV Pilot Technician','Maris Subsea','North Sea, UK','Platform · outside 12 nm','Seaeye Falcon','10 Sep 2026','3 weeks; possible rotation through October',null,'Platform inspection scope including FMD, GVI, CP and marine-growth cleaning.','Seaeye Falcon or similar experience; offshore certificates and valid UK work eligibility.','01224001215','ellie.malim@marissubsea.com','legacy','maris-north-sea-pilot','2026-08-06','published','2026-08-16 06:35:00+00','2026-08-16 06:35:00+00','2026-08-16 06:35:00+00'),
  ('ROV Supervisor','Maris Subsea','Poland','Platform','Seaeye Falcon','15 Sep 2026','Not stated',null,'Drill-support assignment covering spud-can survey and monitoring.','Seaeye Falcon or similar experience; offshore certificates and valid UK or EU work eligibility.','01224001215','ellie.malim@marissubsea.com','legacy','maris-poland-supervisor','2026-08-06','published','2026-08-16 06:35:00+00','2026-08-16 06:35:00+00','2026-08-16 06:35:00+00'),
  ('ROV Pilot Technician','Maris Subsea','Poland','Platform','Seaeye Falcon','15 Sep 2026','Not stated',null,'Drill-support assignment covering spud-can survey and monitoring.','Seaeye Falcon or similar experience; offshore certificates and valid UK or EU work eligibility.','01224001215','ellie.malim@marissubsea.com','legacy','maris-poland-pilot','2026-08-06','published','2026-08-16 06:35:00+00','2026-08-16 06:35:00+00','2026-08-16 06:35:00+00'),
  ('ROV Pilot Technician','Maris Subsea','Lowestoft, UK','Vessel · UK Southern North Sea','JM Robotics HD3','19 Aug 2026','4-week rota with staggered two-week crew changes','£550/day · Limited Company','General visual inspection and CP-stab scope.','Micro ROV experience; British passport, OPITO Survival, CA-EBS, OEUK, competence certificate and Seaman’s Book.','01224001213','cheryl.nicolson@marissubsea.com','legacy','maris-lowestoft-pilot','2026-07-29','published','2026-08-16 06:35:00+00','2026-08-16 06:35:00+00','2026-08-16 06:35:00+00'),
  ('ROV Supervisor / Pilot Technician','Maris Subsea','Australia','Project-based','KystDesign','Upcoming · exact date not stated','Up to 6 months, with possible extension',null,'Longer-term heavy-construction ROV project.','KystDesign experience, at least 3 years heavy-construction scope, 6 years ROV experience and 600 piloting hours.','01224001215','ellie.malim@marissubsea.com','legacy','maris-australia-kystdesign','2026-07-23','published','2026-08-16 06:35:00+00','2026-08-16 06:35:00+00','2026-08-16 06:35:00+00')
on conflict do nothing;

create unique index atsrs_jobs_source_item_key_uidx
  on public.atsrs_jobs (source_item_key)
  where source_item_key is not null;
create unique index atsrs_jobs_external_role_uidx
  on public.atsrs_jobs (source_type, external_id, role_key)
  where external_id is not null;
create unique index atsrs_jobs_source_role_uidx
  on public.atsrs_jobs (
    source_type, normalized_source_url, normalized_title, normalized_company, normalized_location
  )
  where normalized_source_url is not null;
create index atsrs_jobs_public_feed_idx
  on public.atsrs_jobs (published_at desc, id desc)
  where status = 'published';
create index atsrs_jobs_admin_feed_idx
  on public.atsrs_jobs (status, updated_at desc, id desc);
create index atsrs_jobs_created_by_idx on public.atsrs_jobs (created_by);
create index atsrs_jobs_updated_by_idx on public.atsrs_jobs (updated_by);

create or replace function atsrs_private.apply_job_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    if caller_id is not null then
      new.created_by := caller_id;
      new.updated_by := caller_id;
    end if;
    if new.status = 'published' then
      new.published_at := clock_timestamp();
      new.archived_at := null;
    else
      new.published_at := null;
      new.archived_at := case when new.status = 'archived' then clock_timestamp() else null end;
    end if;
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_at := clock_timestamp();
    if caller_id is not null then new.updated_by := caller_id; end if;

    if new.status = 'published' and old.status <> 'published' then
      new.published_at := clock_timestamp();
      new.archived_at := null;
    elsif new.status = 'published' then
      new.published_at := old.published_at;
      new.archived_at := null;
    elsif new.status = 'archived' and old.status <> 'archived' then
      new.published_at := old.published_at;
      new.archived_at := clock_timestamp();
    else
      new.published_at := old.published_at;
      new.archived_at := case when new.status = 'archived' then old.archived_at else null end;
    end if;
  end if;
  return new;
end;
$$;

create trigger atsrs_jobs_lifecycle
before insert or update on public.atsrs_jobs
for each row execute function atsrs_private.apply_job_lifecycle();

create or replace function atsrs_private.is_jobs_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.atsrs_admin_users as admin_user
      where admin_user.user_id = (select auth.uid())
    );
$$;

revoke all on function atsrs_private.normalize_job_identity_text(text) from public, anon, authenticated, service_role;
revoke all on function atsrs_private.normalize_job_identity_url(text) from public, anon, authenticated, service_role;
revoke all on function atsrs_private.prepare_job_identity() from public, anon, authenticated, service_role;
revoke all on function atsrs_private.apply_job_lifecycle() from public, anon, authenticated, service_role;
revoke all on function atsrs_private.is_jobs_admin() from public, anon, authenticated, service_role;

create or replace function public.atsrs_jobs_admin_status()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select atsrs_private.is_jobs_admin();
$$;
revoke all on function public.atsrs_jobs_admin_status() from public, anon, authenticated, service_role;
grant execute on function public.atsrs_jobs_admin_status() to authenticated;

alter table public.atsrs_jobs enable row level security;

create policy atsrs_jobs_anon_read_live
on public.atsrs_jobs
for select
to anon
using (
  status = 'published'
  and published_at is not null
  and published_at <= now()
  and (expires_at is null or expires_at > now())
);

create policy atsrs_jobs_authenticated_read
on public.atsrs_jobs
for select
to authenticated
using (
  (
    status = 'published'
    and published_at is not null
    and published_at <= now()
    and (expires_at is null or expires_at > now())
  )
  or (select atsrs_private.is_jobs_admin())
);

create policy atsrs_jobs_admin_insert
on public.atsrs_jobs
for insert
to authenticated
with check ((select atsrs_private.is_jobs_admin()));

create policy atsrs_jobs_admin_update
on public.atsrs_jobs
for update
to authenticated
using ((select atsrs_private.is_jobs_admin()))
with check ((select atsrs_private.is_jobs_admin()));

create policy atsrs_jobs_admin_delete
on public.atsrs_jobs
for delete
to authenticated
using ((select atsrs_private.is_jobs_admin()));

revoke all on table public.atsrs_jobs from public, anon, authenticated, service_role;
grant select on table public.atsrs_jobs to anon;
grant select, insert, update, delete on table public.atsrs_jobs to authenticated;

commit;
