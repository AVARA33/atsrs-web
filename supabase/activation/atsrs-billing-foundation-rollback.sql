-- Rollback for the pre-bank billing foundation only.
-- It does not touch the legacy quota/subscription tables or user data outside
-- the atsrs_private billing objects created by the matching migration.

begin;

drop table if exists atsrs_private.atsrs_billing_audit_log;
drop table if exists atsrs_private.atsrs_payment_webhook_events;
drop table if exists atsrs_private.atsrs_payment_transactions;
drop table if exists atsrs_private.atsrs_billing_subscriptions;
drop table if exists atsrs_private.atsrs_billing_customers;
drop table if exists atsrs_private.atsrs_billing_plans;

commit;
