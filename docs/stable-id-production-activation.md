# ATSRS stable-ID production activation runbook

Status: preparation only. Do not execute without the user's explicit approval.

Current gate: **NO-GO** until every blocker in
`docs/stable-id-preflight-gate.md` is closed and the migration reconciliation
dry-run lists only `20260729041619`.

Project: `hwtjuqyxzivymofamwxl`

Migration:
`supabase/migrations/20260729041619_stable_workspace_entity_ids.sql`

Frontend release: V388 (`js/server-data.js?v=388`,
`js/storage.js?v=388`, `js/workspace-switcher.js?v=388`)

## Safety model

The migration installs the stable-ID schema with
`atsrs_private.runtime_flags.stable_ids_required = false`. In this compatibility
state:

- the legacy JSON table remains the only read source;
- a cached old client can continue writing ordinary legacy payloads;
- old corporate certificate payloads without a stable personnel ID remain in
  the legacy source and are not guessed into the normalized shadow;
- the V388 client hydrates deterministic UUIDv5 IDs before rendering and writes
  UUIDs on every later save;
- concurrent V388 tabs use `updated_at` optimistic concurrency. A stale tab is
  rejected instead of silently overwriting a newer row.

The final enforcement switch rejects stable-ID-sensitive payloads that came
from an old cached client. It must only be enabled after the compatibility
window and production smoke tests.

## Required maintenance window

1. Announce a short write pause. Ask users to save work, close duplicate ATSRS
   tabs and keep one tab only.
2. Verify the existing code ZIP, database snapshot and their SHA-256 values.
3. Record:
   - current production commit;
   - migration history;
   - `atsrs_workspace_data` row count and snapshot checksum;
   - normalized counts and canonical checksums;
   - duplicate, orphan and workspace-mismatch counts;
   - Security and Performance Advisor counts.
4. Stop if any expected value differs.

## Activation order

This order is intentional and must not be reversed.

1. Confirm the CLI is linked to the ATSRS project. If it is not linked, obtain
   separate approval, run
   `supabase link --project-ref hwtjuqyxzivymofamwxl`, and enter the database
   password locally without printing or storing it in chat.
2. Confirm the remote migration list:
   `supabase migration list --linked`
3. Preview only:
   `supabase db push --linked --dry-run`
   Stop unless this lists only
   `20260729041619_stable_workspace_entity_ids.sql`.
4. Apply only
   `20260729041619_stable_workspace_entity_ids.sql`. The flag must remain
   `false`.
5. Immediately run the packaged verification query and repeat the row-count,
   checksum, duplicate, orphan, workspace-mismatch, RLS/grant and Advisor
   checks. Roll back if any result differs.
6. Deploy the frontend commit containing V388.
7. Confirm the production HTML references `server-data.js?v=388`,
   `storage.js?v=388`, and `workspace-switcher.js?v=388`. Verify the returned JavaScript contains
   `rowVersions`, `hydrateStableRows` and `atsrsProjectIds`.
8. Hard refresh the test browser. Close/reopen the ATSRS tab and confirm a new
   request is not served from an old cache.
9. Smoke test Personal and Corporate account switching, Dashboard, Documents,
   Personnel, Projects and Compliance without changing real user data.
10. Keep `stable_ids_required = false` for the compatibility window. Monitor
   database/console errors and reject activation if any old-client corporate
   certificate write left source and shadow counts different.
11. Ask all active users to close old tabs and hard refresh.
12. Re-run every preflight checksum. If all results match, execute
    `supabase/activation/stable-id-enable.sql`.
13. Re-run all checks and smoke tests. The legacy JSON read path and existing
    dual-write remain active; this runbook does not perform read-switch.

## Mandatory verification

Before migration, after migration, after frontend deployment and after flag
enablement, record:

- source and target entity counts;
- canonical MD5 for personnel, certificates, projects and assignments, using
  stable field order and stable entity-ID ordering;
- duplicate `source_entity_id`: `0`;
- duplicate legacy keys: `0`;
- certificate/project-personnel orphan: `0`;
- workspace mismatch: `0`;
- RLS enabled on all four normalized tables;
- anon privileges: `0`;
- authenticated direct write privileges: `0`;
- Security Advisor critical errors: `0`;
- Performance Advisor critical errors: `0`;
- no new loader, console or Supabase log error.

Any difference is a stop condition. Do not enable the flag or start read-switch.

## Multi-tab and offline tests

- Open two V388 tabs from the same account. Load the same workspace row in both.
  Save in tab A, then attempt the stale save in tab B. Tab B must show the save
  warning and must not overwrite tab A.
- Refresh tab B, repeat the save and confirm it succeeds.
- Disconnect the network, make one reversible synthetic test write, reconnect
  and use the existing flush/retry path. Counts and checksums must match after
  reconnect.
- Switch Personal → Corporate → Personal during a delayed data request. Only
  the final selected workspace may render.
- Repeat with a hard refresh and with all old tabs closed.

Use a synthetic/test workspace or a transaction that ends in `ROLLBACK`. Do not
perform these write tests on real user data.

## Fast rollback

1. Execute `supabase/activation/stable-id-rollback.sql`. This disables strict
   enforcement atomically and restores old-client compatibility.
2. Redeploy the previously recorded production frontend commit and its previous
   cache versions.
3. Hard refresh and close all V388 tabs.
4. Re-run source/target counts, canonical checksums, duplicate/orphan/mismatch,
   RLS and Advisor checks.
5. Keep the additive columns and constraints. Do not drop them during an
   incident; dropping them is unnecessary and could destroy normalized data.

If migration application itself fails, its transaction rolls back. Do not
deploy V388. If the frontend deployment fails, keep the compatibility flag
`false` and redeploy the previous frontend.

## Approval boundary

Explicit user approval is required for all three production mutations:

1. applying the stable-ID migration to the live Supabase database;
2. deploying/pushing V388 frontend code;
3. enabling `stable_ids_required` after the compatibility window.

Approval for one item does not imply approval for the other two.
