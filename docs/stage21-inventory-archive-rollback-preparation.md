# Stage 21 inventory, archive and rollback preparation

Date: 2026-07-31

Status: PASS. Stage 20 remains closed. This document does not authorize an
archive move, deletion, global strict enable, or data cleanup.

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

## Current state frozen for retention

- deployed build: `V405`
- deployed repository commit: `10d49bb876647475c1b7e547beac8d620bb6d7e3`
- compatibility scopes: `4`; strict-enabled `0`, kill switch on `4`
- global `stable_ids_required`: `false`
- legacy JSON mirror/fallback: active
- canonical normalized target MD5:
  `cf2e33749340f7b7924ae3c5d8663251`
- counts: `17/4/25/0/0`
- duplicate/orphan/workspace mismatch: `0`

## Stage 21 verified package

Package root:

`C:\Users\user\Documents\GitHub\output\atsrs-stage21-retention-20260731-093317`

- repository ZIP SHA-256:
  `5518AAC1893093DD84A13B3E578305E84FF671B548FF16EADC6A08B4F6190332`
- Git bundle SHA-256:
  `BC3433A0AE47301670B8CD29C26FB7B8A0E42D28E308F220F2E1F5371F0D22F1`
- raw schema SHA-256:
  `2C90BF46606ED3C5E4934719A54F188BEA5AE73F13008CC7475994C2A0D442C5`
- restore-safe schema SHA-256:
  `9C8D1815FBE8DE359B6B384E8AB7FD2BC8A7A4A8C2E68CF507009731FF56F498`
- scoped data SHA-256:
  `AD301D137FF6380B989D57931A37FAECB74FF028CE74D77EE09A0E2E290EA8BD`
- restore result: `17/4/25/0/0`, orphan `0`
- production/restored canonical MD5:
  `6c2b7a1b13de46754517c58ec95c1e74`

Storage reconciled against the protected byte backup: `2` buckets, `27`
objects, `9,812,929` bytes, object inventory MD5
`3b72ebc3502c50269aca8eb5198ea766`, and `0` SHA mismatch.

The immediate CPU safety proxies remained stable during the read-only work:
API `0.17/s`, 5xx/504/stale revision `0`, idle transaction and waiting lock
`0`, deadlock `0`. The connector does not expose an instantaneous CPU number;
request/rollback/lock/error deltas are therefore the immediate gate.

## Archive candidate classification

No object is an archive candidate. The verified classification uses these
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

- `KEEP_ACTIVE`: legacy JSON, normalized graph, mirror/fallback, compatibility
  controls, current database and Storage.
- `KEEP_RECOVERY`: V385, V387, V390, V405, verified database/Storage backups
  and rollback SQL.
- `ARCHIVE_CANDIDATE`: none.
- `INVALID_DO_NOT_RESTORE`: the 22-byte legacy ZIP and the known malformed old
  schema artifacts.

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
