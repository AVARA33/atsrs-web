# Stage 22 modular architecture inventory

Date: 2026-07-31

Status: PASS and deployed as V406.

## Boundaries

- `storage.js` remains the legacy authoritative persistence facade and is not
  split in this change.
- `server-data.js` continues to own RPC transport, timers, circuit state,
  command revision state, cache storage and UI event dispatch.
- `stable-id-compatibility-runtime.js` now owns only deterministic compatibility
  policy: config lookup, canary selection, cache TTL normalization and refresh
  classification.
- `workspace-command-policy.js` owns only deterministic error classification,
  retry eligibility, bounded configuration normalization and backoff delay
  calculation.
- Database schema, RLS, grants, compatibility scope state, legacy JSON mirror
  and fallback behavior are unchanged.

## Extraction contract

The extracted module has no network or storage side effects. The scope hash is
provided as a lazy callback, so a non-canary request performs no hash work.
Missing runtime wiring fails closed before a protected stable-data write.
The command policy receives randomness as an input for deterministic testing;
it does not schedule timers or send requests.

## Next safe candidates

1. Extract queue/revision coordination behind a testable interface.
2. Split pure legacy data normalization helpers from `storage.js`.

Each candidate requires its own behavior contract and rollback point. No
cutover, cleanup or persistence ownership change is authorized by this plan.

## Release evidence

- Batch 1 rollback commit: `ab9fd03`
- Batch 2 rollback commit: `672f66c`
- Full local contract suite: 28/28 PASS
- Live build and asset marker: V406
- Authenticated smoke: 10 sequential Personal/Corporate switches PASS
- Before/after workspace snapshot MD5:
  `4081bc53bc29f8d14a6633d483fd4d6c`
- Before/after counts: `17/4/25/0/0`
- Duplicate/orphan/waiting-lock/idle-transaction: `0/0/0/0`
- Live smoke API sample: 100/100 HTTP 200, stale revision 0, 5xx 0
- Database schema, data, RLS, grants and compatibility flags were not changed.
