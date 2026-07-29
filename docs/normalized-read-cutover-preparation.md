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
from each source and uses the V391 comparator as its gate.

A normalized result is only a candidate when all four entity sets have exact
canonical parity and there are zero skipped records. Mismatch, missing stable
ID, query failure, offline state, or a disabled/unknown flag falls back to
legacy. Even after a successful canary the adapter deliberately returns
`selected_source=legacy_json`; it cannot activate a production cutover.

The adapter is not loaded by `index.html` in this preparation commit, so it
cannot change browser behavior, network traffic, or application state.

## Canary and rollback plan

1. Keep the production flag absent/off and the legacy reader authoritative.
2. In staging, run the adapter per workspace against authenticated,
   RLS-filtered normalized rows.
3. Require every workspace to report exact parity, zero skipped records, zero
   duplicate/orphan/workspace mismatch, and no cross-workspace visibility.
4. Only a later, separately approved release may wire a per-workspace canary
   flag into the UI adapter. That release must preserve an immediate
   `legacy` fallback and must not change the writer.
5. Rollback is flag-off plus the previous frontend commit. No database rollback
   is part of a read-source rollback.

## Cutover gate

Production normalized-primary read remains **NO-GO** until a later release:

- wires the adapter behind a default-off per-workspace flag;
- passes authenticated owner canary tests against the current staging data;
- proves Personal/Corporate, multi-tab/offline, loader, desktop and 390x844
  behavior with the candidate actually selected;
- repeats production read-only counts/checksums and RLS/advisor checks;
- receives explicit production cutover approval.

Legacy JSON deletion, normalized primary writes, strict stable IDs, and any
database/RLS/grant change are outside this preparation.
