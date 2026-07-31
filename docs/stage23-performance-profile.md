# Stage 23 performance profile

Date: 2026-07-31

Status: baseline complete; optimization candidates measured, no behavior or
database change applied in this profiling batch.

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

The in-app browser test surface does not expose Navigation/Resource Timing
globals to its isolated evaluator, so no synthetic Core Web Vitals are claimed.
The next browser profiling batch must use an instrumented supported surface and
record LCP, INP, CLS, transfer size and long tasks before optimizing.

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
   app session. It should be profiled for visibility/page gating and
   single-flight coalescing. Correctness events (`atsrs:resume`, account mode
   changes and opening the sharing panel) must still refresh immediately.
2. Multiple UI modules use sub-second stabilizing intervals. Inventory which
   callbacks mutate unchanged DOM and replace only proven redundant work with
   event-driven or visibility-gated updates.
3. Split or defer large feature scripts only after load-order/global API
   contracts are captured. Dynamic loading must not reintroduce cache or
   authentication races.
4. Profile the email-outbox cron/function plan and actual work per invocation
   in read-only mode before considering schedule or SQL changes.

## Gate for the first optimization

- Baseline and optimized browser runs on desktop and 390x844.
- LCP, INP, CLS, script transfer, long tasks and request count recorded.
- Personal/Corporate, account switch, Documents, offline/reconnect and
  multi-tab regressions PASS.
- Database counts/checksum unchanged; stale/5xx/locks/storm remain zero.
- Separate rollback commit and V406 restore point remain available.
