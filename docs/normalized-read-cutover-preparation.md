# Normalized read cutover preparation

Status: preparation only. Production read cutover is disabled.

## Current read-path inventory

| Domain | Legacy reader used by UI | Normalized candidate | Current authority |
| --- | --- | --- | --- |
| Personal profile | `localStorage` hydrated by `js/server-data.js` and read by existing account/dashboard modules | `atsrs_workspace_personnel` | legacy JSON |
| Company personnel | `atsrs_<user>_company_personnel` | `atsrs_workspace_personnel` | legacy JSON |
| Certificates | `atsrs_<user>_<mode>_certs` | `atsrs_personnel_certificates` | legacy JSON |
| Projects | `atsrs_<user>_<mode>_projects` | `atsrs_workspace_projects` | legacy JSON |
| Project relationships | personnel `atsrsProjectIds` | `atsrs_project_personnel` | legacy JSON |

Writes remain the existing legacy JSON write followed by the synchronous
normalized shadow trigger. The frontend receives no direct normalized write
grant. `stable_ids_required` remains `false`.

## Adapter contract

`js/normalized-read-adapter.js` has `legacy`, `canary`, and
`primary-canary` modes. Both canary capabilities are independently default-off.
The adapter creates the same stable-ID keyed canonical domain model from each
source and uses the V393 comparator as its gate.

A normalized result is only a candidate when all four entity sets have exact
canonical parity and there are zero skipped records. Mismatch, missing stable
ID, query failure, offline state, or a disabled/unknown flag falls back to
legacy. The deployed read-only canary deliberately returns
`selected_source=legacy_json`.

The locally prepared `primaryRead` option may select a normalized canonical
overlay only after exact parity. It does not replace the legacy envelope:
volatile/UI-only fields and file metadata that are not represented in the
normalized schema remain sourced from legacy JSON. This is a reversible
transition model, not authorization to retire the legacy source.

The browser runtime loads the adapter but installs with no flag and no
allowlisted workspace. In this default-off state it performs zero normalized
Data API requests and cannot change UI data. A canary can only be enabled by an
explicit in-memory boot configuration containing the full SHA-256 of
`user_id::account_type`; no identifier is stored in the repository or browser
storage.

When allowlisted, `js/normalized-read-runtime.js` listens after the existing
legacy hydration completes, reads the four normalized tables through the
signed-in Supabase client and existing RLS, and runs the canonical comparator.
It publishes only privacy-safe status counters. With `primaryRead=false`, the
selected UI source remains `legacy_json` even on an exact match. A mismatch,
offline/API failure, rapid workspace change, or stale response fails closed to
legacy.

The local primary-read preparation blocks app opening only for an allowlisted
primary canary. On exact parity it overlays normalized canonical fields. A real
legacy write invalidates the overlay before enqueueing, so offline or failed
writes continue reading the current legacy value. After a successful
transaction the runtime re-reads normalized rows and reinstalls the overlay
only if parity is exact. No-op writes do not invalidate or query.

## Canary and rollback plan

1. Keep legacy JSON authoritative. The V393 canary configuration contains only
   SHA-256 workspace scope hashes and enables parallel read-only comparison for
   those allowlisted scopes.
2. In staging, run the adapter per workspace against authenticated,
   RLS-filtered normalized rows.
3. Require every workspace to report exact parity, zero skipped records, zero
   duplicate/orphan/workspace mismatch, and no cross-workspace visibility.
4. The primary-read flag is default-off. The explicit
   `?atsrsNormalizedRead=primary` browser canary sets it only for the current
   navigation; the existing SHA-256 allowlist and RLS still gate every query.
   Removing the parameter and refreshing immediately returns to the read-only
   legacy canary.
5. Rollback is an immediate runtime `rollback()`/flag-off, followed by the
   previous frontend commit if necessary. It clears installed overlays, cancels
   stale comparison results, returns reads to legacy immediately, and requires
   no database rollback.

## Cutover gate

Production normalized-primary read remains **NO-GO** until a later release:

- explicitly enables the separately default-off `primaryRead` canary;
- passes authenticated owner canary tests against the current staging data;
- proves Personal/Corporate, multi-tab/offline, loader, desktop and 390x844
  behavior with the candidate actually selected;
- repeats production read-only counts/checksums and RLS/advisor checks;
- receives explicit production cutover approval.

Legacy JSON deletion, normalized primary writes, strict stable IDs, and any
database/RLS/grant change are outside this preparation.
