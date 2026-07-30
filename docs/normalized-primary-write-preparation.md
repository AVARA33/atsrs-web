# Normalized primary-write preparation

Status: **NO-GO for production primary write**. This is a preparation and
evidence package only. It does not authorize a database migration, grant/RLS
change, frontend write cutover, push, or deployment.

## Stage 18 closure

V400 normalized primary read is live at commit
`56d6bc420d6bb6b6cb9357ab6131589096d30d07`. Normalized reads are selected
only after exact parity and retain the legacy JSON fallback. Production counts
remain `17/4/25/0/0`; source/target canonical checksums match; duplicate,
certificate orphan, assignment orphan, and workspace mismatch counts are zero.
`stable_ids_required=false`.

The rollback point for this preparation is:

`C:\Users\user\Documents\GitHub\output\atsrs-v400-primary-write-prep-20260730-094659`

The full ZIP SHA-256 is
`099E125188B527F451314E5A0CC0C0681EDC033449CE73A613BD1BD79C70AF70`.
The Git bundle SHA-256 is
`74A7222B11BC240FD971A0566B36C9830C84D1D85AEE728047086B33E3E79E04`.
Both were independently opened/verified.

## Current writer ownership

| Domain | UI entry points | Current durable writer | Transaction owner | Conflict/revision contract |
| --- | --- | --- | --- | --- |
| Personal profile | `saveProfile`, avatar/profile helpers | `writeAppDataKey` → `atsrsCloudData.write` → `atsrs_workspace_data` | One legacy-row statement plus synchronous shadow trigger | Legacy row `updated_at` compare-and-swap; three-way field merge; bounded retry |
| Company personnel | add/delete/import flows through `saveData("personnel")` | Same legacy writer | Same database transaction | Stable entity IDs; field-aware array merge; conflicting same-field edit rejected |
| Certificates | manual/AI confirm, edit, single/bulk delete through `saveData("certs")` | Same legacy writer | Same database transaction | Stable certificate/personnel IDs; exact file mapping; stale overlap rejected |
| Projects | add/delete through `saveProjects` | Same legacy writer | Same database transaction | Stable project IDs; assignments constrain deletion |
| Project-personnel | personnel `atsrsProjectIds` saved with personnel | Same legacy writer | Same database transaction | Workspace-scoped FK/unique constraints in shadow |

`js/server-data.js` is the only browser business-data transport. It writes
`atsrs_workspace_data`, drains a bounded queue, suppresses no-op writes, rebases
non-overlapping multi-tab changes, and rejects overlapping stale changes. The
database trigger `atsrs_workspace_data_normalized_shadow` then updates all
normalized rows in the same PostgreSQL transaction. A trigger failure rolls the
legacy source statement back.

`js/normalized-read-runtime.js` is read-only. It has no normalized write path.
Legacy JSON remains the write authority and rollback source.

## Production security inventory

The four normalized tables have:

- RLS enabled;
- one workspace-owner `SELECT` policy for `authenticated`;
- `INSERT`, `UPDATE`, and `DELETE` policies with workspace ownership checks;
- `UPDATE` policies with both `USING` and `WITH CHECK`;
- explicit `authenticated SELECT`;
- zero `anon` grants;
- zero `authenticated INSERT/UPDATE/DELETE` grants.

Policies alone do not expose writes. Supabase Data API grants and RLS are
separate gates. The current explicit grants intentionally make the normalized
tables browser-read-only. Authorization uses `auth.uid()` and does not use
user-editable `user_metadata`. No service-role key exists in frontend code.

## Proven blocker

The present schema supports one atomic direction only:

`legacy JSON write → normalized trigger shadow`

There is no trigger, RPC, or command handler for:

`normalized write → legacy JSON fallback`

Enabling browser DML grants and issuing independent REST writes would create
four unacceptable failure modes:

1. personnel/certificate/project/assignment changes would span several HTTP
   statements and would not be atomic;
2. a normalized success followed by legacy fallback failure would leave two
   durable sources divergent;
3. normalized tables have no shared workspace command revision equivalent to
   the legacy row `updated_at` compare-and-swap;
4. delete ordering and relationship constraints could partially succeed before
   a later request fails.

This is an R3 data-integrity blocker, not a frontend-only implementation issue.
Production primary write cannot be enabled safely without a separately reviewed
database/API contract and explicit grant/RLS gate.

## Staging rollback rehearsal

Target guard:

- production: `hwtjuqyxzivymofamwxl` (`ATSRS`);
- staging: `nsbmbbqgekcwmdqmqsao`
  (`atsrs-staging-20260729`);
- both were confirmed healthy in `eu-west-1`.

Only staging received a synthetic transaction, and that transaction ended with
`ROLLBACK`.

Results:

- legacy synthetic write created its normalized project in the same
  transaction: PASS;
- direct normalized synthetic write created no legacy fallback row: confirmed;
- authenticated normalized `INSERT/UPDATE/DELETE` grant counts: `0/0/0`;
- after rollback counts returned to `17/4/25/0/0`;
- remaining synthetic legacy/normalized rows: `0/0`;
- production mutation: zero.

The rehearsal proves the existing legacy-first mechanism is atomic and also
proves that the requested normalized-first mechanism does not yet exist.

## Required next database/API gate

Do not grant direct table DML and do not implement four independent browser
requests. The next proposal must provide one atomic workspace command contract
that:

1. authenticates with `auth.uid()` and authorizes the workspace without
   `user_metadata`;
2. accepts a request/idempotency UUID and an expected workspace revision;
3. applies the normalized entity graph and updates the legacy fallback inside
   one PostgreSQL transaction;
4. rejects stale revisions without retrying over a same-field conflict;
5. validates stable IDs, cross-workspace relationships, file ownership, delete
   ordering, and source/target canonical parity before commit;
6. returns the committed revision and privacy-safe result counts;
7. exposes only the minimum `EXECUTE`/table privileges required;
8. has an idempotent migration, full RLS/grant tests, advisor review, staging
   create/update/delete/offline/multi-tab rehearsal, and a non-destructive
   rollback to the existing legacy writer.

Whether this is a tightly locked RPC or another transactional server command
must be decided in that separate database-security review. A public
`SECURITY DEFINER` shortcut is not accepted without explicit ownership checks,
fixed `search_path`, revoked default `PUBLIC` execute, least-privilege grants,
and advisor review.

## Gate decision

Stage 18: **PASS and closed**.

Stage 19 preparation: **PASS as an audit/rehearsal package**.

Production normalized primary-write activation: **NO-GO** until the required
transactional database/API contract and its schema/RLS/grant migration receive
separate approval and pass staging.
