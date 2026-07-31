# Stage 23 performance profile

Date: 2026-07-31

Status: V407 candidate; polling dedupe and privacy-safe browser metrics added.

## Client baseline

- Live build: V406
- Classic-script assets: 32
- Uncompressed local JavaScript size: 706,748 bytes
- Largest files:
  - `storage.js`: 173,035 bytes
  - `server-data.js`: 93,579 bytes
  - `talent-directory.js`: 62,097 bytes
  - `share-profile.js`: 48,190 bytes
  - `dashboard.js`: 43,381 bytes
- Desktop live layout: no horizontal overflow.
- Authenticated account-switch smoke: 10/10 PASS.
- Exact 390px local V406 layout gate from the release candidate: PASS.

V407 records privacy-safe LCP, CLS, INP, long-task and navigation values in page
memory and mirrored numeric `data-atsrs-*` attributes. Nothing is transmitted
or persisted. The isolated browser evaluator can therefore read the DOM
attributes without access to application/session state.

## Production request and database baseline

- Idle API sample before release smoke: approximately 0.19 requests/second.
- Account-switch smoke burst: approximately 2.29 requests/second.
- Critical request-storm threshold: greater than 5 requests/second.
- Both samples: HTTP 200 only; stale revision, 5xx and 504 were zero.
- Active non-audit query, idle-in-transaction, waiting lock and deadlock: zero.
- Database rollback counter did not increase during the V406 release smoke.
- Counts/checksum/integrity remained unchanged.

The largest accumulated `pg_stat_statements` entry is PostgREST request-context
`set_config`: very high historical calls but only 0.023 ms mean execution.
This is evidence of historical request volume, not a slow SQL statement.
The largest ATSRS application SQL total is the email-outbox invocation:
3,035 calls, 25.604 ms mean, 77,708.88 ms accumulated. It is the first
server-side profiling candidate; no schedule/function change is authorized by
this document.

## Measured client optimization candidates

1. `share-profile.js` installs a 30-second owner request poll for every signed-in
   app session. V407 adds visibility/page gating and single-flight coalescing.
   Correctness events (`atsrs:resume`, account mode changes and opening the
   sharing panel) still refresh immediately.
2. Multiple UI modules use sub-second stabilizing intervals. Inventory which
   callbacks mutate unchanged DOM and replace only proven redundant work with
   event-driven or visibility-gated updates.
3. Split or defer large feature scripts only after load-order/global API
   contracts are captured. Dynamic loading must not reintroduce cache or
   authentication races.
4. Profile the email-outbox cron/function plan and actual work per invocation
   in read-only mode before considering schedule or SQL changes.

## Gate for the first optimization

- Full deterministic suite: 30/30 PASS.
- Desktop local V407: 1280px, horizontal overflow zero, console warnings/errors
  zero.
- Mobile local V407: exact 390x844, horizontal overflow zero, LCP 360 ms,
  CLS 0, long tasks 0, console warnings/errors zero.
- The polling contract proves hidden/unrelated pages issue zero periodic share
  requests and three concurrent refreshes coalesce to one request. Explicit
  user refresh remains immediate.
- Production pre-deploy data gate: 17/4/25/0/0, source-target canonical entity
  checksums match, duplicate/orphan zero, RLS 4/4, authenticated table grant is
  SELECT-only, and `stable_ids_required=false`.
- Two short database snapshots: request/commit proxy about 4.06/s (below the
  5/s stop threshold), rollback delta zero, waiting locks zero, idle
  transactions zero, deadlocks zero.
- Separate rollback package:
  `output/atsrs-stage23-prechange-20260731-102705`; code ZIP SHA-256
  `847481316686AACEF4565C673373903D6A3818ACDD662D38FBF70EBEB51DCDC6`
  and Git bundle SHA-256
  `62DD725476B682F1D1BA8C65EBCC2C2B4E624EB0773D91C901E70681A3C4893F`.
