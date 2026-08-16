# ATSRS data and performance audit — 16 August 2026

## Decision

The proposed direction is valid, with two corrections:

1. ATSRS does not currently need a database-platform migration. Supabase remains the backend and Cloudflare remains the delivery/API edge where already configured.
2. A wholesale rewrite of `storage.js` or `server-data.js` would create unnecessary release risk. Improvements must be query-driven, route-scoped and shipped in measured batches.

## Current evidence

- The client currently contains 47 JavaScript files totalling 843,774 bytes before transfer compression.
- The largest modules are `storage.js` (164,852 bytes), `server-data.js` (96,883 bytes), `talent-directory.js` (66,551 bytes), `share-profile.js` (48,705 bytes) and `app.js` (48,458 bytes).
- `storage.js` is still the authoritative compatibility facade. Existing architecture notes explicitly reject a big-bang split.
- The normalized Supabase shadow model exists, but some legacy JSON compatibility remains. It should not be removed until route-by-route parity and rollback are proven.
- Jobs remains a read-only prototype. A production write model, moderation rules, retention policy and RLS contract must be designed before server persistence is enabled.
- File metadata now supports route-aware category filtering and bounded range reads. Its production SQL index migration is committed but must be applied separately through the controlled Supabase migration workflow.

## Data-flow map

| Area | Current source | Client cache | Main risk | Safe next action |
| --- | --- | --- | --- | --- |
| Personal documents | Supabase rows/storage through `server-data.js` | In-memory/browser compatibility state | Unbounded metadata growth | Keep bounded category/range queries and apply matching migration |
| Candidate/Personnel | Supabase plus compatibility projection | Route render state | Re-reading full profiles or stale projections | Explicit route filters, pagination and cache invalidation by updated timestamp |
| Sharing/notifications | Supabase server data | Short-lived UI state | Polling while route is hidden | Visibility-aware event/realtime refresh; retain a slow fallback only where required |
| Projects | Supabase/compatibility facade | Route state | Large workspace reads | Workspace filter plus bounded project/personnel queries |
| Jobs prototype | Static/read-only client data | Module state | Premature schema or persistence assumptions | Design schema/RLS/moderation before backend enablement |

## Confirmed background-work finding

Five legacy periodic DOM stabilizers were running continuously even though the same work already had route, load, resize, scroll or resume triggers:

- English-only UI enforcement in `auth.js`
- Login build-badge enforcement in `login.js`
- Three shell/top-action cleanup loops in `ui.js`

This batch removes those five timers and keeps the event-driven paths. The English-language enforcement is also idempotent, so it no longer rewrites local storage or unchanged DOM attributes.

Other stabilizers still exist in account, dashboard, documents, references, storage and sharing modules. They are not removed in bulk: each must first be tied to its owning route and verified against the corresponding UI regression.

## Query and index policy

- Add indexes only for observed filters, joins and sort order.
- Always include the authenticated user/workspace filter in application queries; RLS is the security boundary, not a substitute for selective queries.
- Prefer `(select auth.uid())` in RLS policies where appropriate to avoid repeated function evaluation.
- Avoid `select('*')` for growing tables when a route needs only a small projection.
- Use bounded range/keyset pagination for growing lists.
- Do not duplicate the same authoritative dataset across Supabase and Cloudflare storage without an explicit cache ownership and invalidation contract.

## Release decision

**GO for this narrow client optimization.** It changes no schema, RLS policy, entitlement, production user row or storage object. The next performance batch should focus on route-based script loading and measured Supabase query projections, not a platform migration or a broad rewrite.
