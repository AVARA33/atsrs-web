# Stage 24 security, RLS and Storage QA

Date: 2026-07-31

Status: production read-only audit PASS; staging Storage synthetic gate NO-GO
until the managed Storage baseline is restored or an authenticated Storage API
test session is available.

## Production read-only inventory

- Project guard: `hwtjuqyxzivymofamwxl`.
- Public tables: 25/25 have RLS enabled.
- Normalized tables: 4/4 have RLS enabled.
- Normalized anon grants: 0.
- Normalized authenticated direct write grants: 0.
- Normalized authenticated table access is SELECT-only.
- Storage buckets: 2; objects: 27; metadata size total: 9,812,929 bytes.
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

The database restore intentionally excluded Supabase-managed Storage metadata:
the staging baseline currently has zero Storage buckets, zero Storage objects,
no restored ATSRS Storage policies, and `storage.objects` is not owned by the
Management API login role. Attempts to manufacture that managed baseline were
rolled back; bucket/object/policy synthetic residue is zero and business counts
remain 17/4/25.

The checked-in synthetic script now fails closed before any row write unless
the staging baseline has:

1. `storage.objects` RLS enabled;
2. the private `atsrs-user-files` bucket metadata;
3. authenticated owner-path SELECT/INSERT/UPDATE/DELETE policies.

When those prerequisites exist, the same transaction proves owner SELECT=1,
cross-user SELECT/UPDATE/DELETE=0 and anon SELECT=0, then rolls everything back.

## Gate

Stage 24 is not closed yet. The remaining external gate is one of:

- restore the managed Storage bucket/policy baseline into the approved staging
  project without copying production secrets or object bytes; or
- run the synthetic object lifecycle through an authenticated staging Storage
  API session.

Production data, RLS, grants, Storage objects and configuration were not
changed.
