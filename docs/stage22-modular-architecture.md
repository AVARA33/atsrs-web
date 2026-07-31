# Stage 22 modular architecture inventory

Date: 2026-07-31

Status: first behavior-preserving extraction.

## Boundaries

- `storage.js` remains the legacy authoritative persistence facade and is not
  split in this change.
- `server-data.js` continues to own RPC transport, retries, circuit breaker,
  command revision state, cache storage and UI event dispatch.
- `stable-id-compatibility-runtime.js` now owns only deterministic compatibility
  policy: config lookup, canary selection, cache TTL normalization and refresh
  classification.
- Database schema, RLS, grants, compatibility scope state, legacy JSON mirror
  and fallback behavior are unchanged.

## Extraction contract

The extracted module has no network or storage side effects. The scope hash is
provided as a lazy callback, so a non-canary request performs no hash work.
Missing runtime wiring fails closed before a protected stable-data write.

## Next safe candidates

1. Extract normalized-command error classification and transient retry policy
   from `server-data.js`.
2. Extract queue/revision coordination behind a testable interface.
3. Split pure legacy data normalization helpers from `storage.js`.

Each candidate requires its own behavior contract and rollback point. No
cutover, cleanup or persistence ownership change is authorized by this plan.
