# PAŞA payment staging validation — 29 October 2026

## Outcome

The PAŞA payment reconciliation bundle and jobs-feed security remediation passed
on a disposable, non-production Supabase project. Production was not changed and
all production checkout flags remain disabled.

Temporary project:

- Name: `ATSRS Pasha Payment Staging`
- Project ref: `mzqufdnjjqfwyfgkmbbi`
- Region: `eu-west-1`
- Quoted cost: USD 0/month
- Production data copied: none
- Final status: `INACTIVE` (paused after validation)

The existing old staging project was not used because its migration history and
schema were materially stale. A minimal synthetic bootstrap modeled only the
pre-reconciliation payment and jobs-feed contracts, with no cron jobs, secrets,
production URLs, real users or external calls.

## Applied and verified

1. `20261029230000_reconcile_hardened_payment_lifecycle.sql`
2. `20261029233000_reconcile_public_jobs_feed_contract.sql`
3. `billing-quote` Edge Function, JWT required
4. `billing-checkout` Edge Function, JWT required
5. `billing-pasha-return` Edge Function, JWT disabled by design for the bank
   callback and protected by server-side transaction verification

## Evidence

- Payment reconciliation migration ran twice successfully, proving idempotency.
- Required payment columns: 10/10 present.
- Required indexes: 3/3 present.
- Payment/billing RLS: enabled on every tested table.
- `anon` / `authenticated` usage of `atsrs_private`: denied.
- `service_role` usage of `atsrs_private`: allowed.
- All five plans: `checkout_enabled=false`.
- Bronze catalog: USD 19.99 monthly, USD 192 yearly, catalog version 3.
- Synthetic transaction contract passed inside a rolled-back transaction:
  amount 1999 minor units, quote version 3, webhook FK present and duplicate
  purchase intent rejected.
- Post-rollback counts: zero synthetic users and zero payment rows.
- Anonymous jobs-feed contract passed: internal fields absent, recruiter email
  and source URL masked, limited access returned.
- Staging HTTP probes: quote and checkout reject missing JWT with `401`; callback
  rejects GET with `405` and JSON POST with `415`.
- Staging security advisor only reports the expected service-role-only no-policy
  tables and the intentional public jobs-feed `SECURITY DEFINER` RPC. The RPC's
  response was independently verified against the explicit allowlist.
- Local readiness gate: 26 assertions across 11 files, Deno type check passed,
  Cloudflare build passed, billing UI remained disabled.

## Remaining production gates

- Re-read production schema and deployed function versions immediately before
  deployment and abort on unexpected drift.
- Apply only the reviewed reconciliation changes needed by the live diff.
- Deploy the Deno-checked function bundle while billing remains disabled.
- Re-run the same schema, anonymous RPC, safe HTTP and security-advisor checks.
- Provision and harden the fixed-IP connector host.
- Complete PAŞA Bank certificate exchange, fixed-IP allow-listing, terminal and
  amount-format confirmation, test-card matrix and written certification.
- Enable checkout only after every gate above is complete.

No real payment, refund or card operation was attempted.

The production deployment described in
`pasha-production-disabled-deploy-2026-10-29.md` occurred only after this
disposable staging validation completed. The temporary project remains paused.
