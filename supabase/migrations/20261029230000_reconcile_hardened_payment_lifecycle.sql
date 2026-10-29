-- Reconcile local migration history with the already-applied live hardened
-- billing lifecycle. This migration is intentionally idempotent: on the live
-- project it should be a no-op, while a fresh local database receives the
-- columns, constraints and indexes used by the deployed billing functions.
-- It does not enable checkout or move any user to a paid plan.

begin;

alter table atsrs_private.atsrs_billing_plans
  add column if not exists catalog_version integer not null default 1;

do $$
declare
  existing_definition text;
begin
  select pg_get_constraintdef(oid) into existing_definition
  from pg_constraint
  where conrelid = 'atsrs_private.atsrs_billing_plans'::regclass
    and conname = 'atsrs_billing_plans_key_check';
  if existing_definition is null or position('titan' in existing_definition) = 0 then
    alter table atsrs_private.atsrs_billing_plans
      drop constraint if exists atsrs_billing_plans_key_check;
    alter table atsrs_private.atsrs_billing_plans
      add constraint atsrs_billing_plans_key_check
      check (plan_key in ('free', 'bronze', 'silver', 'gold', 'titan'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'atsrs_private.atsrs_billing_plans'::regclass
      and conname = 'atsrs_billing_plans_catalog_version_check'
  ) then
    alter table atsrs_private.atsrs_billing_plans
      add constraint atsrs_billing_plans_catalog_version_check
      check (catalog_version > 0);
  end if;
end $$;

insert into atsrs_private.atsrs_billing_plans (
  plan_key, display_name, currency, monthly_amount_minor,
  yearly_amount_minor, checkout_enabled, sort_order, catalog_version
)
values
  ('free', 'Free', 'USD', 0, 0, false, 10, 2),
  ('bronze', 'Bronze', 'USD', 1999, 19200, false, 20, 3),
  ('silver', 'Silver', 'USD', 4000, 38400, false, 30, 2),
  ('gold', 'Gold', 'USD', 7000, 67200, false, 40, 2),
  ('titan', 'Titan', 'USD', 12000, 115200, false, 50, 2)
on conflict (plan_key) do update set
  display_name = excluded.display_name,
  currency = excluded.currency,
  monthly_amount_minor = excluded.monthly_amount_minor,
  yearly_amount_minor = excluded.yearly_amount_minor,
  sort_order = excluded.sort_order,
  catalog_version = excluded.catalog_version,
  updated_at = now()
where atsrs_private.atsrs_billing_plans.catalog_version < excluded.catalog_version;

alter table atsrs_private.atsrs_payment_transactions
  add column if not exists purchase_intent_key uuid,
  add column if not exists quote_version integer not null default 1,
  add column if not exists provider_event_at timestamptz,
  add column if not exists provider_event_reference text,
  add column if not exists settled_amount_minor integer,
  add column if not exists settled_currency text,
  add column if not exists reconciliation_required boolean not null default false;

update atsrs_private.atsrs_payment_transactions
set purchase_intent_key = idempotency_key
where purchase_intent_key is null;

alter table atsrs_private.atsrs_payment_transactions
  alter column purchase_intent_key set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'atsrs_private.atsrs_payment_transactions'::regclass
      and conname = 'atsrs_payment_transactions_quote_version_check'
  ) then
    alter table atsrs_private.atsrs_payment_transactions
      add constraint atsrs_payment_transactions_quote_version_check
      check (quote_version > 0);
  end if;
end $$;

create unique index if not exists atsrs_payment_user_purchase_intent_idx
  on atsrs_private.atsrs_payment_transactions(user_id, purchase_intent_key);
create index if not exists atsrs_payment_reconciliation_idx
  on atsrs_private.atsrs_payment_transactions(status, updated_at)
  where reconciliation_required
    or status in ('initiated', 'pending', 'authorized');
create index if not exists atsrs_payment_transactions_plan_idx
  on atsrs_private.atsrs_payment_transactions(plan_key);
create index if not exists atsrs_payment_transactions_subscription_idx
  on atsrs_private.atsrs_payment_transactions(subscription_id)
  where subscription_id is not null;

alter table atsrs_private.atsrs_payment_webhook_events
  add column if not exists provider_event_at timestamptz,
  add column if not exists payment_transaction_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'atsrs_private.atsrs_payment_webhook_events'::regclass
      and conname = 'atsrs_payment_webhook_events_payment_transaction_id_fkey'
  ) then
    alter table atsrs_private.atsrs_payment_webhook_events
      add constraint atsrs_payment_webhook_events_payment_transaction_id_fkey
      foreign key (payment_transaction_id)
      references atsrs_private.atsrs_payment_transactions(id)
      on delete set null;
  end if;
end $$;

create index if not exists atsrs_payment_webhook_transaction_idx
  on atsrs_private.atsrs_payment_webhook_events(payment_transaction_id)
  where payment_transaction_id is not null;

commit;
