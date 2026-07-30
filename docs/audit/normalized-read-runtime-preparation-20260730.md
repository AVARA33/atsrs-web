# Normalized primary-read runtime preparation — 2026-07-30

Status: local candidate only. No production cutover, deployment, flag change, or
database mutation was authorized or performed.

## Baseline

- Repository baseline: `ee94c0eb78ed1614e8b553fa92f44f461cd629d5`.
- Baseline matched `origin/main` and the working tree was clean.
- Live build remained V391 with shadow status `match` and mismatch count `0`.
- Legacy workspace JSON remained authoritative.
- `stable_ids_required=false`.

## Runtime contract

`js/normalized-read-runtime.js` loads behind an absent/default-off in-memory boot
flag. With the flag off it performs no normalized-table or legacy-data reads.

An enabled canary requires a full SHA-256 allowlist entry for
`user_id::account_type`. It queries the four normalized tables through the
existing authenticated Supabase client and applies both workspace filters to
every query. Existing RLS remains the authorization boundary.

The runtime never selects normalized data for the UI in this stage. Exact parity
only marks the workspace as a candidate. Mismatch, skipped data, API/offline
failure, rapid workspace change, or stale response fails closed to legacy JSON.
Rollback disables the in-memory flag, invalidates the active comparison
sequence, and restores the privacy-safe runtime marker to legacy.

No identifier, result row, PII, token, key, or service-role credential is stored
or logged. No browser storage is used for the canary flag.

## Verified data and security invariants

Read-only verification was run against production and staging.

| Invariant | Production | Staging |
| --- | ---: | ---: |
| workspace rows | 17 | 17 |
| personnel source/target | 4 / 4 | 4 / 4 |
| certificates source/target | 25 / 25 | 25 / 25 |
| projects source/target | 0 / 0 | 0 / 0 |
| assignments source/target | 0 / 0 | 0 / 0 |
| canonical entity matches | 4 / 4 | 4 / 4 |
| duplicate source IDs | 0 | 0 |
| certificate/assignment orphans | 0 / 0 | 0 / 0 |
| normalized tables with RLS | 4 / 4 | 4 / 4 |
| normalized authenticated SELECT policies | 4 | 4 |
| authenticated normalized write grants | 0 | 0 |
| `stable_ids_required` | false | false |

Direct read-only role checks also passed in both environments: `anon` has no
table-level SELECT grant, and a synthetic authenticated identity outside every
workspace saw `0/0/0/0` normalized rows.

The production and staging personnel MD5 values differ because staging uses its
synthetic auth mapping, but source and target hashes match exactly inside each
environment. No cross-environment hash equality is required.

## Tests

All 14 repository contract suites passed, including the existing workspace
switch, concurrency, offline/reconnect, canonical checksum, stable-ID,
reconciliation, restore, and shadow-read suites.

The runtime-specific deterministic tests passed:

- default-off produces zero Data API and legacy reads;
- exact allowlisted parity, mismatch fallback, and missing allowlist;
- every normalized query contains both workspace filters;
- API/offline failure followed by a successful reconnect;
- stale workspace response rejection;
- three independent tab runtimes;
- immediate flag-off rollback;
- static prohibition of normalized writes, service-role use, and browser flag
  persistence.

Current live V391 was checked without mutation: authenticated app visible,
loader closed, desktop overflow absent, shadow mismatch `0`. Exact `390x844`
browser verification also reported `innerWidth=390`, no horizontal overflow,
loader closed, and mismatch `0`; the viewport override was reset afterwards.

## Current gate

- Default-off production canary package: **GO for review**, not deployed.
- Production normalized-primary read: **NO-GO** in this task.

Primary read remains blocked until a separately authorized canary deployment
proves the runtime against authenticated production allowlisted workspaces,
followed by explicit cutover approval. Rollback remains flag-off plus the
`ee94c0e` frontend baseline. No database rollback is required for this read-only
runtime.

Current Supabase security guidance was rechecked: browser Data API access must
use a publishable/legacy anon key with RLS and least-privilege grants; grants and
RLS are separate controls. The April 2026 Data API auto-exposure change does not
require a schema change here because the existing normalized tables already
have explicit read grants/policies and this task creates no database objects.
