# ATSRS backup, rollback and disaster recovery

## Scope and invariants

- Production project: `hwtjuqyxzivymofamwxl`.
- Restore rehearsal target: staging project `nsbmbbqgekcwmdqmqsao` only.
- Database dumps and user documents must never be committed to Git.
- Backup payloads are authenticated-encrypted before leaving temporary storage.
- Secret values are stored with Windows DPAPI and must never be pasted into chat or logs.
- A failed checksum, HMAC, staging guard, RLS check or restore validation is a stop condition.

## Backup layers

1. Daily PostgreSQL roles, schema, data and custom-format dump.
2. Separate download of every Supabase Storage object.
3. SHA-256 for every package member and for the final encrypted file.
4. Local encrypted copy under Documents and an optional independent mirror set by
   `ATSRS_BACKUP_MIRROR_DIR`.
5. Git protects migrations and Edge Function sources; their hashes are recorded in each backup.

The package uses PBKDF2-HMAC-SHA256, AES-256-CBC and encrypt-then-HMAC-SHA256.
The final file has extension `.atsrsbak`; plaintext work files are removed in `finally`.

## Initial setup

Run `scripts/operations/Initialize-AtsrsBackupSecrets.ps1` interactively. Enter secrets only
in that local PowerShell window. Set the mirror to a private OneDrive/Google Drive/cloud
folder, then run `scripts/operations/Install-AtsrsOperationsTasks.ps1`.
This installs the verified encrypted-backup and production-health tasks. The
aggregate log monitor is opt-in: use `-IncludeLogMonitor` only after
`Get-AtsrsProductionLogHealth.ps1` passes with a valid Supabase personal access
token. A failed log-monitor preflight must not register a scheduled task.
Update only that token with
`scripts/operations/Update-AtsrsManagementAccessToken.ps1`, run the log-health
script once, and then reinstall tasks with `-IncludeLogMonitor`.

## Daily verification

- The backup task must end with `BACKUP_STATUS=PASS`.
- Run `Test-AtsrsBackup.ps1 -BackupFile <file>` and require all five PASS lines.
- Confirm both the local encrypted file and independent mirror have matching SHA-256.
- Health monitor output is aggregate only and is stored under `%LOCALAPPDATA%\ATSRS\Monitoring`.
- Investigate non-zero 5xx/504/Auth error counts and material CPU or connection growth.

## Monthly staging restore rehearsal

1. Confirm staging may be erased and has no irreplaceable data.
2. Securely obtain the staging database password.
3. Set `ATSRS_DISPOSABLE_RESTORE_CONFIRMED=YES-ERASE-STAGING` for that process only.
4. Run `Invoke-AtsrsRestoreRehearsal.ps1` with the newest verified backup.
5. Require `TARGET=STAGING`, aggregate counts and `RESTORE_REHEARSAL=PASS`.
6. Run application smoke tests with synthetic accounts only.
7. Record date, backup SHA-256, commit, aggregate counts and result in `docs/audit/`.

The script refuses any target containing the production project ref.

## Incident rollback

1. Stop writes or disable the affected feature flag/canary.
2. Preserve current logs and record UTC time, deployed commit and Supabase function versions.
3. Prefer application rollback to the last known-good Git commit when data is intact.
4. For database recovery, verify the encrypted backup twice before restoring.
5. Restore roles, schema and data in the documented Supabase order, then restore Storage objects.
6. Re-run RLS/grant/advisor, Auth, Storage, Edge, 5xx/504, CPU and application smoke gates.
7. Re-enable traffic only after independent review.

Never restore production merely to test a backup. Never delete the last known-good encrypted
backup. Supabase platform backups are an additional layer and do not replace this procedure.
