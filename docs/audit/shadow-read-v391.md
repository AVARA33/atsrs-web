# V391 shadow-read release gate

Date: 2026-07-29

## Production snapshot audit

The comparator was run against the timestamped, restore-verified production
backup in `atsrs-retention-20260729-225939`. It audited all 17
`atsrs_workspace_data` rows across four workspace scopes.

- Personnel: source 4, target 4
- Certificates: source 25, target 25
- Projects: source 0, target 0
- Assignments: source 0, target 0
- Canonical mismatch: 0
- Skipped/ambiguous entity: 0
- Duplicate/orphan/workspace mismatch: 0

Privacy-safe report SHA-256:
`4A95A1CD91E4DE3BE016EBCB57C5FE828594A3FBEDF98A238688B6C8A7456F0D`.

## Staging rehearsal

The same comparator was run over the production backup that passed the actual
transactional restore rehearsal on staging project
`nsbmbbqgekcwmdqmqsao`. Results matched production at `4/25/0/0` with zero
mismatch and zero skipped entity.

Anonymous Data API checks exposed zero normalized rows. A temporary,
staging-only authenticated identity also exposed zero rows belonging to other
workspaces and was deleted immediately after the test. Four RLS owner-policy
contracts and the revocation of direct authenticated writes are covered by the
contract suite. No production database mutation was made.

Privacy-safe staging report SHA-256:
`7A1F8E1CA2E7290DE049719AFB1246ACAE5D289A3ED1B9B063274618C92DF9C0`.

## Gate

All 12 local contract/regression tests passed. V391 remains a read-only
parallel comparison: legacy JSON is authoritative, `stable_ids_required`
remains false, and no mismatch can write to UI state or database data.

Rollback is frontend-only: redeploy V390 commit
`c3c196081d0c0fd2fa32fd57f42c469835ad5f93`.
