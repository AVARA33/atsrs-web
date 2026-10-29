-- Temporary non-production staging fixture for the PAŞA payment release.
-- This intentionally contains no production data, secrets, cron jobs or
-- external calls. It models the pre-reconciliation live contracts so the real
-- terminal migrations can be exercised on a disposable Supabase project.

begin;

create schema if not exists atsrs_private;
create schema if not exists private;

revoke all on schema atsrs_private from public, anon, authenticated;
grant usage on schema atsrs_private to service_role;

create table atsrs_private.atsrs_billing_plans (
  plan_key text primary key,
  display_name text not null,
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  monthly_amount_minor integer not null check (monthly_amount_minor >= 0),
  yearly_amount_minor integer not null check (yearly_amount_minor >= 0),
  checkout_enabled boolean not null default false,
  sort_order smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint atsrs_billing_plans_key_check
    check (plan_key in ('free', 'bronze', 'silver', 'gold'))
);

insert into atsrs_private.atsrs_billing_plans
  (plan_key, display_name, currency, monthly_amount_minor,
   yearly_amount_minor, checkout_enabled, sort_order)
values
  ('free', 'Free', 'USD', 0, 0, false, 10),
  ('bronze', 'Bronze', 'USD', 2000, 19200, false, 20),
  ('silver', 'Silver', 'USD', 4000, 38400, false, 30),
  ('gold', 'Gold', 'USD', 7000, 67200, false, 40);

create table atsrs_private.atsrs_billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_key text not null references atsrs_private.atsrs_billing_plans(plan_key),
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly')),
  status text not null default 'pending',
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  amount_minor integer not null check (amount_minor >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table atsrs_private.atsrs_payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references atsrs_private.atsrs_billing_subscriptions(id) on delete set null,
  plan_key text not null references atsrs_private.atsrs_billing_plans(plan_key),
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly')),
  status text not null default 'initiated'
    check (status in ('initiated','pending','authorized','paid','failed','canceled','expired','partially_refunded','refunded')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  amount_minor integer not null check (amount_minor > 0),
  refunded_amount_minor integer not null default 0,
  provider text not null,
  provider_order_reference text,
  provider_payment_reference text,
  idempotency_key uuid not null default gen_random_uuid(),
  failure_code text check (failure_code is null or char_length(failure_code) <= 120),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table atsrs_private.atsrs_payment_webhook_events (
  id bigint generated always as identity primary key,
  provider text not null,
  provider_event_reference text not null,
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  signature_verified boolean not null default false,
  status text not null default 'received'
    check (status in ('received','processed','ignored','failed')),
  attempt_count smallint not null default 0 check (attempt_count between 0 and 50),
  last_error_code text check (last_error_code is null or char_length(last_error_code) <= 120),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, provider_event_reference)
);

create table atsrs_private.atsrs_billing_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(action) between 2 and 80),
  entity_type text not null
    check (entity_type in ('customer','subscription','payment','webhook','plan','refund','reconciliation')),
  entity_reference text not null check (char_length(entity_reference) between 1 and 180),
  safe_details jsonb not null default '{}'::jsonb check (jsonb_typeof(safe_details) = 'object'),
  created_at timestamptz not null default now()
);

alter table atsrs_private.atsrs_billing_plans enable row level security;
alter table atsrs_private.atsrs_billing_subscriptions enable row level security;
alter table atsrs_private.atsrs_payment_transactions enable row level security;
alter table atsrs_private.atsrs_payment_webhook_events enable row level security;
alter table atsrs_private.atsrs_billing_audit_log enable row level security;

revoke all on all tables in schema atsrs_private from public, anon, authenticated;
grant select, insert, update, delete on all tables in schema atsrs_private to service_role;
grant usage, select on all sequences in schema atsrs_private to service_role;

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
  source_type text not null default 'manual',
  source_posted_at date,
  display_posted_date date,
  closing_date date,
  status text not null default 'draft',
  published_at timestamptz,
  expires_at timestamptz,
  recruiter_name text,
  recruiter_company text,
  recruiter_phone text,
  recruiter_email text,
  source_url text,
  application_url text,
  external_id text,
  source_item_key text,
  normalized_source_url text,
  created_by uuid,
  updated_by uuid,
  archived_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.atsrs_jobs enable row level security;
revoke all on table public.atsrs_jobs from public, anon, authenticated;

create or replace function atsrs_private.is_jobs_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select false $$;

create or replace function private.atsrs_personal_plan_key(p_user_id uuid)
returns text language sql stable security definer set search_path = ''
as $$ select 'free'::text $$;

create or replace function private.atsrs_job_title_matches_terms(p_title text, p_terms text[])
returns boolean language sql immutable set search_path = ''
as $$
  select coalesce(array_length(p_terms, 1), 0) = 0
    or not exists (
      select 1 from unnest(p_terms) as term
      where p_title not ilike '%' || term || '%'
    )
$$;

insert into public.atsrs_jobs (
  title, company, location, summary, source_type, source_posted_at,
  status, published_at, recruiter_email, source_url,
  external_id, source_item_key, normalized_source_url, updated_at
) values (
  'Synthetic ROV Pilot', 'ATSRS Staging', 'Test Location',
  'Synthetic non-production record', 'manual', current_date - 2,
  'published', now() - interval '24 hours', 'hidden@example.invalid',
  'https://example.invalid/jobs/synthetic', 'internal-external-id',
  'internal-source-item-key', 'https://example.invalid/jobs/synthetic', now()
);

commit;
