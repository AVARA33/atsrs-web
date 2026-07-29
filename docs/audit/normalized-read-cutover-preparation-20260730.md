# Normalized read cutover preparation gate — 2026-07-30

## Repository and release state

- Audit parser commit `ebda94e272f450d2debdfc8e87bd102fb4fcbf88` was
  verified as parser-only, pushed to `origin/main`, and did not require a
  separate frontend deployment.
- The preparation files in this report are local only. `index.html` does not
  load the adapter, so live V391 behavior is unchanged.

## Read-only data and security evidence

Current production and staging counts both remain `17/4/25/0/0` for workspace
rows/personnel/certificates/projects/assignments. Both projects report
`stable_ids_required=false`.

The fresh staging inventory reports:

- RLS enabled: 4 of 4 normalized tables;
- authenticated SELECT policies: 4;
- authenticated INSERT/UPDATE/DELETE grants: 0;
- orphan relationships: 0.

The prior transactionally restored staging scope report remains readable and
its SHA-256 is
`7A1F8E1CA2E7290DE049719AFB1246ACAE5D289A3ED1B9B063274618C92DF9C0`.
It covers all four workspace scopes, has zero mismatch/skipped records, zero
anonymous rows, and zero cross-workspace rows for the staging-only
authenticated identity.

The new adapter canary was run against the same verified production backup
used by that staging restore. All four scopes qualified as normalized
candidates at `4/25/0/0`, with mismatch/skipped `0/0`. The selected source
remained legacy in every scope. Privacy-safe report:

`C:\Users\user\Documents\GitHub\output\atsrs-normalized-read-preparation-20260730\normalized-read-canary-report.json`

SHA-256:
`542D022F8DE823C6FEB0C74366B86F46B97FCABF8673E8ED77CE071FED583ACF`.

No production or staging data, schema, RLS, grant, migration, function, flag,
Auth identity, or Storage object was changed.

## Tests and decision

All 13 repository contract/regression tests pass, including the new adapter
test. The adapter proves deterministic parity and fail-closed fallback but is
not wired into the UI.

Preparation status: **PASS**.

Production normalized-primary read status: **NO-GO** in this commit. A later,
separately approved default-off frontend canary must select the candidate in a
real authenticated browser and pass Personal/Corporate, multi-tab/offline,
loader, desktop and 390x844 tests before primary read can be considered.
