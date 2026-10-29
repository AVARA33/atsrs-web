# PAŞA payment production deployment — disabled state — 29 October 2026

## Outcome

The reviewed database reconciliation and Edge Function bundle were deployed to
the ATSRS production Supabase project while every checkout flag remained
disabled. No real payment, refund or card operation was attempted.

Production project: `hwtjuqyxzivymofamwxl` (`eu-west-1`).

## Applied

- Hardened payment lifecycle reconciliation.
- Public jobs-feed explicit-allowlist reconciliation.
- `billing-quote` version 2, JWT required.
- `billing-checkout` version 2, JWT required.
- `billing-pasha-return` version 2, JWT disabled by design for the bank return
  endpoint; final status is verified server-to-server.

## Post-deployment evidence

- All plan rows retain `checkout_enabled=false`.
- Bronze is USD 19.99 monthly and USD 192 yearly, catalog version 3.
- Production contains zero payment transaction rows.
- Ten required payment columns and all three required payment indexes are
  present.
- `anon` and `authenticated` cannot use `atsrs_private`; `service_role` can.
- Anonymous jobs-feed output contains no internal fields, masks recruiter email
  and source URL, and returns the limited-access contract.
- Missing-auth probes return `401` for quote and checkout.
- A safe `GET` probe returns `405` for the PAŞA return endpoint.
- Local readiness remains 26/26 assertions with the frozen-lock Deno type check
  and Cloudflare build passing.

## Still closed

The public pricing page has not yet been activated and production checkout is
not usable. The fixed-IP connector host, PAŞA credentials/certificates,
allow-listing, terminal and amount convention, test-card matrix and written
bank certification remain mandatory gates before checkout can be enabled.

The disposable Supabase project `mzqufdnjjqfwyfgkmbbi` was paused after its
validation run and is now `INACTIVE`.
