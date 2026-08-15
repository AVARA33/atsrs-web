-- ATSRS bank-agnostic billing foundation.
--
-- This migration deliberately does not enable checkout, alter the legacy
-- quota subscription table, or move any production user to a paid plan.
-- Card numbers, CVV values and bank credentials must never be stored here.

begin;

create schema if not exists atsrs_private;

create table if not exists atsrs_private.atsrs_billing_plans (
  plan_key text primary key,
  display_name text not null,
  currency text not null default 'USD',
  monthly_amount_minor integer not null check (monthly_amount_minor >= 0),
  yearly_amount_minor integer not null check (yearly_amount_minor >= 0),
  checkout_enabled boolean not null default false,
  sort_order smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint atsrs_billing_plans_key_check
    check (plan_key in ('free', 'bronze', 'silver', 'gold')),
  constraint atsrs_billing_plans_currency_check
    check (currency ~ '^[A-Z]{3}$'),
  constraint atsrs_billing_plans_free_not_chargeable
    check (plan_key <> 'free' or (
      monthly_amount_minor = 0 and yearly_amount_minor = 0 and not checkout_enabled
    ))
);

insert into atsrs_private.atsrs_billing_plans (
  plan_key, display_name, currency, monthly_amount_minor,
  yearly_amount_minor, checkout_enabled, sort_order
)
values
  ('free', 'Free', 'USD', 0, 0, false, 10),
  ('bronze', 'Bronze', 'USD', 700, 7000, false, 20),
  ('silver', 'Silver', 'USD', 1500, 15000, false, 30),
  ('gold', 'Gold', 'USD', 2900, 29000, false, 40)
on conflict (plan_key) do update set
  display_name = excluded.display_name,
  currency = excluded.currency,
  monthly_amount_minor = excluded.monthly_amount_minor,
  yearly_amount_minor = excluded.yearly_amount_minor,
  checkout_enabled = false,
  sort_order = excluded.sort_order,
  updated_at = now();

create table if not exists atsrs_private.atsrs_billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  account_type text not null default 'personal'
    check (account_type = 'personal'),
  provider text,
  provider_customer_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint atsrs_billing_customer_provider_pair_check check (
    (provider is null and provider_customer_reference is null)
    or (provider is not null and provider_customer_reference is not null)
  )
);

create unique index if not exists atsrs_billing_customer_provider_reference_idx
  on atsrs_private.atsrs_billing_customers(provider, provider_customer_reference)
  where provider is not null and provider_customer_reference is not null;

create table if not exists atsrs_private.atsrs_billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_key text not null references atsrs_private.atsrs_billing_plans(plan_key),
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly')),
  status text not null default 'pending' check (
    status in ('pending', 'active', 'trialing', 'past_due', 'paused', 'canceled', 'expired')
  ),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  amount_minor integer not null check (amount_minor >= 0),
  provider text,
  provider_subscription_reference text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint atsrs_billing_subscription_period_check check (
    current_period_start is null or current_period_end is null
    or current_period_end > current_period_start
  ),
  constraint atsrs_billing_subscription_provider_pair_check check (
    (provider is null and provider_subscription_reference is null)
    or (provider is not null and provider_subscription_reference is not null)
  )
);

create index if not exists atsrs_billing_subscriptions_user_created_idx
  on atsrs_private.atsrs_billing_subscriptions(user_id, created_at desc);
create unique index if not exists atsrs_billing_subscription_provider_reference_idx
  on atsrs_private.atsrs_billing_subscriptions(provider, provider_subscription_reference)
  where provider is not null and provider_subscription_reference is not null;
create unique index if not exists atsrs_billing_one_live_subscription_per_user_idx
  on atsrs_private.atsrs_billing_subscriptions(user_id)
  where status in ('pending', 'active', 'trialing', 'past_due', 'paused');

create table if not exists atsrs_private.atsrs_payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  subscription_id uuid references atsrs_private.atsrs_billing_subscriptions(id) on delete set null,
  plan_key text not null references atsrs_private.atsrs_billing_plans(plan_key),
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly')),
  status text not null default 'initiated' check (
    status in ('initiated', 'pending', 'authorized', 'paid', 'failed',
      'canceled', 'expired', 'partially_refunded', 'refunded')
  ),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  amount_minor integer not null check (amount_minor > 0),
  refunded_amount_minor integer not null default 0 check (
    refunded_amount_minor >= 0 and refunded_amount_minor <= amount_minor
  ),
  provider text not null,
  provider_order_reference text,
  provider_payment_reference text,
  idempotency_key uuid not null default gen_random_uuid(),
  failure_code text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint atsrs_payment_failure_code_length
    check (failure_code is null or char_length(failure_code) <= 120)
);

create unique index if not exists atsrs_payment_idempotency_idx
  on atsrs_private.atsrs_payment_transactions(idempotency_key);
create unique index if not exists atsrs_payment_provider_order_idx
  on atsrs_private.atsrs_payment_transactions(provider, provider_order_reference)
  where provider_order_reference is not null;
create unique index if not exists atsrs_payment_provider_payment_idx
  on atsrs_private.atsrs_payment_transactions(provider, provider_payment_reference)
  where provider_payment_reference is not null;
create index if not exists atsrs_payment_user_created_idx
  on atsrs_private.atsrs_payment_transactions(user_id, created_at desc);

create table if not exists atsrs_private.atsrs_payment_webhook_events (
  id bigint generated always as identity primary key,
  provider text not null,
  provider_event_reference text not null,
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  signature_verified boolean not null default false,
  status text not null default 'received'
    check (status in ('received', 'processed', 'ignored', 'failed')),
  attempt_count smallint not null default 0 check (attempt_count between 0 and 50),
  last_error_code text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint atsrs_payment_webhook_event_unique
    unique (provider, provider_event_reference),
  constraint atsrs_payment_webhook_error_length
    check (last_error_code is null or char_length(last_error_code) <= 120),
  constraint atsrs_payment_webhook_processed_state check (
    (status = 'processed' and processed_at is not null) or status <> 'processed'
  )
);

create table if not exists atsrs_private.atsrs_billing_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null check (
    entity_type in ('customer', 'subscription', 'payment', 'webhook', 'plan')
  ),
  entity_reference text not null,
  safe_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint atsrs_billing_audit_action_length
    check (char_length(action) between 2 and 80),
  constraint atsrs_billing_audit_entity_reference_length
    check (char_length(entity_reference) between 1 and 180),
  constraint atsrs_billing_audit_safe_details_object
    check (jsonb_typeof(safe_details) = 'object')
);

create index if not exists atsrs_billing_audit_created_idx
  on atsrs_private.atsrs_billing_audit_log(created_at desc);

alter table atsrs_private.atsrs_billing_plans enable row level security;
alter table atsrs_private.atsrs_billing_customers enable row level security;
alter table atsrs_private.atsrs_billing_subscriptions enable row level security;
alter table atsrs_private.atsrs_payment_transactions enable row level security;
alter table atsrs_private.atsrs_payment_webhook_events enable row level security;
alter table atsrs_private.atsrs_billing_audit_log enable row level security;

revoke all on table atsrs_private.atsrs_billing_plans from public, anon, authenticated;
revoke all on table atsrs_private.atsrs_billing_customers from public, anon, authenticated;
revoke all on table atsrs_private.atsrs_billing_subscriptions from public, anon, authenticated;
revoke all on table atsrs_private.atsrs_payment_transactions from public, anon, authenticated;
revoke all on table atsrs_private.atsrs_payment_webhook_events from public, anon, authenticated;
revoke all on table atsrs_private.atsrs_billing_audit_log from public, anon, authenticated;
revoke all on all sequences in schema atsrs_private from public, anon, authenticated;

grant usage on schema atsrs_private to service_role;
grant select, insert, update, delete on table atsrs_private.atsrs_billing_plans to service_role;
grant select, insert, update, delete on table atsrs_private.atsrs_billing_customers to service_role;
grant select, insert, update, delete on table atsrs_private.atsrs_billing_subscriptions to service_role;
grant select, insert, update, delete on table atsrs_private.atsrs_payment_transactions to service_role;
grant select, insert, update, delete on table atsrs_private.atsrs_payment_webhook_events to service_role;
grant select, insert on table atsrs_private.atsrs_billing_audit_log to service_role;
grant usage, select on all sequences in schema atsrs_private to service_role;

comment on table atsrs_private.atsrs_payment_transactions is
  'Bank-agnostic payment state. Never store PAN, CVV, card expiry, bank credentials or raw payment payloads.';
comment on table atsrs_private.atsrs_payment_webhook_events is
  'Dedupe and processing metadata only. Raw provider payloads and secrets are intentionally not retained.';

commit;
