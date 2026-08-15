# ATSRS pre-bank payment readiness

Status: code foundation prepared; paid billing remains disabled.

## Completed before bank onboarding

- Canonical Personal billing catalogue uses Free, Bronze, Silver and Gold.
- Prices are stored in integer minor units and checkout is disabled for every plan.
- Private customer, subscription, payment, webhook-dedupe and billing-audit tables are defined.
- Every billing table has RLS enabled and is inaccessible to `anon` and `authenticated` roles.
- Payment creation is authenticated, origin-restricted and idempotency-ready.
- Webhooks fail closed and must verify the provider signature before any event is stored or applied.
- Only a SHA-256 digest and safe processing metadata are retained for webhook events; raw payment payloads are not retained.
- Card number, CVV and card expiry are intentionally outside ATSRS. Card entry must remain on the bank or licensed provider page.
- Subscription/Billing Terms and Refund/Cancellation Policy are published as pre-launch notices.
- A rollback script exists for the new billing objects.

## Must remain disabled until bank onboarding

- `ATSRS_BILLING_ENABLED` stays `false`.
- No plan has `checkout_enabled = true`.
- No provider adapter is registered.
- No real provider credentials or webhook secrets are committed to the repository.
- Existing production users and legacy quota rows are not migrated by this phase.

## Needed from the selected bank

- Approved merchant/e-commerce account and supported settlement currencies.
- Official API and hosted-checkout documentation for test and production.
- Test merchant credentials and production credential handover procedure.
- Request-signing and webhook-signature specifications, including certificate rotation.
- Callback IP/domain requirements, allowed return URLs and timeout/retry behaviour.
- Recurring payment/tokenisation capability and explicit cardholder-consent requirements.
- Refund, void, reversal, partial-refund, 3-D Secure and chargeback operations.
- Reconciliation report/API fields, fees, settlement timing and test certification cases.

## Activation gate after bank details arrive

1. Implement one reviewed bank adapter from official documentation.
2. Store credentials only in Supabase project secrets.
3. Apply the migration to staging and run database/security advisors.
4. Exercise success, failure, cancel, timeout, duplicate webhook, refund and tampered-signature cases.
5. Confirm legal company name, address, tax details, support channel and final plan quantities.
6. Complete bank certification and reconciliation rehearsal.
7. Back up production, apply the migration, monitor the first controlled transaction, then enable one plan at a time.
