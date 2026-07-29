# ATSRS staging restore and stable-ID rehearsal — 2026-07-29

## Scope and target guards

- Production project: `hwtjuqyxzivymofamwxl` — read-only source only.
- Staging project: `nsbmbbqgekcwmdqmqsao`
  (`atsrs-staging-20260729`, `eu-west-1`).
- Every database mutation ran from the isolated staging work directory whose
  `.temp/project-ref` was checked against both project refs.
- Production SQL apply, migration repair, GitHub push/deploy, DNS, Edge
  Functions, cron, webhook, email and WhatsApp changes: **0**.
- Staging was not deleted and was not connected to the production frontend or
  external side-effect systems.

## Backup artifacts

| Artifact | SHA-256 |
|---|---|
| Raw schema `schema-public-private-atsrs_private.sql` | `B80F7575D23F9054FBCE4E010F4AA21ECAB7F81E8616BDE5139AC84995014971` |
| Restore-safe schema | `2B701E1C49D6A50A5E7CDD878E89ECCD4C5C4AAB7FBA083C0B692569BA4079AC` |
| Schema transform manifest | `DC0268D115ACB28A51A29B83B14725319D2D96F28532FFC4277F1B1B822BE6E5` |
| Raw scoped data (19 tables) | `124151BD51FA6405FFE298BED892039E497B7391D699CB28C5A79E5B33D21A09` |
| Dependency-ordered restore data | `40ED1028FB09C9BA918D6CE591A8E890966F3FF3167B1BEC2CC412BF727DA555` |
| Data transform manifest | `0909F1E461D9AA1194DB011A47A3A88D89E28A3AAF53C272B6F9EA6F90C613D9` |

The raw schema and data artifacts were not overwritten. The schema transform
removed exactly 12 complete top-level statements beginning with
`ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin"`; each removed statement
has its own SHA-256 in the manifest. No `postgres` default privilege, ordinary
GRANT/REVOKE, policy, function, trigger, RLS or object ACL statement was
removed. Dollar quotes, statement terminators, secret scan and exact diff
contract passed.

The raw data was also retained. The restore derivative only reordered the 17
whole `atsrs_workspace_data` INSERT statements so owner/personnel rows precede
certificate relations. Its statement multiset and all non-workspace SQL are
hash-identical to the raw snapshot.

The old
`atsrs-database-backup-20260729-001024/public-schema.sql` remains marked
`INVALID-DO-NOT-RESTORE`; it was not deleted or modified.

## Actual restore result

- Restore-safe schema completed with `ON_ERROR_STOP` and a single transaction.
  Restore log SHA-256:
  `3C1EB60AEF84C4B21728055DDB45C61213185CA4CBC520AE1B2BFECF0C174294`.
- Object parity with production: schemas 3, tables 26, indexes 79, functions
  14, triggers 7, policies 43, constraints 140, RLS tables 25 and effective
  table-privilege rows 347.
- Production and staging application-owned default ACL canonical MD5 matched:
  `ab1d0b467041f9c6f31be6ca726eacbc`. Remaining differences were only
  platform-managed `supabase_admin` owner defaults.
- Five referenced auth identities were recreated as synthetic staging-only
  users. No password, session, OTP or production auth secret was copied.
  The local mapping is protected by Windows DPAPI and is not in Git.
- The first scoped-data attempt encountered a dependency-order trigger error
  and rolled back completely (source/normalized counts remained 0/0/0/0/0).
  The verified derivative then reordered only whole source INSERT statements;
  no field or value was changed.
- Scoped data restore completed atomically. Restore log SHA-256:
  `6CC5905D645906F5BF4E35358CA62B84EAB00DD19658924723BE9CB787D64069`.
- Final counts: workspace data 17, workspaces 4, files 26, personnel 4,
  certificates 25, projects 0, assignments 0.
- Canonical source/target personnel MD5:
  `c0b6d8a631c4d991bbba8e217e04ea78`; certificate/project/assignment matches
  are all true.
- Duplicate stable IDs 0, certificate orphans 0, assignment orphans 0, blank
  storage paths 0 and duplicate storage paths 0.
- Storage blobs were not copied. Only database reference integrity was tested.

## Migration and stable-ID rehearsal

- Empty staging history was exported before mutation.
- The restored schema was reconciled by marking the 35 verified non-stable
  versions applied on staging only.
- `db push --dry-run --include-all` then listed exactly
  `20260729041619_stable_workspace_entity_ids.sql`; dry-run SHA-256:
  `14007FAC4EAF3992525364F76207B2024C91C1A0C00F0670098BF710D85A40E3`.
- Stable-ID migration SHA-256:
  `2D143738C43E5559011D94B976AD68B9D7B049395B34C4B8757C6F3E1D307053`.
- Migration applied successfully to staging. Final migration history matches
  all 36 local versions, and the final dry-run is up to date with no pending
  migration.
- `stable_ids_required` remained false after migration. Enable was tested on
  staging, then the reviewed non-destructive rollback script restored false.
  Rollback log SHA-256:
  `D31C02E4CC93CAECC702374D92000A611BDAAD17BE5631931D4F6CB667206AC6`.

## Tests and advisors

The rollback-only staging SQL test passed:

- old-client payload without ID in compatibility mode;
- new-client stable ID;
- strict-mode old-client rejection;
- rename/reorder identity preservation;
- stale optimistic-write rejection;
- certificate-owner delete restriction;
- cross-workspace FK rejection;
- idempotent shadow rerun;
- transaction rollback.

Its log SHA-256 is
`36508D25994AD7D29842B6108D72DB016684FE6890E7079802296085B93E654C`.
Local frontend tests separately cover hydration, account-switch ordering,
multi-tab stale writes and offline/reconnect retry.
The repository package gate completed with `CONTRACT_TESTS=10/10`,
`PACKAGE_INTEGRITY=PASS` and `BACKUP_HASHES=PASS`.

Final security contract:

- normalized RLS tables 4/4;
- anon normalized SELECT 0;
- authenticated normalized direct writes 0;
- V242 queue function body MD5
  `6580d4330f1f405bdbf14183b41aa37e`;
- function is SECURITY DEFINER with empty search path and owner-only EXECUTE.

Supabase Advisors after the rehearsal:

- Security: 0 errors, 2 pre-existing warnings
  (`atsrs_get_admin_overview()` signed-in execution and leaked-password
  protection disabled).
- Performance: 0 errors, 1 pre-existing warning
  (multiple permissive policies on `atsrs_talent_profiles`).
- New critical findings caused by stable-ID: 0.

## Gate

Staging restore and stable-ID rehearsal: **PASS**.

**PRODUCTION ACTIVATION READY FOR REVIEW**

This statement is not production activation permission. Production remains on
the legacy JSON authoritative read path until a separate activation decision.
