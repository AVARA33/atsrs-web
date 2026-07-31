# Stage 20 compatibility gate readiness

Date: 2026-07-31

Final closure status: **PASS — Stage 20 compatibility preparation closed.**

## Scope and decision

This preparation does not enable global strict stable-ID enforcement in
production. It adds a default-off, workspace-scoped compatibility gate with a
minimum client build, a non-destructive old-client refresh response, a kill
switch, and privacy-safe aggregate telemetry.

Decision:

- GO for a separately approved production default-off infrastructure rollout.
- NO-GO for enabling strict enforcement in production in this stage.

Production project `hwtjuqyxzivymofamwxl` remained read-only. Staging project
`nsbmbbqgekcwmdqmqsao` was used for the migration and authenticated synthetic
canary.

## Backup and rollback

Backup root:

`C:\Users\user\Documents\GitHub\output\atsrs-stage20-compat-gate-20260731-074839`

- repository ZIP SHA-256:
  `980600075633AEA0F17A95B21635C407C062A3FB631A887849C13A569D62B3DB`
- Git bundle SHA-256:
  `CF010FAF46BAC01804C1E285B53A9768D648E1E7FD98D45006EEA3EB11040CAA`
- backup manifest SHA-256:
  `A331C1CE99E51CE5EE891ADBF898063EF842E9A113F1B9F2B1D75F55B19CC2A3`

The ZIP was extracted to a separate test directory, required files and `.git`
were readable, `git fsck` passed, and the Git bundle verified successfully.

Rollback layers:

1. Keep the browser compatibility feature configuration disabled.
2. Set every workspace scope to `strict_enabled=false` and
   `kill_switch=true` with
   `supabase/activation/stable-id-compatibility-disable.sql`.
3. If necessary, remove only the compatibility trigger and public RPC with
   `supabase/activation/stable-id-compatibility-rollback.sql`; private
   configuration and aggregate telemetry are retained for diagnosis.
4. Restore the prepared code bundle if a frontend rollback is required.

The non-destructive rollback and migration reapply were both rehearsed in
staging. Final staging state has the compatibility objects installed, zero
scope rows, and strict mode disabled.

## Compatibility contract

- `atsrs_private.stable_id_compatibility_scopes` is keyed by workspace.
- `strict_enabled` defaults to `false`.
- `minimum_client_build` defaults to `405`.
- `kill_switch` overrides workspace strict enforcement.
- Global `stable_ids_required` remains `false`.
- The public compatibility RPC validates `auth.uid()` workspace ownership.
- The RPC uses `SECURITY DEFINER` with an empty fixed `search_path` and
  schema-qualified references.
- `PUBLIC`, `anon`, and `service_role` execute privileges are revoked; only
  `authenticated` receives the required execute privilege.
- The two private tables have RLS enabled and have no direct
  `anon`/`authenticated`/`service_role` table grants.
- Old or cached clients receive `ATSRS_STABLE_ID_REFRESH_REQUIRED`. The client
  states that the rejected change was not sent and that existing server data
  remains safe, then asks for a refresh before retry.
- Telemetry stores only an hourly bucket, a SHA-256 workspace identifier,
  event category, route category, build number, and aggregate count. Raw
  payloads, JWTs, PII, and user identifiers are not stored.
- The frontend gate remains disabled by default. The prepared V405 client
  build header is deterministic and cache markers are consistent.

## Staging verification

Authenticated synthetic canary passed after a rollback/reapply rehearsal:

- default-off behavior: PASS
- minimum build and old-client refresh: PASS
- valid stable-ID write: PASS
- ID-less graph rejection: PASS
- legacy JSON mirror: PASS
- idempotent replay: PASS
- stale revision/CAS rejection: PASS
- privacy-safe telemetry: PASS
- kill switch: PASS
- outer transaction rollback: PASS

The negative old-client, ID-less, and stale-revision branches were expected
rejections. No synthetic data remained.

Final staging state:

- counts: `17/4/25/0/0`
- environment canonical target MD5: `f95bf3b769cb0014cbae16c9ed93743d`
- duplicate source IDs: `0`
- certificate orphans: `0`
- assignment orphans/workspace mismatch: `0`
- compatibility scope rows: `0`
- telemetry rows: `0`
- synthetic residue: `0`
- compatibility private tables with RLS: `2/2`
- direct private table grants to browser/platform API roles: `0`
- RPC execute: authenticated `true`, anon `false`, service_role `false`
- idle-in-transaction: `0`
- waiting locks: `0`
- global strict flag: `false`

All local test files passed: `26/26`. `git diff --check` passed.

The final deterministic client suite also covered the compatibility gate
directly:

- old/cache V404 client rejection before any write;
- non-destructive refresh event and message;
- ID-less stable graph rejection;
- stale revision fail-fast and idempotent replay;
- bounded offline failure with no pre-gate write, followed by clean reconnect;
- two-tab different-field convergence without lost updates;
- queued concurrent writes with a single cached compatibility read;
- existing two/three-tab, queue-drain, same-field conflict and circuit-breaker
  contracts.

The final authenticated staging rollback transaction passed old-client refresh,
valid V405 write, ID-less rejection, replay, stale CAS rejection, telemetry,
kill switch and rollback. After rollback, scope rows, telemetry rows and
synthetic residue were all `0`.

## Production read-only verification

Production was not migrated, deployed, or flag-modified:

- counts: `17/4/25/0/0`
- environment canonical target MD5: `9082870cad8db5b9693f8f9e88899143`
- duplicate source IDs: `0`
- certificate orphans: `0`
- assignment orphans/workspace mismatch: `0`
- idle-in-transaction: `0`
- waiting locks: `0`
- global strict flag: `false`
- compatibility table present: `false`
- compatibility RPC requests in the latest ten-minute log window: `0`
- workspace-command requests in the latest ten-minute log window: `0`
- API 5xx in the latest ten-minute log window: `0`
- stale-revision events in the latest ten-minute log window: `0`

The management connector does not expose a direct instantaneous CPU metric.
The immediate safety gate therefore used request/error rate, active sessions,
idle transactions, and waiting locks. These were quiet. The prior CPU alert
must still be monitored during any separately approved rollout.

The production and staging canonical target hashes are not expected to equal
each other because staging uses a synthetic auth/workspace mapping. Each hash
was compared with its own environment baseline and remained unchanged; entity
counts, mirror parity, and integrity anomalies also remained unchanged.

## RLS and Advisor result

No new critical Advisor finding was produced.

Staging adds two informational `RLS enabled, no policy` notices for the private
compatibility tables. This is intentional: the tables are private, RLS is
enabled, and all direct API-role table grants are revoked.

Staging also adds one warning that an authenticated user can execute the new
`SECURITY DEFINER` RPC. This execute path is intentional and least-privilege:
the function has a fixed empty search path, validates `auth.uid()` ownership
internally, exposes no raw data, and is executable only by `authenticated`.
Existing unrelated Advisor warnings remain baseline items and were not changed.

## Migration state

Repository migrations:

- `20260731034949_stable_id_workspace_compatibility_gate.sql`
- `20260731035646_fix_stable_id_compatibility_telemetry_bucket.sql`

The second migration is a forward-only correction for an ambiguous PL/pgSQL
telemetry bucket identifier found during the first staging rehearsal. The
failed transaction rolled back fully; the already rehearsed migration was not
edited in place.

Staging migration history records the applied equivalents as:

- `20260731035505 stable_id_workspace_compatibility_gate`
- `20260731035725 fix_stable_id_compatibility_telemetry_bucket`

Production migration history contains neither migration.

## Required production activation sequence

Production activation still requires separate approval and must remain
incremental:

1. Reconfirm backup, data integrity, workload, RLS/grants, and exact migration
   drift.
2. Apply both migrations with zero scope rows and global strict still false.
3. Deploy the compatible V405 client while the frontend compatibility check
   remains default-off.
4. Enable the client check for an allowlisted test workspace.
5. Enable strict mode only for that workspace and monitor request rate, CPU,
   locks, refresh rejections, parity, and rollback.
6. Expand the allowlist only after every gate passes.

Global strict activation is not authorized by this report.

Stage 20 is complete because the compatibility infrastructure and its rollback
are proven in staging. Production still has no compatibility migration and
global strict remains disabled. A future production rollout therefore remains
a separate, reversible decision.
