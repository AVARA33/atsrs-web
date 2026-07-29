# Stable-ID relevant schema truth inventory

Captured read-only for project `hwtjuqyxzivymofamwxl`. This inventory is
limited to the legacy source, four normalized shadow tables, their sync logic,
and the pending stable-ID objects. It contains no row values or secrets.

## Live objects before stable-ID migration

| Object | Live state verified |
|---|---|
| `public.atsrs_workspace_data` | Legacy JSON read/write authority; 17 rows; enabled synchronous shadow trigger |
| `public.atsrs_workspace_projects` | 0 rows; RLS enabled; authenticated SELECT only after dual-write hardening |
| `public.atsrs_workspace_personnel` | 4 rows; RLS enabled; authenticated SELECT only |
| `public.atsrs_personnel_certificates` | 25 rows; RLS enabled; authenticated SELECT only |
| `public.atsrs_project_personnel` | 0 rows; RLS enabled; authenticated SELECT only |
| `atsrs_private.sync_workspace_normalized_shadow()` | Present; executable revoked from public/anon/authenticated |
| `public.atsrs_workspace_data_normalized_shadow` | Enabled `AFTER INSERT OR UPDATE OR DELETE`, row-level trigger |
| `extensions.uuid_generate_v5` | Required by pending stable-ID migration |

The pending `atsrs_private.runtime_flags` table and four `source_entity_id`
columns are not live. Migration `20260729041619` is not in remote history.

## Columns and defaults

- Projects: UUID primary key; workspace user/account; project, vessel, client
  and team names; legacy key; object metadata default `{}`; created/updated
  timestamps default `now()`.
- Personnel: UUID primary key; workspace user/account; optional linked auth
  user; identity/contact/employment/status fields; verification booleans
  default false; legacy key; object metadata default `{}`; created/updated
  timestamps.
- Certificates: UUID primary key; workspace user/account/personnel; optional
  file; type/provider/number/country; date-only issue/expiry; legacy key; object
  metadata default `{}`; created/updated timestamps.
- Assignments: UUID primary key; workspace user/account/project/personnel;
  legacy key; created/updated timestamps.

The pending migration adds a non-null UUID `source_entity_id` to each normalized
table after deterministic backfill. It also adds private runtime flag
`stable_ids_required`, default false.

## Constraints and delete rules

- Every normalized entity references the composite workspace identity with
  `ON DELETE CASCADE`.
- Personnel's linked auth user uses `ON DELETE SET NULL`.
- Certificate-to-personnel and assignment-to-project/personnel are composite,
  workspace-scoped FKs.
- Certificate file uses `ON DELETE SET NULL`.
- Account type is limited to `personal` or `company`; required names/types are
  nonblank; certificate expiry cannot precede issue date; metadata must be an
  object.
- Existing idempotency is workspace-scoped `legacy_source_key`; assignments
  also uniquely constrain project/personnel.
- Pending stable identity is unique on
  `(workspace_user_id, workspace_account_type, source_entity_id)` for every
  target table.

Stable trigger logic deliberately restricts removal of personnel/projects that
still have stable relationships, even though lower-level FKs cascade. This
prevents an old client from silently deleting linked shadow data.

## Indexes

Verified relevant indexes cover:

- project workspace/account/name;
- personnel workspace/account/name, position, tracker status and linked user;
- certificate workspace/account/personnel, type, expiry and file;
- assignment workspace/account/personnel;
- every primary key, unique legacy key and composite FK/unique key.

The FK index audit reported no missing index for the four normalized tables.

## RLS, policies and grants

All four normalized tables have RLS enabled. Each has four authenticated,
workspace-scoped policies: SELECT, INSERT, UPDATE and DELETE. INSERT and UPDATE
include `WITH CHECK`; access resolves the current user's personal workspace or
authorized company workspace.

Dual-write hardening revokes INSERT/UPDATE/DELETE from `authenticated`, so the
policies remain ready for a future reviewed write switch while clients
currently receive SELECT only. `anon` has no table privilege. The sync function
is not directly executable by public, anon or authenticated.

The pending private runtime-flags table has RLS enabled and no client policy.
Stable-ID does not add an enum or expose `service_role` to frontend code.

## Function and trigger hashes

- The live dual-write function matches migration `20260729035118`, normalized
  SQL MD5 `db91508250fb6ce73492e764f78b4439`.
- The enabled trigger definition matches that migration.
- The live notification queue function is an external reconciliation blocker:
  body MD5 `a64e5d651e5536a4c704bf9cbb87b497`, matching the untracked V242 file rather
  than remote V240 history.

## Integrity and advisor baseline

- Entity counts: legacy/personnel/certificates/projects/assignments =
  `17/4/25/0/0`.
- Duplicate legacy/stable identity: 0.
- Certificate/assignment orphan: 0.
- Workspace mismatch: 0.
- Security Advisor: two existing warnings
  (`atsrs_get_admin_overview` authenticated SECURITY DEFINER execution and
  leaked-password protection disabled).
- Performance Advisor: one existing multiple-permissive-policy warning on
  talent profile SELECT.
- New critical findings caused by this local preparation: 0.

This inventory supports planning but does not replace the required post-history
reconciliation dump and staging restore rehearsal.
