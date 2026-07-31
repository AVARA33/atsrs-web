# Stage 22 modular architecture inventory

Date: 2026-07-31

Status: two behavior-preserving extraction batches complete.

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
