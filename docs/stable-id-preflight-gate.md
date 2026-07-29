# ATSRS stable-ID preflight gate

Status: **NO-GO for production activation**. This document records evidence and
preparation only. It does not authorize migration repair, SQL apply, push or
deployment.

## Verified baseline

- Production is GitHub Pages from `main`, commit
  `bd12a1bc9c81da2cb975c554980956de3cb7a20c`, build V385.
- The local V387 preparation is five commits ahead at
  `fcf0b496b1b221c6d9e1495cd5e037314dbf71ae`.
- The live legacy/normalized counts are `17/4/25/0/0`.
- Duplicate legacy or stable IDs, certificate or assignment orphans, and
  workspace mismatches are zero.
- All four normalized tables have RLS enabled. Anonymous users have no
  privileges. Authenticated users have SELECT but no direct write privilege;
  each table has workspace-scoped SELECT/INSERT/UPDATE/DELETE policies.
- Existing advisor baseline is two Security warnings and one Performance
  warning. No new critical warning was introduced by this local preparation.

The full production lineage evidence is in
`docs/audit/production-v385-lineage.json`. Migration evidence and the proposed
history actions are in `docs/audit/migration-reconciliation.md`.

## Current ownership matrix

| Entity/field | Legacy source | Normalized shadow | Writer | Reader | Authority/conflict rule | Revision | Delete semantics |
|---|---|---|---|---|---|---|---|
| Personal/company personnel | `atsrs_workspace_data.payload.value` | `atsrs_workspace_personnel` | Browser writes legacy row; synchronous DB trigger writes shadow | Legacy JSON | Legacy wins until read-switch. Stale `updated_at` write is rejected. | Workspace row `updated_at` | Workspace delete cascades. Stable relations prevent accidental personnel removal until relations are removed. |
| Certificates | Legacy certificates JSON | `atsrs_personnel_certificates` | Same transaction trigger | Legacy JSON | Legacy wins. A company certificate without a personnel stable ID is deliberately skipped, never guessed from name or array position. | Workspace row `updated_at` | Certificate delete removes the shadow certificate; file reference is `ON DELETE SET NULL`. Personnel relationship is protected by the stable trigger. |
| Projects | Legacy projects JSON | `atsrs_workspace_projects` | Same transaction trigger | Legacy JSON | Legacy wins. A legacy project without stable ID is preserved but skipped in compatibility mode. | Workspace row `updated_at` | Project removal is restricted while assignments exist. |
| Project personnel | Project personnel ID arrays | `atsrs_project_personnel` | Same transaction trigger | Legacy JSON | Stable workspace-scoped IDs only; no name, surname or ordinal matching. | Parent workspace row `updated_at` | Assignment rows follow their project/personnel FKs; stable trigger blocks destructive parent removal. |
| File link | Exact legacy file metadata | Certificate `file_id` | Trigger only on exact workspace/user/account/name/MIME/size match | Legacy JSON | No fuzzy matching; ambiguous or missing match remains null. | Source row revision | File deletion sets normalized reference to null. |

The normalized tables are a non-authoritative shadow in this phase. A mismatch
must never be resolved by overwriting legacy JSON automatically.

## Transaction and compatibility proof

`atsrs_workspace_data_normalized_shadow` is an enabled PostgreSQL `AFTER INSERT
OR UPDATE OR DELETE` trigger. It invokes
`atsrs_private.sync_workspace_normalized_shadow()` in the same database
transaction. The function contains no autonomous transaction, network call or
write back to `atsrs_workspace_data`. Therefore a trigger exception aborts the
source statement and its shadow writes together.

The client test suite also simulates a rejected shadow update and confirms that
both the source-row and client-memory changes roll back. A real PostgreSQL
integration rehearsal is still required because Docker and local PostgreSQL are
not installed on this workstation.

Compatibility mode is `stable_ids_required=false`:

- old clients may keep writing legacy payloads;
- payloads missing a stable ID remain authoritative in legacy JSON but are
  skipped by the shadow trigger;
- V387 hydrates deterministic workspace-scoped UUIDv5 IDs before its next save;
- rename and reorder cannot change a hydrated ID;
- strict mode must not be enabled while skipped-sync count is nonzero.

## Canonical checksum specification

Every entity is converted to a fixed-key JSON object. Object keys are fixed by
the entity schema, records are ordered by `source_entity_id`, and the resulting
UTF-8 canonical JSON text is hashed.

- Text: trim outer whitespace; empty text and null normalize to null.
- UUID/legacy ID: lowercase canonical UUID; missing ID is a validation failure.
- Date-only: exactly `YYYY-MM-DD`; locale dates are rejected.
- Timestamp: UTC ISO-8601 with millisecond precision.
- Arrays representing sets: normalize IDs, remove duplicates, sort.
- Arrays whose order has business meaning: preserve order and include the
  ordinal explicitly.
- Duplicate semantic `source_entity_id`: fail; do not silently deduplicate.
- Deleted/tombstoned entities: exclude from active checksum and report a
  separate tombstone count.
- Metadata is excluded unless explicitly listed; when included it is rebuilt as
  fixed-key JSON rather than hashing raw key order.

Source and shadow must use the same normalization. A raw JSON hash is only a
transport diagnostic and cannot replace the canonical business checksum.

## Minimum observability package

The first compatibility window must collect counts without logging personal
values:

| Signal | Minimum measurement | Stop threshold |
|---|---|---|
| Source-shadow mismatch | entity count and canonical checksum by workspace/entity type | any nonzero mismatch |
| Skipped sync | entity type + reason counter (`missing_id`, `ambiguous_file`) | nonzero before strict enable |
| Trigger error | SQLSTATE + operation + workspace hash | any new error |
| Stale write reject | endpoint/operation counter | investigate burst; never auto-retry over newer data |
| Boot/auth/hydration | duration and success/failure | regression above agreed release baseline |
| Duplicate request | idempotency-key counter | any duplicate mutation result |
| Frontend/Edge error | release, route, safe error code | any new critical error |

No telemetry table or external service is added by this local package. The
initial activation can use aggregated verification SQL and existing
console/Supabase logs. Persistent telemetry requires a separately reviewed,
RLS-protected migration.

## Four-layer rollback and forward recovery

1. **Feature flag:** run the reviewed rollback SQL to set
   `stable_ids_required=false`. This is the first response and preserves data.
2. **Frontend build:** redeploy the recorded V385 commit and matching asset
   versions. Close stale V387 tabs and hard refresh.
3. **Database logic:** keep additive IDs, constraints and data. If the trigger
   logic is implicated, replace it with the previously hashed V35118 function
   in an atomic forward migration. Do not drop stable-ID columns during an
   incident.
4. **Data recovery:** pause writes, export a fresh change journal and compare it
   with the preflight snapshot. Restore only proven damaged rows, then
   forward-reconcile all writes newer than the snapshot.

A blind snapshot restore is forbidden: it can erase changes made after the
snapshot. Before any recovery, record a high-water timestamp, primary key,
operation, source canonical hash and shadow canonical hash. Resume writes only
after the forward reconciliation is zero-diff.

## Restore rehearsal

The existing ZIP and database dump hashes/readability were rechecked. This
workstation has neither Docker nor a local `psql`, and creating a new cloud
project is outside scope. Therefore a full restore was not rehearsed here.

Required staging rehearsal before production:

1. Provision an approved, isolated PostgreSQL/Supabase staging target.
2. Restore schema-only dump and inspect extensions, functions, triggers,
   grants, RLS and policies.
3. Restore the scoped data dumps.
4. Compare per-table counts and canonical hashes with the backup manifest.
5. Apply the reconciliation repository to staging and ensure dry-run lists only
   `20260729041619`.
6. Apply stable-ID migration in compatibility mode, run verify SQL, exercise
   create/update/delete/reorder/offline tests, then discard staging.

## Quantitative activation gate

All conditions are mandatory:

- migration dry-run lists only `20260729041619`;
- source/target counts stay `17/4/25/0/0` unless a separately recorded real
  business change explains a new baseline;
- canonical source-target checksums match for every entity;
- duplicate, orphan, workspace mismatch and skipped-sync counts are zero;
- RLS/grants match the verified baseline and new critical advisor findings are
  zero;
- old-client, new-client, rename/reorder, stale multi-tab, offline/reconnect,
  idempotent rerun, lock timeout and transaction rollback tests pass;
- restore rehearsal is complete;
- V387 build markers and assets agree;
- the compatibility window ends with no new trigger, loader, console or
  database error.

## Open blockers

Repository-side V242, secure-share, ACL and timestamp reconciliation blockers
are closed:

- 28/28 remote versions now have exact local files and pinned canonical hashes;
- 18 local timestamp aliases are retired;
- V242 and secure-share live deltas have separate CLI-generated baselines;
- all three service-role differences are accepted as proven platform/live
  baseline, with no security correction required;
- current migration list shows 28 matched remote versions and eight local-only
  versions.

The one remaining external blocker is a full restore/replay rehearsal on an
approved isolated staging project. After it passes, a fresh production backup
must be taken and the seven proven history-only versions may be marked
`applied`, leaving only `20260729041619` pending. Those history mutations remain
outside this preparation phase.

Until the staging rehearsal succeeds, the production activation decision is
**NO-GO**.
