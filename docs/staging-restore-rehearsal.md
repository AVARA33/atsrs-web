# ATSRS staging restore rehearsal

Status: executed successfully on isolated staging project
`nsbmbbqgekcwmdqmqsao` on 2026-07-29. Never run this procedure against
production project `hwtjuqyxzivymofamwxl`.

The original
`atsrs-database-backup-20260729-001024/public-schema.sql` is retained as
evidence but is marked `INVALID-DO-NOT-RESTORE`: nine function dollar-quote
terminators lack SQL semicolons. Use only the validated artifacts below:

- raw schema:
  `output/atsrs-schema-backup-valid-20260729-175416/schema-public-private-atsrs_private.sql`;
- restore-safe schema:
  `schema-public-private-atsrs_private.restore-safe.sql`;
- scoped raw data: `data-scoped-19-tables.sql`;
- dependency-ordered restore copy:
  `data-scoped-19-tables.restore-safe.sql`.

The schema restore-safe transform removes exactly 12 complete, top-level
`ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin"` statements. The data
restore-safe transform only reorders the 17 complete `atsrs_workspace_data`
INSERT statements so personnel owners precede certificate relations. Both raw
artifacts remain unchanged, and both transforms have hash/diff manifests.

## Required external inputs

1. An approved, isolated Supabase staging project.
2. A staging database connection exposed through `PGHOST`, `PGPORT`,
   `PGDATABASE`, `PGUSER` and a locally entered `PGPASSWORD`. Do not place the
   password or URL in Git, chat, command arguments or logs.
3. `ATSRS_STAGING_PROJECT_REF` set to the staging ref. The verifier refuses the
   production ref.
4. An approved auth identity mapping. The scoped backup intentionally excludes
   passwords, sessions, OTPs and auth secrets. The completed rehearsal used
   five synthetic users and stored the local mapping with Windows DPAPI.
5. A staging Storage bucket or a read-only storage-object inventory for checking
   the 26 database file references. Do not copy production objects without
   explicit authorization.

## Package-only validation

Run this before obtaining a staging connection:

```powershell
.\scripts\staging\verify-restore-package.ps1 -ValidatePackageOnly
```

This verifies every backup SHA-256, required dump files, exact remote migration
hashes, migration order, baseline security contracts and canonical checksum
tests. It performs no network or database action.

## Restore sequence

All commands below target staging only.

1. Record the staging ref, empty-database counts, enabled extensions and
   migration history. Abort if the ref equals production.
2. Keep an untouched copy of the backup. Verify `SHA256SUMS.txt`.
3. Prepare auth identities using the approved mapping. Preserve relationship
   semantics, but never import passwords, sessions, refresh tokens, OTPs or
   provider secrets. If UUID preservation cannot be proven, transform a copy of
   the public data dumps with a reviewed old-to-staging UUID map; never edit the
   original backup.
4. Restore the validated restore-safe schema with `ON_ERROR_STOP=1` and
   `--single-transaction`. Confirm tables, constraints, indexes, functions,
   triggers, grants and RLS before loading data.
5. Restore `data-scoped-19-tables.restore-safe.sql` inside a controlled
   transaction. Keep the normalized-shadow trigger enabled, while temporarily
   disabling only the reviewed import-conflicting user triggers. Compare every
   table count with the scoped-data manifest.
6. Validate all `atsrs_files.storage_path` references against the approved
   staging Storage inventory. Database path checks alone do not prove the object
   exists.
7. Reconcile history on staging only. The 28 remote files must match their
   pinned hashes, and the seven proven history-only versions may be marked
   applied only after schema/data verification. `db push --dry-run
   --include-all` must then show only `20260729041619`. Never run production
   `migration repair`.
8. Run:

   ```powershell
   .\scripts\staging\verify-restore-package.ps1
   ```

   The script uses the environment connection and runs aggregate-only SQL plus
   `stable-id-verify.sql`.
9. Re-run the baseline migrations in a transaction that ends with `ROLLBACK`.
   Counts, schema hashes and canonical hashes must remain unchanged.
10. Run the local V387 compatibility tests without deploying a public frontend.
    Test old/new client payloads, Personal/Corporate account ordering,
    create/update/delete/reorder, stale multi-tab write and offline/reconnect.
    Run database scenarios in a transaction that ends in `ROLLBACK`.
11. Run Security and Performance Advisors. New critical findings must be zero.
12. Export the staging verification output, migration list, advisor result and
    smoke-test checklist. Do not include personal field values.

## Pass criteria

- Backup hash failures: 0.
- Restored scoped table counts equal the backup manifest.
- Stable entity counts match the approved source baseline.
- Canonical source/shadow checksum mismatch: 0.
- Duplicate/orphan/workspace mismatch: 0.
- Normalized RLS tables: 4/4.
- Anonymous normalized-table access: 0.
- Authenticated direct normalized writes: 0.
- V242 function body MD5:
  `6580d4330f1f405bdbf14183b41aa37e`, SECURITY DEFINER with empty
  `search_path`, no public/anon/authenticated EXECUTE.
- Broken Storage references: 0.
- New critical advisor findings: 0.
- Local frontend/Postgres contract errors introduced by V387: 0.

The completed rehearsal report is
`docs/audit/staging-rehearsal-20260729.md`. Storage blobs were deliberately not
copied; the rehearsal verifies database references only.
