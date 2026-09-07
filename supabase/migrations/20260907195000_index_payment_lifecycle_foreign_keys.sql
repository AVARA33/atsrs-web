-- Cover billing foreign keys used by account, refund and reconciliation lookups.
-- Checkout remains disabled; this migration only adds indexes.

begin;

create index if not exists atsrs_billing_audit_actor_idx
  on atsrs_private.atsrs_billing_audit_log(actor_user_id)
  where actor_user_id is not null;

create index if not exists atsrs_billing_subscriptions_plan_idx
  on atsrs_private.atsrs_billing_subscriptions(plan_key);

create index if not exists atsrs_payment_transactions_plan_idx
  on atsrs_private.atsrs_payment_transactions(plan_key);

create index if not exists atsrs_payment_transactions_subscription_idx
  on atsrs_private.atsrs_payment_transactions(subscription_id)
  where subscription_id is not null;

create index if not exists atsrs_payment_webhook_transaction_idx
  on atsrs_private.atsrs_payment_webhook_events(payment_transaction_id)
  where payment_transaction_id is not null;

create index if not exists atsrs_payment_refunds_requested_by_idx
  on atsrs_private.atsrs_payment_refunds(requested_by);

create index if not exists atsrs_payment_reconciliation_transaction_idx
  on atsrs_private.atsrs_payment_reconciliation_cases(transaction_id)
  where transaction_id is not null;

create index if not exists atsrs_payment_reconciliation_webhook_idx
  on atsrs_private.atsrs_payment_reconciliation_cases(webhook_event_id)
  where webhook_event_id is not null;

commit;
