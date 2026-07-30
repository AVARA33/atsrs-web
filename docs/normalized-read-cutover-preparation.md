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

`js/normalized-read-adapter.js` has only `legacy` and `canary` modes. Its
default is `legacy`. It creates the same stable-ID keyed canonical domain model
from each source and uses the V392 comparator as its gate.

A normalized result is only a candidate when all four entity sets have exact
canonical parity and there are zero skipped records. Mismatch, missing stable
ID, query failure, offline state, or a disabled/unknown flag falls back to
legacy. Even after a successful canary the adapter deliberately returns
`selected_source=legacy_json`; it cannot activate a production cutover.

The browser runtime loads the adapter but installs with no flag and no
allowlisted workspace. In this default-off state it performs zero normalized
Data API requests and cannot change UI data. A canary can only be enabled by an
explicit in-memory boot configuration containing the full SHA-256 of
`user_id::account_type`; no identifier is stored in the repository or browser
storage.

When allowlisted, `js/normalized-read-runtime.js` listens after the existing
legacy hydration completes, reads the four normalized tables through the
signed-in Supabase client and existing RLS, and runs the canonical comparator.
It publishes only privacy-safe status counters. The selected UI source remains
`legacy_json` even on an exact match. A mismatch, offline/API failure, rapid
workspace change, or stale response fails closed to legacy.

## Canary and rollback plan

1. Keep the production boot flag absent/off and the legacy reader
   authoritative. Default-off causes zero normalized queries.
2. In staging, run the adapter per workspace against authenticated,
   RLS-filtered normalized rows.
3. Require every workspace to report exact parity, zero skipped records, zero
   duplicate/orphan/workspace mismatch, and no cross-workspace visibility.
4. A later, separately approved release may provide an allowlisted per-workspace
   boot flag. This canary still cannot select normalized data for the UI.
5. Rollback is an immediate runtime `rollback()`/flag-off, followed by the
   previous frontend commit if necessary. It cancels stale comparison results
   and requires no database rollback.

## Cutover gate

Production normalized-primary read remains **NO-GO** until a later release:

- explicitly enables the already default-off per-workspace canary;
- passes authenticated owner canary tests against the current staging data;
- proves Personal/Corporate, multi-tab/offline, loader, desktop and 390x844
  behavior with the candidate actually selected;
- repeats production read-only counts/checksums and RLS/advisor checks;
- receives explicit production cutover approval.

Legacy JSON deletion, normalized primary writes, strict stable IDs, and any
database/RLS/grant change are outside this preparation.
