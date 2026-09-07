# ATSRS pre-bank payment readiness

Status: production foundation deployed; paid billing remains disabled.

## Completed before bank onboarding

- Server-side Personal billing catalogue uses Free, Bronze, Silver, Gold and Titan.
- Prices are stored in integer minor units and checkout is disabled for every plan.
- Private customer, subscription, payment, webhook-dedupe and billing-audit tables are defined.
- Refund requests and payment-reconciliation cases have private, auditable records.
- Every billing table has RLS enabled and is inaccessible to `anon` and `authenticated` roles.
- The server issues short-lived signed quotes; checkout rejects altered plan, cycle, price, currency or catalogue version values.
- Payment creation is authenticated, origin-restricted and idempotent per user purchase intent.
- Webhooks fail closed, deduplicate atomically and apply only valid forward state transitions.
- Paid events with an unexpected amount or currency are quarantined for reconciliation instead of granting access.
- User billing history and refund-request APIs enforce ownership and expose no provider payment identifiers.
- Only a SHA-256 digest and safe processing metadata are retained for webhook events; raw payment payloads are not retained.
- Card number, CVV and card expiry are intentionally outside ATSRS. Card entry must remain on the bank or licensed provider page.
- Subscription/Billing Terms and Refund/Cancellation Policy are published as pre-launch notices.
- A rollback script exists for all new billing objects.
- Database migrations and all five billing Edge Functions are deployed to production with checkout disabled.

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
3. Configure the provider's expected merchant account, environment and callback identifiers in secrets and validate them in the adapter.
4. Exercise success, failure, cancel, timeout, duplicate webhook, refund and tampered-signature cases.
5. Confirm legal company name, address, tax details, support channel and final plan quantities.
6. Complete bank certification and reconciliation rehearsal.
7. Back up production, deploy the certified adapter, monitor the first controlled transaction, then enable one plan at a time.
