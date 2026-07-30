# Stage 19 RPC transport decision matrix

Date: 2026-07-30  
Production: read-only, primary-write OFF  
Staging: `nsbmbbqgekcwmdqmqsao`

## Decision matrix

All telemetry is privacy-safe and excludes credentials, JWTs, user identifiers,
emails, and payload values.

| Path | Transport | Result | Last safe phase |
| --- | --- | --- | --- |
| A | existing `supabase.rpc()` | FAIL | `fetch-start`, then timeout/abort |
| B | native authenticated `fetch()` to PostgREST RPC | FAIL | `request-sent`, then timeout/abort |
| C | exact pinned client with instrumented fetch | FAIL | `fetch-start`, then timeout/abort |

Authentication completed successfully in every clean-profile run. The failure is
therefore specific to the PostgREST RPC response path rather than all browser
POST requests.

The first combined run was invalid for B/C comparison because timed-out A requests
retained PostgREST backend sessions and contaminated the shared workspace lock
path. Those exact staging RPC sessions were terminated, which rolled back their
transactions. Receipts, legacy probe rows, and normalized probe rows remained zero.

An isolated clean Chrome run repeated path B after lock cleanup. It still timed
out with no receipt or data mutation. A final HTTP/2/QUIC-disabled run produced
the same result. The same approach was not repeated again.

Because native fetch did not pass, the prerequisite for replacing the SDK RPC
wrapper with a custom transport adapter was not met. An adapter would hide the
symptom without proving delivery or rollback safety and is therefore rejected.

## Dependency pinning

The independent supply-chain drift was removed locally:

- `@supabase/supabase-js` is vendored at exact version `2.111.0`;
- the floating runtime CDN URL is removed;
- SHA-256 and SHA-384 SRI are pinned in a committed lock manifest;
- an automated test verifies the vendored bytes, lock values, and HTML integrity.

This pinning is a local candidate only. It does not resolve the staging RPC
transport gate by itself and must not be deployed while Stage 19 is NO-GO.

## Gate

Stage 19 remains **NO-GO**:

- production primary-write stays OFF;
- `stable_ids_required=false`;
- legacy JSON mirror/fallback stays active;
- no production deploy or database mutation is allowed;
- Stage 20 must not start.
