-- Harden the disabled, bank-agnostic billing foundation before provider onboarding.
-- This migration does not enable checkout and never stores PAN, CVV, card expiry,
-- bank credentials, or raw provider payloads.

begin;

alter table atsrs_private.atsrs_billing_plans
  drop constraint if exists atsrs_billing_plans_key_check;
alter table atsrs_private.atsrs_billing_plans
  add column if not exists catalog_version integer not null default 1
    check (catalog_version > 0);
alter table atsrs_private.atsrs_billing_plans
  add constraint atsrs_billing_plans_key_check
  check (plan_key in ('free', 'bronze', 'silver', 'gold', 'titan'));

-- The server catalogue is authoritative. Keep every paid plan closed until the
-- provider adapter and bank certification are complete.
insert into atsrs_private.atsrs_billing_plans (
  plan_key, display_name, currency, monthly_amount_minor,
  yearly_amount_minor, checkout_enabled, sort_order
) values
  ('free', 'Free', 'USD', 0, 0, false, 10),
  ('bronze', 'Bronze', 'USD', 2000, 19200, false, 20),
  ('silver', 'Silver', 'USD', 4000, 38400, false, 30),
  ('gold', 'Gold', 'USD', 7000, 67200, false, 40),
  ('titan', 'Titan', 'USD', 12000, 115200, false, 50)
on conflict (plan_key) do update set
  display_name = excluded.display_name,
  currency = excluded.currency,
  monthly_amount_minor = excluded.monthly_amount_minor,
  yearly_amount_minor = excluded.yearly_amount_minor,
  checkout_enabled = false,
  sort_order = excluded.sort_order,
  updated_at = now();

update atsrs_private.atsrs_billing_plans
   set catalog_version = greatest(catalog_version, 2), updated_at = now();

alter table atsrs_private.atsrs_payment_transactions
  add column if not exists purchase_intent_key uuid,
  add column if not exists quote_version integer not null default 1
    check (quote_version > 0),
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

create unique index if not exists atsrs_payment_user_purchase_intent_idx
  on atsrs_private.atsrs_payment_transactions(user_id, purchase_intent_key);
create index if not exists atsrs_payment_reconciliation_idx
  on atsrs_private.atsrs_payment_transactions(status, updated_at)
  where reconciliation_required or status in ('initiated', 'pending', 'authorized');

alter table atsrs_private.atsrs_payment_webhook_events
  add column if not exists provider_event_at timestamptz,
  add column if not exists payment_transaction_id uuid
    references atsrs_private.atsrs_payment_transactions(id) on delete set null;

alter table atsrs_private.atsrs_billing_audit_log
  drop constraint if exists atsrs_billing_audit_log_entity_type_check;
alter table atsrs_private.atsrs_billing_audit_log
  add constraint atsrs_billing_audit_log_entity_type_check
  check (entity_type in ('customer','subscription','payment','webhook','plan','refund','reconciliation'));

create table if not exists atsrs_private.atsrs_payment_refunds (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references atsrs_private.atsrs_payment_transactions(id) on delete restrict,
  requested_by uuid references auth.users(id) on delete set null,
  provider_refund_reference text,
  idempotency_key uuid not null default gen_random_uuid(),
  amount_minor integer not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'requested'
    check (status in ('requested','processing','succeeded','failed','canceled')),
  safe_reason_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (transaction_id, idempotency_key),
  unique (provider_refund_reference)
);

create table if not exists atsrs_private.atsrs_payment_reconciliation_cases (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references atsrs_private.atsrs_payment_transactions(id) on delete set null,
  webhook_event_id bigint references atsrs_private.atsrs_payment_webhook_events(id) on delete set null,
  reason_code text not null,
  status text not null default 'open' check (status in ('open','retrying','resolved','ignored')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 100),
  next_attempt_at timestamptz,
  safe_details jsonb not null default '{}'::jsonb check (jsonb_typeof(safe_details) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists atsrs_payment_reconciliation_cases_due_idx
  on atsrs_private.atsrs_payment_reconciliation_cases(status, next_attempt_at)
  where status in ('open','retrying');

alter table atsrs_private.atsrs_payment_refunds enable row level security;
alter table atsrs_private.atsrs_payment_reconciliation_cases enable row level security;
revoke all on table atsrs_private.atsrs_payment_refunds from public, anon, authenticated;
revoke all on table atsrs_private.atsrs_payment_reconciliation_cases from public, anon, authenticated;
grant select, insert, update on table atsrs_private.atsrs_payment_refunds to service_role;
grant select, insert, update on table atsrs_private.atsrs_payment_reconciliation_cases to service_role;

-- Atomically claim and apply a verified provider event. The provider adapter
-- must verify the raw signature before calling this function.
create or replace function atsrs_private.atsrs_apply_verified_payment_event(
  p_provider text,
  p_event_reference text,
  p_payload_sha256 text,
  p_event_at timestamptz,
  p_order_reference text,
  p_payment_reference text,
  p_status text,
  p_amount_minor integer,
  p_currency text,
  p_safe_failure_code text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id bigint;
  v_payment atsrs_private.atsrs_payment_transactions%rowtype;
  v_now timestamptz := now();
  v_allowed boolean := false;
  v_refunded integer;
  v_legacy_plan text;
begin
  if p_provider is null or p_event_reference is null or p_payload_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_VERIFIED_EVENT';
  end if;

  insert into atsrs_private.atsrs_payment_webhook_events (
    provider, provider_event_reference, payload_sha256, signature_verified,
    status, attempt_count, provider_event_at
  ) values (
    p_provider, p_event_reference, p_payload_sha256, true,
    'received', 1, p_event_at
  ) on conflict (provider, provider_event_reference) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    return jsonb_build_object('result', 'duplicate');
  end if;

  select * into v_payment
    from atsrs_private.atsrs_payment_transactions
   where provider = p_provider and provider_order_reference = p_order_reference
   for update;

  if not found then
    update atsrs_private.atsrs_payment_webhook_events
       set status='failed', last_error_code='PAYMENT_NOT_FOUND'
     where id=v_event_id;
    insert into atsrs_private.atsrs_payment_reconciliation_cases (
      webhook_event_id, reason_code, next_attempt_at,
      safe_details
    ) values (
      v_event_id, 'PAYMENT_NOT_FOUND', v_now + interval '2 minutes',
      jsonb_build_object('provider', p_provider, 'order_reference', left(coalesce(p_order_reference,''), 120))
    );
    return jsonb_build_object('result', 'unmatched');
  end if;

  update atsrs_private.atsrs_payment_webhook_events
     set payment_transaction_id=v_payment.id
   where id=v_event_id;

  if p_status = 'paid' and (
    p_amount_minor is null or p_amount_minor <> v_payment.amount_minor or
    p_currency is null or upper(p_currency) <> v_payment.currency
  ) then
    update atsrs_private.atsrs_payment_webhook_events
       set status='failed', last_error_code='SETTLEMENT_MISMATCH'
     where id=v_event_id;
    update atsrs_private.atsrs_payment_transactions
       set reconciliation_required=true, updated_at=v_now
     where id=v_payment.id;
    insert into atsrs_private.atsrs_payment_reconciliation_cases (
      transaction_id, webhook_event_id, reason_code, next_attempt_at
    ) values (v_payment.id, v_event_id, 'SETTLEMENT_MISMATCH', v_now + interval '2 minutes');
    return jsonb_build_object('result', 'mismatch');
  end if;

  v_allowed := case v_payment.status
    when 'initiated' then p_status in ('pending','authorized','paid','failed','canceled','expired')
    when 'pending' then p_status in ('authorized','paid','failed','canceled','expired')
    when 'authorized' then p_status in ('paid','failed','canceled','expired')
    when 'paid' then p_status in ('partially_refunded','refunded')
    when 'partially_refunded' then p_status in ('partially_refunded','refunded')
    else false
  end;

  if p_status is null or not v_allowed or
     (v_payment.provider_event_at is not null and p_event_at is not null and p_event_at < v_payment.provider_event_at) then
    update atsrs_private.atsrs_payment_webhook_events
       set status='ignored', processed_at=v_now, last_error_code='STALE_OR_INVALID_TRANSITION'
     where id=v_event_id;
    insert into atsrs_private.atsrs_billing_audit_log(action, entity_type, entity_reference, safe_details)
    values ('payment_event_ignored','webhook',p_event_reference,
      jsonb_build_object('transaction_id',v_payment.id,'from',v_payment.status,'to',p_status));
    return jsonb_build_object('result', 'ignored');
  end if;

  v_refunded := case
    when p_status='refunded' then v_payment.amount_minor
    when p_status='partially_refunded' then greatest(v_payment.refunded_amount_minor, coalesce(p_amount_minor,0))
    else v_payment.refunded_amount_minor
  end;

  update atsrs_private.atsrs_payment_transactions
     set status=p_status,
         provider_payment_reference=coalesce(p_payment_reference,provider_payment_reference),
         provider_event_reference=p_event_reference,
         provider_event_at=coalesce(p_event_at,v_now),
         settled_amount_minor=case when p_status='paid' then p_amount_minor else settled_amount_minor end,
         settled_currency=case when p_status='paid' then upper(p_currency) else settled_currency end,
         refunded_amount_minor=v_refunded,
         failure_code=left(p_safe_failure_code,120),
         paid_at=case when p_status='paid' then coalesce(p_event_at,v_now) else paid_at end,
         reconciliation_required=false,
         updated_at=v_now
   where id=v_payment.id;

  if p_status='paid' then
    v_legacy_plan := case when v_payment.plan_key='bronze' then 'pro' else 'business' end;
    insert into public.atsrs_subscriptions(user_id,plan,status,created_at,updated_at)
    values(v_payment.user_id,v_legacy_plan,'active',v_now,v_now)
    on conflict(user_id) do update set plan=excluded.plan,status='active',updated_at=v_now;

    insert into atsrs_private.atsrs_billing_subscriptions(
      user_id,plan_key,billing_cycle,status,currency,amount_minor,provider,
      current_period_start,current_period_end,created_at,updated_at
    ) values(
      v_payment.user_id,v_payment.plan_key,v_payment.billing_cycle,'active',
      v_payment.currency,v_payment.amount_minor,v_payment.provider,v_now,
      case when v_payment.billing_cycle='monthly' then v_now+interval '1 month' else v_now+interval '1 year' end,
      v_now,v_now
    ) on conflict(user_id) where status in ('pending','active','trialing','past_due','paused')
    do update set plan_key=excluded.plan_key,billing_cycle=excluded.billing_cycle,
      status='active',currency=excluded.currency,amount_minor=excluded.amount_minor,
      current_period_start=excluded.current_period_start,
      current_period_end=excluded.current_period_end,updated_at=v_now
    returning id into v_payment.subscription_id;

    update atsrs_private.atsrs_payment_transactions
       set subscription_id=v_payment.subscription_id
     where id=v_payment.id;
  elsif p_status='refunded' then
    update atsrs_private.atsrs_billing_subscriptions
       set status='canceled', canceled_at=v_now, updated_at=v_now
     where id=v_payment.subscription_id;
    update public.atsrs_subscriptions
       set plan='free', status='active', updated_at=v_now
     where user_id=v_payment.user_id;
  end if;

  update atsrs_private.atsrs_payment_webhook_events
     set status='processed', processed_at=v_now, last_error_code=null
   where id=v_event_id;
  insert into atsrs_private.atsrs_billing_audit_log(action,entity_type,entity_reference,safe_details)
  values('payment_status_changed','payment',v_payment.id::text,
    jsonb_build_object('from',v_payment.status,'to',p_status,'event_reference',p_event_reference));

  return jsonb_build_object('result','processed','transaction_id',v_payment.id,'status',p_status);
exception when others then
  if v_event_id is not null then
    update atsrs_private.atsrs_payment_webhook_events
       set status='failed', last_error_code=left(sqlstate,120)
     where id=v_event_id;
  end if;
  raise;
end;
$$;

revoke all on function atsrs_private.atsrs_apply_verified_payment_event(
  text,text,text,timestamptz,text,text,text,integer,text,text
) from public, anon, authenticated;
grant execute on function atsrs_private.atsrs_apply_verified_payment_event(
  text,text,text,timestamptz,text,text,text,integer,text,text
) to service_role;

comment on table atsrs_private.atsrs_payment_refunds is
  'Refund lifecycle metadata only. Never store card or bank credentials.';

commit;
