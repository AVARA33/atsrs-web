# Service-role ACL reconciliation decisions

Status: read-only production audit plus repository evidence. No grant or revoke
was applied.

## Platform default evidence

The live `public` schema default ACL owned by `postgres` grants
`Dxtm` (`TRUNCATE`, `REFERENCES`, `TRIGGER`, `MAINTAIN`) on newly created
tables to `anon`, `authenticated` and `service_role`. The corresponding
`supabase_admin` default grants all table privileges.

The three audited migrations first create or reuse their tables, then explicitly
revoke client access where required and grant the service role the business
operations it needs. PostgreSQL `GRANT` adds privileges; it does not remove the
platform-default `Dxtm` privileges. This explains why the live `service_role`
ACL is broader than the explicit DML grant in each file.

`service_role` is used only inside Edge Functions. No service-role or secret key
is present in frontend JavaScript.

## Decisions

### `20260720192356_secure_profile_shares`

Decision: **accept live baseline**.

- Local intent: service role receives SELECT/INSERT/UPDATE/DELETE on
  `atsrs_profile_shares`, plus SELECT on `atsrs_workspace_data` and
  `atsrs_files`.
- Live delta: `atsrs_profile_shares` additionally has the platform-default
  `TRUNCATE/REFERENCES/TRIGGER/MAINTAIN`; the two pre-existing source tables
  retain their earlier ACLs.
- Code evidence: `share-profile` reads, upserts and updates profile shares and
  reads workspace/file data. It never exposes the privileged client to the
  browser.
- Security result: public/anon/authenticated were explicitly revoked from the
  share table and its service policy is scoped to `service_role`. Revoking
  platform-default service privileges is not required to reproduce production
  behavior and would not materially reduce the risk of a leaked service key,
  which already bypasses RLS.

### `20260723170000_talent_actions_workspace_access`

Decision: **accept live baseline**.

- Local intent: add service-role SELECT on `atsrs_workspaces` and `atsrs_files`.
- Live delta: both tables already carry platform/earlier-migration privileges;
  this migration did not originate them.
- Code evidence: `talent-profile-actions` performs workspace/profile/link/file
  lookups and mutations through its backend admin client. The specific
  workspace/file addition is SELECT-only and is required for authorization and
  document access checks.
- Security result: no revoke can be attributed safely to this migration.

### `20260726223000_ai_cv_generation_quota`

Decision: **accept live baseline**.

- Local intent: service role receives SELECT/INSERT/UPDATE/DELETE on
  `atsrs_ai_cv_usage` and EXECUTE on the two quota RPCs.
- Live functions expose EXECUTE only to `postgres` and `service_role`.
- Live table delta: service role also receives the platform-default
  `TRUNCATE/REFERENCES/TRIGGER/MAINTAIN`.
- Code evidence: `generate-cv` calls both quota RPCs; the SECURITY INVOKER RPCs
  require the caller's underlying table privileges. Reserve performs
  SELECT/INSERT/UPDATE and release performs UPDATE.
- Security result: no client role can access the table or RPCs. No correction
  migration is justified.

## Conclusion

All three differences are explained by verified platform defaults or
pre-existing table ACL ownership. Their repository migrations accurately
describe the business grants. Status for all three is `accept live baseline`;
no security-correction migration or rollback SQL is needed.
