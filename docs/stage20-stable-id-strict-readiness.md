# Stage 20 — Stable-ID strict readiness

Status: staging PASS; production activation NO-GO pending compatibility controls.

Production remains read-only for this stage:

- project: `hwtjuqyxzivymofamwxl`
- build: V404 / `80d3fc04c13414353002f1d6356821ef3d554fd4`
- `stable_ids_required=false`
- normalized primary write remains the Stage 19 allowlisted configuration
- legacy JSON mirror and read fallback remain enabled

Staging target:

- project: `nsbmbbqgekcwmdqmqsao`
- strict mode was enabled only inside a transaction that ended with `ROLLBACK`
- final `stable_ids_required=false`

## Rollback point

- directory: `C:\Users\user\Documents\GitHub\output\atsrs-stage20-strict-preparation-20260731-073041`
- full repository ZIP SHA-256:
  `F70588EC0562F55E4B94A2BF191F2EFF04E1BEBDFCEA6B62A4E2B57E16253F45`
- Git bundle SHA-256:
  `A23D75F39EF9734CF70B51D204DD914BAE4CC3583A0803AECE917C4D869B2209`
- manifest SHA-256:
  `501B221B47607CB1A9F65ED2445575DFD809089C50ECA36CA84138E479709050`
- ZIP extraction, required-file checks, `git fsck`, and bundle verification: PASS

The fast production kill switch is
`supabase/activation/stable-id-rollback.sql`. It only changes the runtime flag
back to false; it does not drop columns, tables, constraints, or normalized
data.

## Write-entry inventory

| Entry point | Current writer | Stable-ID behavior | Strict behavior |
| --- | --- | --- | --- |
| `saveData` / `writeAppDataKey` | `js/storage.js` → `js/server-data.js` | V404 normalizes new profile/personnel/project/certificate IDs before queueing | valid |
| Manual and AI document saves | `js/app.js`, `js/storage.js` | certificate ID and personnel ID are assigned before flush | valid |
| Personnel/project edits | `js/storage.js`, `js/talent-directory.js` | entity UUID and project UUID links are retained | valid |
| Profile/avatar writes | `js/storage.js`, `js/avatar.js`, `js/dashboard.js` | profile owner UUID is retained/hydrated | valid |
| Stage 19 command RPC | `atsrs_apply_workspace_command` | graph validation rejects missing/invalid IDs before mirror write | valid |
| Legacy direct `atsrs_workspace_data` upsert | cached pre-stable-ID clients and migration compatibility path | old payload can omit IDs | rejected by strict trigger |
| Initial legacy-storage migration | `migrateLegacyStorage` in `js/server-data.js` | current V404 later hydrates loaded rows, but a genuinely old cached client can still send ID-less data | compatibility risk |

Managed entity keys covered by strict enforcement:

- personal profile owner
- company personnel
- personal/company certificates
- personal/company projects
- project-personnel relations through stable project/personnel UUIDs

Files, Auth, Storage metadata, notifications, preferences, and unrelated
workspace keys are outside the strict entity-ID gate.

## Server enforcement and access

- The normalized shadow trigger is enabled on `atsrs_workspace_data`.
- The trigger reads `atsrs_private.runtime_flags.stable_ids_required`.
- Direct ID-less legacy writes are rejected when strict is true.
- RPC writes reject an invalid graph earlier with
  `ATSRS_INVALID_STABLE_ID_GRAPH`,
  `ATSRS_INVALID_PROFILE_GRAPH`, or the corresponding relationship error.
- Four normalized public tables have RLS enabled.
- `anon` table privileges: none.
- `authenticated` table privileges: `SELECT` only.
- Direct authenticated normalized `INSERT`, `UPDATE`, and `DELETE`: none.
- The command RPC remains the only minimal authenticated write surface.
- Authorization uses `auth.uid()` and workspace ownership; user metadata is
  not used for authorization.
- Existing SECURITY DEFINER advisor warnings for the intentional command and
  revision RPCs remain baseline warnings; no new Stage 20 DDL was applied.

Supabase access contract used by this review:

- Data API grants and RLS are independent gates.
- RLS must remain enabled on exposed tables.
- SECURITY DEFINER functions require a fixed search path and explicit
  execution grants.

## Staging rehearsal

Artifact: `supabase/audit/staging-stage20-strict-canary.sql`

Passed inside one rollback transaction:

- default-off guard
- direct ID-less legacy write rejection
- ID-less company project RPC rejection
- ID-less personal profile RPC rejection
- valid company project/personnel/certificate/assignment graph
- valid personal owner/certificate graph
- legacy JSON mirror
- operation replay/idempotency
- semantic no-op
- stale revision immediate rejection
- stable-ID relationship mapping
- rollback to strict=false
- synthetic residue 0

Client/runtime coverage:

- 25/25 repository contract suites PASS
- deterministic two/three-tab, queue drain, stale response, offline/reconnect,
  loader cleanup, retry/circuit-breaker, and workspace-switch coverage remains
  PASS from the V404 suite

Final staging state:

- counts `17/4/25/0/0`
- canonical normalized hash
  `075f7e718addf4fa245952774671a433`
- duplicate/orphan/workspace mismatch: 0
- synthetic auth/source/normalized/receipt residue: 0
- idle-in-transaction: 0
- waiting locks: 0
- recent API 5xx: 0
- strict flag: false
- new critical security/performance advisor findings: 0

The intentional negative tests generated the expected staging Postgres error
events; they did not produce an API request storm.

## Production activation gate

Current decision: **NO-GO**.

Data integrity and server enforcement are ready, but activation is global and
the current runtime flag has no per-workspace or minimum-client-build canary.
A long-lived pre-V387 tab can still attempt an ID-less direct legacy write. It
will be safely rejected, but the user operation will fail. The server also
cannot attach a trustworthy `client_build` to that old direct-table write.

Before production strict activation:

1. Add a reversible compatibility gate that supports an allowlisted workspace
   or minimum supported client build without weakening ID validation.
2. Define a forced-refresh/maintenance window for long-lived old tabs.
3. Add privacy-safe counters for strict rejections by route and safe build
   category; do not log payloads or personal values.
4. Rehearse the production sequence: baseline → allowlisted strict canary →
   request/CPU/lock/data gates → global enable.
5. Keep `stable-id-rollback.sql` ready and turn strict off immediately on a
   request storm, loader regression, unexpected rejection, parity mismatch, or
   data/RLS failure.

No production strict activation, schema change, RLS/grant change, deploy, or
secret/Edge/cron/email/WhatsApp/webhook/DNS change was made in Stage 20.
