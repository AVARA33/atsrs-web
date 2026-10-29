# PAŞA billing live drift audit — 29 October 2026

## Scope

Read-only comparison of the active Supabase project
`hwtjuqyxzivymofamwxl` with the local PAŞA payment bundle. No migration,
function deployment, secret change or billing activation was performed.

## Live safety state

- Project status: `ACTIVE_HEALTHY`, PostgreSQL 17, `eu-west-1`.
- All billing plans have `checkout_enabled=false`.
- Payment transaction count: zero.
- The last 24 hours of narrowly filtered billing function logs contain only one
  rejected unauthenticated checkout request (`401`) and one safe callback method
  probe (`405`); there is no successful checkout or callback activity.
- `billing-quote` v1 and `billing-checkout` v1 require JWT.
- `billing-pasha-return` v1 has JWT verification disabled by design because it
  is the bank return endpoint; it performs its own transaction verification.
- The four `atsrs_private` billing/payment tables have RLS enabled.
- `anon` and `authenticated` have no `atsrs_private` schema usage and no
  SELECT/INSERT access to those tables; `service_role` has access.

## Confirmed drift

| Component | Live bundle | Local reviewed bundle | Required action |
| --- | --- | --- | --- |
| `billing-quote` | v1, signed quote foundation | Deno-checked equivalent plus current shared provider types | Include in one controlled disabled-billing release so shared files are consistent. |
| `billing-checkout` | v1; signed quote/idempotency safeguards, but no `pasha-ecomm` adapter in its deployed shared provider | PAŞA provider resolver, client IP/language handoff, reconciliation fail-closed path | Deploy only after staging integration, with `ATSRS_BILLING_ENABLED=false`. |
| `billing-pasha-return` | v1; PAŞA verification present, but no durable callback-event decision helper and no pending-to-paid suppression fix | Cyber-verified retry/finalization logic, durable claims, cooldown and monotonic CAS updates | Must replace live v1 before bank certification. |
| Pricing UI | Public paid controls disabled | Signed quote + UUID purchase-intent flow; exact redirect allowlist; still disabled | Deploy disabled UI only after approved catalog price. |
| Database | Hardened billing foundation already present; plans disabled | Idempotent reconciliation migration prepared | Validate on staging and apply only if the pre-deploy live schema diff proves it is needed. |

## Local validation evidence

- `npm run test:pasha-local`: 26 assertions pass across eleven test files,
  including the security-advisor activation contract and production connector
  preflight fail-closed cases.
- Seven payment Edge Function files pass Node syntax stripping.
- Deno 2.9.8 with the frozen `deno.lock` passes type checking for
  `billing-quote`, `billing-checkout` and `billing-pasha-return`.
- The Deno check found and drove fixes for two issues hidden by syntax-only
  checks: PAŞA normalized status typing and callback event select shape.
- Billing UI remains explicitly disabled and the gate fails if it is enabled.
- The Cloudflare production build completes with 447 files; its `dist` output
  contains `pricing.html`, `pricing-checkout.js` and
  `pricing-checkout-core.mjs`, while `data-billing-enabled="false"` remains
  intact.

## Controlled release order

1. Resolve the Bronze `$19.99` public / `$20.00` catalog decision.
2. Use the completed disposable staging evidence in
   `pasha-staging-validation-2026-10-29.md`.
3. Re-read live schema/function versions and abort on unexpected drift.
4. Apply only the additive changes proven by the final live diff; do not rewrite
   applied history.
5. Deploy quote/shared modules, checkout and callback while billing is disabled.
6. Run stale quote, duplicate purchase intent, restart replay, uncertain bank
   registration, pending-to-paid, concurrent callback and malformed input tests.
7. Provision the hardened fixed-IP connector and prove its outbound source IP.
8. Deploy the reviewed bundle to production while all plan and UI gates remain
   disabled; repeat safe-failure and callback verification checks.
9. Complete PAŞA certificate exchange, IP allow-listing and certification.
10. Enable only the approved plan/catalog values after every gate is signed off.

## Current blockers

- No approved fixed-IP connector host has been purchased or supplied.
- Disposable Supabase staging validation is complete; the temporary project is
  not a production dependency.
- Bronze is approved at USD 19.99/month and USD 192/year; production still has
  the old disabled catalog until controlled deployment.
- Bank terminal IDs, amount convention, signed certificate chain, allow-list,
  test cards and certification acceptance remain outstanding.
- The live legacy anonymous jobs feed still uses denylist serialization and can
  expose newly added internal metadata fields. The local explicit-allowlist
  reconciliation migration and contract test pass, but the production drift
  remains a certification blocker until staged and deployed.
- Privileged admin RPCs have ownership/admin guards but do not currently enforce
  AAL2. Cyber classified this as broad-production hardening rather than direct
  PAŞA data-path exposure; the launch decision must explicitly retain or add an
  AAL2 gate for privileged administration.

The production enablement gate remains closed.
