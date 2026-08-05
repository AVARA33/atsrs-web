# Dedicated Recipient Links — implementation and rollback plan

## Scope and invariants

- Existing `atsrs_profile_shares`, General Share tokens, selected documents,
  expiry values, access requests and events are unchanged.
- Dedicated recipient links are additive and default-off.
- Production project is `hwtjuqyxzivymofamwxl`; staging is
  `nsbmbbqgekcwmdqmqsao`. Staging and production refs must never match.
- The current subscription table uses `free`, `pro` and `business`; it is not a
  valid source of truth for the proposed Silver/Titan/Gold limits. Until a
  billing migration is separately approved, dedicated links are enabled only
  by a server-side owner allowlist with an explicit active-link limit.
- Raw share tokens, OTPs, viewer tokens, email addresses, full IP addresses and
  full user agents are never persisted in the dedicated-share tables or logs.

## Additive architecture

1. New dedicated-share, document, OTP challenge, viewer session, access request
   and audit-event tables. Every public table has RLS, ownership policies and
   explicit grants; anon has no direct table access.
2. A private default-off entitlement table controls canary access and the
   server-enforced active-link limit.
3. Owner operations and public verification run through the additive
   `recipient-share` Edge Function. Owner operations validate the user with
   `auth.getUser()` and re-check every selected Personal document.
4. Public URLs use a fragment token (`#recipient=...`) so the raw token is not
   sent in HTTP URL analytics. Before email OTP verification the response is a
   generic verification state and contains no owner, recipient or document
   details.
5. Recipient email and rate-limit identifiers use domain-separated HMAC-SHA256
   derived from the existing server-only Supabase secret key. No new vendor or
   secret is introduced.
6. Preview and approved download URLs are short-lived Storage signed URLs and
   are capped by both viewer-session and dedicated-share expiry.

## Staging sequence

1. Verify the production-aligned code ZIP, previous restore-proven schema/data
   package, current catalog/migration hashes and General Share data checksum.
2. Apply the new migration only to staging.
3. Deploy the updated function only to staging.
4. Create a staging-only synthetic Auth owner, workspace, file metadata and
   object; add only that synthetic owner to the private canary entitlement.
5. Run owner, recipient, OTP, preview, approval/download, revoke/rotation,
   concurrency, IDOR, RLS/grant, expiry and cleanup tests.
6. Delete all synthetic objects and identities; verify residue zero and confirm
   legacy General Share hashes/counts are unchanged.
7. Re-run Security and Performance Advisors and compare request/latency results
   to baseline.

## Production activation gate

Production changes are allowed only when the full staging suite, rollback
rehearsal, checksum/RLS/advisor and browser accessibility gates pass. Activation
is incremental:

1. targeted additive migration;
2. Edge Function deploy with feature still default-off;
3. one explicit owner/admin canary entitlement;
4. frontend deployment with Recipient Links hidden for all other owners;
5. non-mutating General Share regression and synthetic canary smoke.

The global feature remains off until a real billing/plan source of truth for
Silver/Titan/Gold exists.

## Rollback

1. Disable/remove the canary entitlement. This immediately hides creation and
   blocks all dedicated owner mutations while General Share continues normally.
2. Roll the frontend back to the pre-change commit/build.
3. Roll the Edge Function back to its recorded pre-change version/content.
4. Keep the additive tables and existing dedicated records intact. Do not drop
   data during an incident.
5. If a database forward fix is required, apply a reviewed additive migration.
   Destructive down migrations are not part of the emergency rollback path.
6. Validate General Share count/checksum, RLS/grants, request rate, locks and
   advisor baseline after rollback.
