# PAŞA Bank infrastructure readiness — 29 October 2026

## Outcome

ATSRS is not yet ready to begin PAŞA Bank certification. The reconciled
Supabase bundle is now deployed and fail-closed, but one infrastructure blocker
and the bank-controlled onboarding gates remain:

1. no authorized hardened host with a dedicated fixed public IPv4 address was
   found; and
2. bank credentials/certification, fixed-IP allow-listing and the bank test-card
   matrix have not been supplied or completed.

Production billing remains fail-closed. No host was purchased, no external
message was sent, no certificate/key was installed, and no real payment was
attempted.

## Verified live state

- Supabase project `hwtjuqyxzivymofamwxl` is `ACTIVE_HEALTHY` in `eu-west-1`.
- `billing-pasha-return` is active, version 2, with JWT verification disabled by
  design for the bank callback. Its deployed bundle includes the PAŞA adapter.
- The callback URL is reachable; a safe `GET` probe returns the expected `405`.
- `billing-checkout` is active, version 2, with JWT verification enabled.
- The deployed checkout contains purchase-intent idempotency, signed quote
  verification, reconciliation handling and billing audit logging.
- `billing-quote` is active, version 2, with JWT verification enabled.
- The deployed checkout and callback now contain the reviewed PAŞA adapter and
  the Cyber-verified pending-to-paid suppression fix. They remain unusable while
  all plan checkout flags are disabled and no connector host is configured.
- Live database access checks confirm the four billing/payment tables have RLS
  enabled, `anon` and `authenticated` have neither schema usage nor table
  SELECT/INSERT privileges, and `service_role` retains access. No billing-named
  database function is exposed. The no-policy state is therefore intentional
  service-role-only isolation, not an open Data API path.

## Verified local state

- `services/pasha-ecomm-connector` starts on loopback and `/health` returns
  `{"ok":true}`.
- Local tests pass:
  - eight connector protocol, HMAC rotation, durable replay, concurrency and
    idempotency tests;
  - PAŞA e-commerce protocol contract;
  - PAŞA callback monotonic-state contract;
  - PAŞA security hardening contract;
  - ATSRS bank-agnostic billing foundation contract.
- The local payment provider now preserves the current provider interface and
  adds PAŞA behind an async resolver. Unsupported PAŞA lookup/refund operations
  fail closed.
- The local checkout now includes signed quotes, catalog-version validation,
  user-bound purchase-intent idempotency, reconciliation-required handling and
  safe audit records while adding PAŞA client-IP/language handoff.
- Connector nonce replay and registration idempotency are durable across
  restarts and shared by processes using one atomically replaced state file.
  An uncertain registration cannot automatically call the bank again.
- The callback now uses a durable database claim, bounded retries, a cooldown,
  compare-and-set updates and monotonic payment transitions. A paid/refunded
  transaction cannot be downgraded by a repeated or concurrent callback.
- Cyber review found and the local patch fixes a pending-to-paid suppression
  path: a `pending` bank result is no longer permanently marked processed.
  Nonfinal results remain retryable after cooldown; legacy processed/nonfinal
  claims are reclaimed after re-reading current payment state.
- Bank MerchantHandler and ClientHandler URLs use exact allowlists. Oversized
  connector requests are stopped and the supplied Nginx template caps request
  bodies at 16 KiB.
- Hardened systemd, Nginx, secret/state-path and operational templates are in
  `services/pasha-ecomm-connector/deploy`.
- Connector HMAC secrets now require at least 32 bytes. Requests carry a bounded
  key ID, and the connector supports an overlap keyring so secrets can rotate
  without a cutover gap.
- Connector startup now runs a mandatory fail-closed preflight. It refuses to
  listen—even on `/health`—unless loopback binding, confirmed amount convention,
  approved PAŞA endpoint, bounded rotation keyring, protected absolute paths,
  certificate/private-key match, certificate lifetime and Unix key/state
  permissions pass. Secret values are never printed.
- A checksum-verified portable Deno 2.9.8 runtime now performs authoritative
  type checks for `billing-quote`, `billing-checkout` and
  `billing-pasha-return`. It found two issues that Node syntax stripping missed:
  the PAŞA normalized status return type and a missing callback event field in
  two select shapes. Both are fixed, the frozen-lockfile Deno check passes, and
  Supabase staging integration now passes on a disposable project.
- The current local pricing page does not yet request `billing-quote` or send a
  purchase-intent `Idempotency-Key`. This gap is now closed locally: the browser
  flow requests a signed quote, retains one UUID across retries and rejects any
  redirect outside the exact PAŞA ClientHandler allowlist. The HTML remains
  fail-closed with `data-billing-enabled="false"`, so no paid control is usable.
- Read-only live inspection confirmed the applied payment migrations
  `20260907194451_atsrs_billing_foundation` and
  `20260907194508_harden_payment_lifecycle`, plus the exact hardened columns,
  constraints and indexes. The idempotent local reconciliation migration
  `20261029230000_reconcile_hardened_payment_lifecycle.sql` was prepared but
  was not applied.
- The Bronze price decision is resolved and deployed while disabled: USD
  `$19.99/month` and `$192/year`, represented as 1999 and 19200 minor units with
  catalog version 3.

## Local completion files

- `supabase/functions/_shared/billing-quote.ts`
- `supabase/functions/_shared/payment-provider.ts`
- `supabase/functions/_shared/pasha-ecomm-protocol.mjs`
- `supabase/functions/_shared/pasha-ecomm.ts`
- `supabase/functions/_shared/pasha-return-state.mjs`
- `supabase/functions/_shared/request-body.ts`
- `supabase/functions/billing-quote/index.ts`
- `supabase/functions/billing-checkout/index.ts`
- `supabase/functions/billing-pasha-return/index.ts`
- `services/pasha-ecomm-connector/server.mjs`
- `services/pasha-ecomm-connector/state-store.mjs`
- `services/pasha-ecomm-connector/deploy/*`
- `js/pricing-checkout-core.mjs`
- `js/pricing-checkout.js`
- `pricing.html`
- `supabase/migrations/20261029230000_reconcile_hardened_payment_lifecycle.sql`
- payment tests under `services/pasha-ecomm-connector/test` and `tests/`.

The provider-specific, non-executed host sequence is documented at
`services/pasha-ecomm-connector/deploy/digitalocean-provisioning-checklist.md`.
It includes the critical requirement to prove that the connector's outbound
source address is the Reserved IPv4 before that IP is supplied to PAŞA Bank.

The read-only live/local function comparison is recorded at
`docs/payments/pasha-live-drift-audit-2026-10-29.md`.

Verification evidence: the reproducible `npm run test:pasha-local` gate passes
26 assertions across eleven test files, checks seven Edge Function TypeScript
files with Node type stripping, runs Deno type checking with the frozen lockfile,
verifies the reconciliation migration contract, and refuses to pass if the
production pricing UI is enabled. Disposable Supabase staging integration also
passes; production deployment and bank certification remain gates.

## Fixed-IP host discovery

No qualifying existing host was found in:

- the ATSRS repository deployment files;
- local SSH configuration;
- installed/configured AWS, Azure, Google Cloud, DigitalOcean, Fly, Vercel,
  Netlify, Cloudflare Wrangler, Docker or Podman tooling.

The workstation itself is not an acceptable payment connector host. A suitable
host requires a dedicated static public IPv4 address, supported Linux runtime,
HTTPS reverse proxy, firewall, service supervision, protected secret storage,
monitoring and certificate rotation support.

Provisioning a new VPS or reserved IP would incur cost and therefore remains
blocked pending a separately authorized existing resource or purchase.

### Recommended acquisition option (not purchased)

The operational recommendation is a DigitalOcean Basic Droplet with 2 GiB RAM,
1 vCPU and 50 GiB SSD in an EU region, currently listed at USD 12/month, plus an
assigned Reserved IPv4. DigitalOcean documents that an assigned Reserved IP is
a publicly accessible static address and is free while assigned to a Droplet.
This option is preferred over the cheaper Hetzner CX23 for this first payment
connector because the current Hetzner product page reports CX23 availability as
unavailable, while the PAŞA allow-list requires a stable, provisionable source
IP. No account was opened and no purchase was made.

Official references checked on 29 October 2026:

- https://www.digitalocean.com/pricing/droplets
- https://docs.digitalocean.com/products/networking/reserved-ips/details/
- https://www.hetzner.com/cloud/cost-optimized/
- https://docs.hetzner.com/cloud/servers/primary-ips/overview/

## Required validation before deployment

The reconciled bundle must still pass these controlled gates:

1. compare the live schema and deployed function versions immediately before
   deployment; the local migration history is behind the live hardened billing
   migration and must not be treated as the deployment source of truth;
2. repeat the completed staging assertions after the controlled production
   deployment while billing remains disabled;
3. test restart replay, uncertain registration reconciliation, concurrent
   purchase intent, concurrent callback and stale quote cases;
4. resolve the `$19.99` public / `$20.00` live-catalog mismatch, then update the
   catalog/UI through the separately reviewed business decision;
5. validate the exact bank endpoint, amount representation, result codes and
   certificate chain against PAŞA's signed merchant documentation;
6. deploy only while `ATSRS_BILLING_ENABLED=false`, then verify the deployed
   bundle and safe failure behavior.

## Security coordination

Supabase advisors currently report security warnings, including public
execution of several `SECURITY DEFINER` job feed/facet functions. Cyber's live
triage confirmed they do not reach private payment/billing objects. The
authenticated functions contain direct ownership/workspace/admin checks or call
a guarded admin helper, so they are not a direct PAŞA blocker. Admin AAL2 is not
currently enforced and remains privileged-access hardening before broad
production.

The anonymous job catalog RPCs are intentionally public, but the live legacy
`atsrs_jobs_feed` drifted to denylist serialization and can expose newer
internal job metadata fields. The local
`20261029233000_reconcile_public_jobs_feed_contract.sql` migration restores an
explicit allowlist and its regression contract passes. This platform leak is a
certification blocker until staged, deployed and confirmed by a fresh advisor
run, even though it provides no payment-table access.

Leaked-password protection is disabled, but live auth evidence shows zero
password identities, 16 Google identities and zero anonymous users. Cyber
classified it as non-blocking for the current payment launch; it becomes a
mandatory gate before email/password authentication is enabled.

Payment tables in `atsrs_private` have RLS enabled and no policies. Live schema
and privilege checks now confirm this is intentional service-role-only
isolation: `anon` and `authenticated` cannot use the schema or access the four
billing/payment tables. This item is closed for the payment gate.

The existing merchant private key is stored as an unencrypted PKCS#8 PEM on the
desktop with an owner-only Windows ACL. It must not be copied to a connector or
used for production until Cyber Security Manager supplies a containment and
host-secret-storage decision.

Cyber Security Manager delivered an internal callback finding. The
pending-to-paid suppression fix and regression coverage are complete locally,
and Cyber independently verified the finding as fixed. Desktop-key containment
and host secret-storage procedures remain deployment gates; the merchant private
key must not leave its current protected location until those procedures are
applied on the approved host.

## Bank technical packet

The unsent bank-ready draft is:

`docs/payments/pasha-bank-technical-packet-draft.md`

It includes the verified callback, CSR fingerprint, fixed-IP placeholder and
the exact confirmations still required from PAŞA Bank. It contains no private
key or secret.

## Exact next action

1. Identify an already-paid suitable fixed-IP Linux host, or separately approve
   acquisition of one. Do not purchase automatically.
2. Apply the hardened host-secret-storage and merchant-key containment procedure
   on that approved host; do not copy the key before the host is ready.
3. Deploy the approved Bronze 1999/19200 catalog reconciliation only after a
   final live diff; do not deploy from the older local migration history.
4. Safest deployment order after all approvals: keep billing/UI disabled;
   validate the additive migration on staging; deploy quote/shared functions;
   deploy checkout and callback; provision the hardened connector; deploy the
   still-disabled UI; run replay/concurrency/failure tests; complete bank
   certification; only then separately enable approved plans and UI.
5. External PAŞA Bank WhatsApp/email contact is deferred until next week by the
   human user. Do not send it earlier.
