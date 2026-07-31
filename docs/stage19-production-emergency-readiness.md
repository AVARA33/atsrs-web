# Stage 19 production emergency rollout readiness

Status: **NO-GO while the request storm remains active**.

Production project: `hwtjuqyxzivymofamwxl`.

## Allowed emergency scope

Only these two changes are allowed:

1. server: change the single SQLSTATE paired with
   `ATSRS_STALE_REVISION` from retryable `40001` to non-retryable
   application error `P0001`;
2. browser runtime: stale retry zero, bounded transient-network retry with
   exponential backoff/jitter, single-flight queue and cross-tab circuit
   breaker.

Primary write remains default OFF. Legacy JSON fallback and
`stable_ids_required=false` remain unchanged. Edge Functions, cron, email,
WhatsApp, webhooks, DNS and secrets are outside scope.

## Current production evidence

- migration head:
  `20260730113050_semantic_canonical_array_tiebreaker`;
- counts: `17/4/25/0/0`;
- business source snapshot MD5:
  `1502a448378eb5d53ab0baa3a44ea8bb`;
- duplicate/certificate orphan/assignment orphan: `0/0/0`;
- `stable_ids_required=false`;
- first activity snapshot: 15 connections, 1 active, one idle transaction,
  no ungranted lock;
- 50.107 seconds later: 15 connections, 2 active, two idle transactions and
  one ungranted lock;
- transaction rollbacks increased by 88,883 in that interval, approximately
  1,774 per second;
- the dominant historical statement fingerprint is PostgREST request context
  setup with more than 26.5 million calls and mean execution time 0.023 ms.

The request storm is therefore high-volume, short-lived request churn rather
than a large backup or one long query.

## Exact pending drift

Production is missing these repository migrations:

1. `20260730133558_bound_workspace_command_locking.sql`;
2. `20260730154540_contain_workspace_command_retry_storm.sql`;
3. `20260730155715_reject_stale_workspace_revision_without_retry.sql`.

A broad `db push` is prohibited for the emergency rollout because it would
apply three server migrations and exceed the two-change scope.

The approved future server action must instead use only:

- `supabase/activation/emergency-stale-revision-nonretryable.sql`.

That script:

- runs in one transaction;
- uses `lock_timeout=250ms` and `statement_timeout=5s`;
- requires exactly one `40001 + ATSRS_STALE_REVISION` branch;
- changes only that SQLSTATE;
- aborts without mutation if the live function drifted;
- reasserts authenticated-only RPC EXECUTE.

The inverse is:

- `supabase/activation/emergency-stale-revision-nonretryable-rollback.sql`.

It uses the same fail-closed precondition and restores only `P0001` to
`40001`.

## Go/no-go gate

Activation is GO only after all of the following are true in two consecutive
short snapshots:

- rollback/request rate is below 5 per second and stable;
- no ungranted lock, blocking chain or idle-in-transaction session;
- schema/function precondition query succeeds;
- RLS is 4/4, anon grants are zero, authenticated direct DML is zero;
- counts remain `17/4/25/0/0` and the source snapshot hash is unchanged;
- tested rollback file is immediately available;
- frontend primary write remains OFF before deployment.

Current decision: **NO-GO**. Do not apply, push or deploy until the storm and
connection instability have cleared.
