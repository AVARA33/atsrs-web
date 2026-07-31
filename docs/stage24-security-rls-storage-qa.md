# Stage 24 security, RLS and Storage QA

Date: 2026-07-31

Status: PASS. Production remained read-only. Storage and authenticated RLS
tests ran only against staging with synthetic users, a synthetic bucket, and
complete cleanup.

## Production read-only inventory

- Project guard: `hwtjuqyxzivymofamwxl`.
- Public tables: 25/25 have RLS enabled.
- Normalized tables: 4/4 have RLS enabled.
- Normalized anon grants: 0.
- Normalized authenticated direct write grants: 0.
- Normalized authenticated table access is SELECT-only.
- Storage buckets: 2; objects: 27; metadata size total: 9,812,929 bytes.
  The latest object timestamp is unchanged from the verified Stage 21 backup.
- One bucket is public by design for profile photos. The private user-files
  bucket remains owner-path controlled.
- `storage.buckets` and `storage.objects` both have RLS enabled.
- Eight object policies cover authenticated SELECT/INSERT/UPDATE/DELETE for
  the two buckets. Every policy binds the first path segment to `auth.uid()`;
  UPDATE has both USING and WITH CHECK.
- The broad anon/authenticated Storage table grants are platform-managed Data
  API privileges. They do not grant row access without a matching RLS policy;
  no anon Storage policy exists.
- Browser JavaScript contains no service-role credential or service-role
  reference. Service-role use is confined to server-side functions through
  environment secrets.
- `atsrs_files` rows: 26; duplicate paths, missing objects, size mismatches,
  and unreferenced private objects are all zero.
- The Stage 21 byte backup still reconciles to 27 files, 9,812,929 bytes and
  zero SHA-256 mismatch. Current production count, bytes and latest timestamp
  are unchanged from that verified inventory.

## SECURITY DEFINER review

- Every SECURITY DEFINER function has PUBLIC and anon EXECUTE disabled.
- Four authenticated RPCs are intentionally callable and independently verify
  the authenticated user/workspace or admin ownership:
  `atsrs_apply_workspace_command`, `atsrs_get_workspace_command_revision`,
  `atsrs_get_stable_id_compatibility`, and `atsrs_get_admin_overview`.
- Command/revision/compatibility functions use an empty fixed search path.
- The admin overview function has an explicit `public, auth` search path and
  returns privileged metrics only after an `auth.uid()` membership check.
- Supabase advisor WARN entries for those authenticated SECURITY DEFINER RPCs
  are therefore accepted for this baseline, not silently ignored.
- Leaked-password protection is disabled in Auth. Enabling it changes Auth
  configuration and remains a separate production decision.

## Staging synthetic result

Staging project guard: `nsbmbbqgekcwmdqmqsao`.

The database restore intentionally excludes Supabase-managed Storage bucket
metadata. The final test therefore used the official Storage API to create a
temporary private bucket and two temporary authenticated users. Four
owner-path policies were installed only for that bucket and removed in
`finally`.

- owner upload/read/update/delete: HTTP 200;
- uploaded and replaced bytes: SHA-256 match;
- anonymous read: denied;
- second-user read/update/delete: denied;
- normalized direct browser DELETE: HTTP 403;
- anonymous normalized read: denied;
- synthetic user visibility in normalized and legacy workspace tables: 0/0;
- non-admin SECURITY DEFINER overview: no privileged metrics;
- compatibility/stable-ID canary: default-off, minimum-build, ID-less reject,
  valid stable write, CAS, replay, mirror, telemetry and rollback all PASS;
- final synthetic users/buckets/objects/policies: 0/0/0/0;
- final business counts: 17/4/25/0/0;
- `stable_ids_required=false`.

## Gate

- Production workspace snapshot:
  `4081bc53bc29f8d14a6633d483fd4d6c`.
- Source-target personnel/certificate/project/assignment parity: PASS.
- Duplicate and orphan counts: zero.
- Critical database advisors: zero.
- Full repository contract suite: 31/31 PASS.
- Production request/transaction proxy remained below the emergency gate:
  23 commits over 7.045 seconds (about 3.26/s), rollback delta 0,
  waiting locks 0, idle-in-transaction 0, and long-running queries 0.
  No direct point-in-time CPU metric was exposed, so request/rollback/lock
  measurements remain the immediate safety gate.
- Production data, RLS, grants, Storage objects and configuration were not
  changed.

Stage 24 is closed: PASS.
