# ATSRS staging restore rehearsal

Status: executable package ready; no staging target has been supplied. Never run
this procedure against project `hwtjuqyxzivymofamwxl`.

## Required external inputs

1. An approved, isolated Supabase staging project.
2. A staging database connection exposed through `PGHOST`, `PGPORT`,
   `PGDATABASE`, `PGUSER` and a locally entered `PGPASSWORD`. Do not place the
   password or URL in Git, chat, command arguments or logs.
3. `ATSRS_STAGING_PROJECT_REF` set to the staging ref. The verifier refuses the
   production ref.
4. An approved auth identity mapping. The scoped backup intentionally excludes
   passwords, sessions, OTPs and auth secrets.
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
4. Restore `public-schema.sql` with `ON_ERROR_STOP=1`. Confirm tables,
   constraints, indexes, functions, triggers, grants and RLS before loading
   data.
5. Restore each `data-public-*.sql` file in the manifest inside a controlled
   transaction. Compare every table count with `backup-manifest.txt`.
6. Validate all `atsrs_files.storage_path` references against the approved
   staging Storage inventory. Database path checks alone do not prove the object
   exists.
7. Apply repository migrations to staging in timestamp order. The 28 remote
   files must match their pinned hashes. The two baseline migrations must run
   repeatably. Do not run production `migration repair`.
8. Run:

   ```powershell
   .\scripts\staging\verify-restore-package.ps1
   ```

   The script uses the environment connection and runs aggregate-only SQL plus
   `stable-id-verify.sql`.
9. Re-run the baseline migrations in a transaction that ends with `ROLLBACK`.
   Counts, schema hashes and canonical hashes must remain unchanged.
10. Deploy the V387 frontend to an isolated staging origin only. Test Personal
    and Corporate login/account switching, Dashboard, Documents, Personnel,
    Projects and Compliance. Test a synthetic create/update/delete/reorder,
    stale multi-tab write and offline/reconnect; clean up the synthetic
    workspace.
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
- Browser/Edge/Postgres errors introduced by V387: 0.

Without the approved staging project, auth mapping and Storage inventory, the
restore rehearsal remains the only external blocker.
