-- Rollback for the pre-bank billing foundation only.
-- It does not touch the legacy quota/subscription tables or user data outside
-- the atsrs_private billing objects created by the matching migration.

begin;

drop function if exists atsrs_private.atsrs_apply_verified_payment_event(
  text, text, text, timestamptz, text, text, text, integer, text, text
);
drop table if exists atsrs_private.atsrs_payment_reconciliation_cases;
drop table if exists atsrs_private.atsrs_payment_refunds;
drop table if exists atsrs_private.atsrs_billing_audit_log;
drop table if exists atsrs_private.atsrs_payment_webhook_events;
drop table if exists atsrs_private.atsrs_payment_transactions;
drop table if exists atsrs_private.atsrs_billing_subscriptions;
drop table if exists atsrs_private.atsrs_billing_customers;
drop table if exists atsrs_private.atsrs_billing_plans;

commit;
