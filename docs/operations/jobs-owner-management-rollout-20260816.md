# Jobs owner-management rollout — 16 Aug 2026

## Targets and data boundary

- Staging: `nsbmbbqgekcwmdqmqsao`
- Production: `hwtjuqyxzivymofamwxl`
- The migration creates `public.atsrs_jobs`; it does not update Auth users, workspaces, files, subscriptions, or recruiter/user records.
- The 10 V573 legacy vacancies are inserted idempotently from the repository fixture. Their recruiter contact and vacancy text are preserved.

## Pre-production evidence / backup

Before applying the migration, confirm the production project is `ACTIVE_HEALTHY`, record the migration list, and verify `to_regclass('public.atsrs_jobs') is null`. Existing production user tables are not exported or modified for this rollout.

After migration, record only schema-safe evidence: row count, status counts, grants, RLS/policy names, migration name, and advisor results. Do not print vacancy contacts or user rows in logs.

## Rollback

1. Roll the site back to the preceding frontend commit so clients stop querying the Jobs write API.
2. Preserve any post-launch vacancy data by quarantining rather than dropping it:

```sql
begin;
revoke all on table public.atsrs_jobs from public, anon, authenticated, service_role;
revoke all on function public.atsrs_jobs_admin_status() from public, anon, authenticated, service_role;
alter table public.atsrs_jobs rename to atsrs_jobs_rollback_20260816;
comment on table public.atsrs_jobs_rollback_20260816 is
  'Quarantined Jobs data retained during rollback; no Data API grants.';
drop function public.atsrs_jobs_admin_status();
commit;
```

3. Verify anon/authenticated have no privileges on the quarantined table and the V574 read-only frontend is live.
4. For a corrected rollout, migrate retained rows transactionally from the quarantined table; never recreate recruiter details from memory.

The private normalization/authorization helper functions may remain during a short rollback because they have no public Data API endpoint. Remove them only after confirming no policy or trigger dependency remains.
