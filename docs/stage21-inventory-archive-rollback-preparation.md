# Stage 21 inventory, archive and rollback preparation

Date: 2026-07-31

Status: preparation only. Stage 20 production rollout is complete. This
document does not authorize an archive move, deletion, global strict enable, or
data cleanup.

## Safety boundary

- Legacy `atsrs_workspace_data` JSON remains present and recoverable.
- Legacy JSON mirror/fallback remains part of the compatibility contract.
- `stable_ids_required` remains `false`.
- No table, row, column, policy, function, trigger, file, backup or migration is
  deleted.
- Production project `hwtjuqyxzivymofamwxl` is read-only during this
  preparation.

## Inventory to freeze before any future archive action

1. Code lineage
   - deployed Git commit and build marker;
   - complete repository ZIP and Git bundle;
   - working-tree patch when the tree is not clean;
   - asset/cache version manifest.
2. Database schema
   - raw and restore-safe schema dumps;
   - migration history;
   - functions and normalized body hashes;
   - triggers, constraints, indexes, RLS, policies and grants.
3. Business data
   - `atsrs_workspace_data`;
   - `atsrs_workspace_personnel`;
   - `atsrs_personnel_certificates`;
   - `atsrs_workspace_projects`;
   - `atsrs_project_personnel`;
   - workspace revision and idempotency receipt state required for recovery.
4. Storage
   - bucket and object metadata;
   - downloaded object bytes;
   - per-object size and SHA-256;
   - database file-reference reconciliation.
5. Compatibility evidence
   - per-workspace strict scope state;
   - minimum client build;
   - kill-switch state;
   - privacy-safe rejection/refresh telemetry;
   - before/after counts and canonical hashes.

## Current protected rollback point

Stage 20 backup root:

`C:\Users\user\Documents\GitHub\output\atsrs-stage20-production-rollout-20260731-083650`

- repository ZIP SHA-256:
  `C9E98FD6467D3D23B155D70FF38E1B7036C546BAD10430C1D83185255DEFB5CB`
- Git bundle SHA-256:
  `73D568CFDDAC23C2B49D63D0EE274909653683CFB99511A5C1CE798CBD481128`
- raw schema SHA-256:
  `644FC0C7CB706C207838ECD99C0BE00F416D0177C7FDDDDDDAAE751A759C2AFC`
- restore-safe schema SHA-256:
  `6B4F25DDD7A4C5388DFA3489FACCD7E1CF38EB613703AF86107F643B16A9A31B`
- scoped data SHA-256:
  `8813CFBD5F22A11632F26552CE9910527AF96B63279E66B6330191F018A42CF6`

The ZIP extraction, required file reads, `.git` presence, `git fsck`, and bundle
verification passed. The restore-safe schema and scoped data were also restored
successfully into disposable PostgreSQL 17.10, with counts `17/4/25/0/0` and
orphan/mismatch `0`.

## Stage 20 state frozen for retention

- deployed build: `V405`
- deployed repository commit: `10d49bb876647475c1b7e547beac8d620bb6d7e3`
- compatibility scopes: `4`, all strict-enabled with kill switch off
- global `stable_ids_required`: `false`
- legacy JSON mirror/fallback: active
- canonical normalized target MD5:
  `cf2e33749340f7b7924ae3c5d8663251`
- counts: `17/4/25/0/0`
- duplicate/orphan/workspace mismatch: `0`

## Archive candidate classification

No object is an archive candidate yet. Future classification must use these
states:

- `KEEP_ACTIVE`: required by current reads, writes, mirror, fallback or
  rollback.
- `KEEP_RECOVERY`: not used by the normal path but required for verified
  restore/forward reconciliation.
- `ARCHIVE_CANDIDATE`: unused only after a measured compatibility window,
  complete backup, restore rehearsal, and explicit user approval.
- `INVALID_DO_NOT_RESTORE`: retained evidence that must never be selected for
  recovery.

`atsrs_workspace_data`, its rows, and its mirror/fallback logic are currently
`KEEP_ACTIVE`.

## Four-layer rollback order

1. Feature control
   - disable per-workspace strict;
   - set the workspace kill switch;
   - keep global strict false.
2. Frontend
   - restore the last verified build and cache markers;
   - force refresh only after the compatible build is live.
3. Database logic
   - use non-destructive forward/rollback SQL;
   - do not drop compatibility tables or business columns during an incident.
4. Data recovery
   - pause writes;
   - snapshot current state;
   - compare the change journal and canonical hashes;
   - forward-reconcile newer data before any restore.

## Required archive gate

Archive work remains NO-GO until all are true:

- production compatibility migration has a separately approved rollout;
- per-workspace canary and rollback pass in production;
- minimum client-build adoption window is measured;
- old/cache client refresh failures are within the accepted threshold;
- request rate, CPU trend, locks and gateway errors remain safe;
- source/mirror/normalized counts and canonical hashes remain equal;
- duplicate/orphan/workspace mismatch and skipped sync remain zero;
- backup and staging restore rehearsal pass immediately before the action;
- exact archive list and retention period receive explicit user approval.

Even after this gate, archive means a reversible move to verified retained
storage. It does not authorize deletion. Legacy JSON deletion requires a later,
explicit destructive-action approval and is outside Stage 21 preparation.
