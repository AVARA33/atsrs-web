# Normalized shadow-read (V391)

V391 keeps `atsrs_workspace_data` JSON as the authoritative read and write
source. The normalized tables are read in parallel only to verify parity. A
mismatch is reported without values and never changes UI state or database
data.

## Read and write ownership

| Entity | Authoritative reader | Current writer | Shadow reader | Conflict rule |
| --- | --- | --- | --- | --- |
| Personal profile | legacy workspace JSON | existing legacy/dual-write flow | `atsrs_workspace_personnel` | report only |
| Company personnel | legacy workspace JSON | existing legacy/dual-write flow | `atsrs_workspace_personnel` | report only |
| Certificates | legacy workspace JSON | existing legacy/dual-write flow | `atsrs_personnel_certificates` | report only |
| Projects | legacy workspace JSON | existing legacy/dual-write flow | `atsrs_workspace_projects` | report only |
| Personnel assignments | legacy workspace JSON | existing legacy/dual-write flow | `atsrs_project_personnel` | report only |

The shadow module contains no insert, update, upsert, or delete operation.
`service_role` is never present in frontend code.

## Canonical comparison

- Entity identity is the workspace-scoped stable UUID. Names and array offsets
  are never used as identity.
- Object keys and entity collections are sorted deterministically.
- Trimmed empty optional strings and `null` compare as `null`.
- Dates compare as `YYYY-MM-DD`; `N/A` and `NA` compare as `null`.
- Entity collection order is ignored. Semantic nested-array order is retained.
- `capturedAt`, `recoveredAt`, `created_at`, `updated_at`, `createdAt`, and
  `updatedAt` are excluded as volatile metadata.
- Missing/invalid stable IDs are an explicit mismatch; no relationship is
  guessed.

Telemetry contains only a hashed workspace scope, entity/category, field
names, counts, and canonical hashes. It never contains field values or PII.
The root element exposes only build, status, and mismatch count for automated
smoke tests.

## Release gate and rollback

Production audit must cover all 17 workspace rows and match target totals
`4/25/0/0`, with zero skipped records, duplicates, orphans, and workspace
mismatches. Staging must show the same result and normalized tables must remain
anonymous-inaccessible and authenticated owner/workspace isolated.

If production reports a mismatch, an unavailable shadow query, a UI
regression, or any data checksum change, revert the frontend to V390 commit
`c3c196081d0c0fd2fa32fd57f42c469835ad5f93`. No database rollback is required
because V391 makes no database mutation.
