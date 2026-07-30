# Stage 19 OPTIONS-only RPC diagnostic

Date: 2026-07-30  
Baseline: `76b4660051f90fe457917ff18dea0dbfdfe71366`  
Production primary-write: OFF  
`stable_ids_required`: false

## Proven request path

The runtime path reaches `client().rpc(...)`:

1. business write enters `writeBusinessValue`;
2. the queued normalized command is drained;
3. the primary-write runtime guard permits the canary command;
4. `applyNormalizedCommand` constructs the RPC request;
5. the browser starts an external POST and emits the CORS preflight.

The full preflight completed with HTTP 200. The response allowed POST and echoed
the requested Supabase headers. No service worker registration exists in the
application.

In the automated browser environment the trace then stopped at `fetch-start` and
the POST promise never settled. In the same approved staging session, a direct
HTTPS POST reached the RPC immediately and returned the expected validation error
for the deliberately invalid probe. This distinguishes the failure from the ATSRS
queue, request construction, Supabase RPC, database function, and CORS policy.

Conclusion: the observed OPTIONS-only failure is a browser-automation network
transport stall. It is not evidence of a production application or database
contract failure.

## Local forward guard

The candidate adds a bounded RPC transport timeout with `AbortController` support:

- a stalled transport cannot leave queue flushing or the UI loader pending forever;
- the failure remains visible as `ATSRS_TRANSPORT_TIMEOUT`;
- the condition is retryable by the existing bounded recovery path;
- no database schema, grant, RLS policy, write flag, or business-data mapping changes.

The guard does not claim to make a blocked browser transport send a POST. A real
authenticated browser mutation canary remains mandatory before production deploy.

## Verification

- Repository JavaScript syntax checks: PASS
- Repository test files: 19/19 PASS
- Deterministic stalled-RPC timeout and loader cleanup test: PASS
- Staging counts: 17 workspace rows, 4 personnel, 25 certificates, 0 projects,
  0 assignments
- Staging synthetic residue: 0 rows and 0 command receipts
- Duplicate/orphan/workspace mismatch checks: 0
- `stable_ids_required`: false
- New critical advisor findings: 0

## Gate decision

Stage 19 remains **NO-GO**. The authenticated staging browser create/update/delete
matrix did not execute because the automation transport did not deliver the POST.
Primary-write must remain OFF and this candidate must not be pushed or deployed
until that browser gate is completed in an environment that can deliver the RPC.
