# Stage 19 request-storm containment

Status: **staging candidate PASS — production primary write remains OFF**.

## Observed cause

- Production received a sustained authenticated PostgREST pre-request storm
  together with repeated `ATSRS_STALE_REVISION` errors.
- A stale CAS response was retried inside the normalized command loop, while
  independent `flush()` callers could also revisit failed queue entries.
- The client had no cross-tab circuit breaker.
- The first staging wrapper returned stale CAS conflicts with PostgreSQL
  SQLSTATE `40001`. That code denotes a serialization failure and is eligible
  for retry below the ATSRS client transport. Native `fetch` therefore also
  waited until its abort timeout even though application retry was disabled.
- Backup/database size, long transactions and waiting locks were not the load
  source.

## Client contract

1. `ATSRS_STALE_REVISION`, workspace/session busy, authorization, validation,
   rate-limit and semantic conflicts receive **zero automatic retries**.
2. Only explicit network/transient failures are retried. The same
   `operation_id` is reused, with at most two retries and exponential backoff
   plus jitter.
3. The pinned Supabase request builder uses `retry(false)` for command RPCs.
   ATSRS owns the retry classification; library defaults cannot widen it.
4. `flush()` is single-flight. It drains queued work but does not replay a
   failed normalized command.
5. A stale response opens a two-minute workspace circuit immediately.
   Transient failures open a 15-second circuit after two exhausted command
   attempts. Workspace/session busy opens a five-second circuit.
6. Circuit state is broadcast to same-origin tabs. No JWT, operation payload,
   email, user ID, operation ID or PII is logged.
7. The legacy JSON path keeps its existing single immediate offline retry.
   Normalized primary write remains canary-only and default OFF.

## Server/RPC contract

The staging-only migrations are:

1. `20260730154540_contain_workspace_command_retry_storm`;
2. `20260730155715_reject_stale_workspace_revision_without_retry`.

They:

- validate `auth.uid()` and workspace ownership with an empty `search_path`;
- check a committed idempotency receipt before CAS or locks;
- reject stale `expected_revision` before graph canonicalization and mirror
  writes;
- return stale CAS as non-retryable application SQLSTATE `P0001` while
  preserving the `ATSRS_STALE_REVISION` message;
- use verified JWT `session_id` only as an advisory-lock component;
- use non-blocking transaction-scoped session/workspace locks and recheck CAS
  under the revision-row lock;
- delegate accepted work to the existing atomic normalized + legacy mirror
  command;
- expose EXECUTE only to `authenticated`; `PUBLIC`, `anon` and
  `service_role` remain revoked.

The locks bound concurrent work. They do not replace the client circuit
breaker and do not create a write-amplifying rate-limit table.

## Deterministic gates

- 50 repeated stale client intents produce one command RPC, then client-side
  circuit rejection.
- Two transient failures followed by success produce exactly three RPC calls
  with one operation ID.
- Concurrent `flush()` callers share one promise.
- Authenticated staging passed create, replay, semantic no-op, update, stale
  CAS, three-request concurrency, twelve-request stale-rate guard,
  offline/reconnect, atomic failure and delete.
- Three same-revision concurrent requests produced one commit and two bounded
  rejects.
- Twelve sequential stale requests were rejected in 1.878 seconds without a
  gateway timeout.
- Source/target counts stayed `17/4/25/0/0`; duplicate, orphan and workspace
  mismatch counts stayed zero; synthetic auth/receipt residue ended at zero.
- RLS stayed `4/4`; anon grants and authenticated direct write grants stayed
  zero; RPC EXECUTE stayed authenticated-only.
- Security/performance advisors gained no new critical finding.
- The non-destructive rollback was applied on staging, then both migrations
  were reapplied successfully. The final RPC contains no retryable `40001`
  stale branch.

The original in-app browser harness twice returned a generic aborted signal.
It was not accepted as a PASS and was not repeated. A separate authenticated
Node runner using direct PostgREST calls completed all ten staging scenarios
and cleanup without exposing credentials.

## Rollback

1. Frontend: keep normalized primary write OFF or return to the current V402
   files. Legacy JSON read/write fallback remains available.
2. Staging RPC: run
   `supabase/activation/normalized-primary-write-containment-rollback.sql`.
   It restores the earlier bounded-lock wrapper and does not delete business
   data, revisions or receipts.
3. Production: no migration or frontend deployment is authorized by this
   document.
