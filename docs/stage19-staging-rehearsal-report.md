# Stage 19 staging rehearsal report

Date: 2026-07-30
Staging: `nsbmbbqgekcwmdqmqsao`
Production (read-only): `hwtjuqyxzivymofamwxl`

## Decision

The atomic command contract is installed and functionally rehearsed on
staging. The remaining lock-timeout gate was completed with two real,
independent sessions against a disposable local PostgreSQL 17.10 instance.
The Stage 19 database/API contract is therefore **GO for production activation
review**. This is not production apply or deploy approval. No production
migration or frontend deploy occurred.

## Applied staging objects

- migration
  `20260730061019_normalized_primary_write_command_contract.sql`;
- private workspace revision and idempotency/audit tables;
- legacy-write revision trigger;
- private parity validator;
- one authenticated RPC;
- non-destructive rollback script.

The first staging candidate exposed a real cascade-teardown defect in the new
revision trigger. Synthetic residue was explicitly cleared, the Stage 19
objects were rolled back, staging history was marked reverted, and the
corrected migration was dry-run and reapplied. The corrected trigger does not
recreate revision state after its workspace parent has been removed.

## Passed gates

- project refs checked twice before every CLI mutation;
- migration dry-run showed only `20260730061019`;
- create/update/delete for project, personnel, certificate, and assignment;
- Personal profile and Personal certificate graph;
- exact duplicate request returns the original result;
- same operation ID with different content rejects;
- stale revision and same-field race reject;
- no-op changes no business row and does not advance revision;
- three concurrent same-revision commands: one commit, two stale rejects;
- offline replay of the winning operation returns the original result;
- relationship, certificate owner, exact file ownership, and parity rollback;
- unsafe audit metadata rejects; command ledger stores no raw payload or PII;
- anon RPC execution denied;
- RPC execute role is exactly `authenticated`;
- normalized authenticated/anon write grants remain zero;
- private tables have RLS and zero browser/service-role table grants;
- fixed empty `search_path` on every definer function;
- `stable_ids_required=false`;
- synthetic business, auth, command, trigger, and revision residue zero;
- full feature rollback was applied once and the corrected migration was
  reapplied;
- two-session lock contention: session A held the workspace revision row for
  more than six seconds; session B failed after 3.05 seconds with
  `canceling statement due to lock timeout`;
- timeout transaction residue was exactly zero for revision, command ledger,
  normalized graph, and legacy mirror;
- after session A released the lock, a clean retry committed revision 1 and
  exact operation replay returned the same result without a second write;
- indexed revision/idempotency plans and waiting lock count zero;
- security/performance advisors have no new critical finding.

The advisor reports an expected warning for the authenticated
`SECURITY DEFINER` RPC. It is intentional because direct table DML remains
closed. The RPC has an empty search path, schema-qualified objects, internal
`auth.uid()` ownership checks, and execute revoked from PUBLIC, anon, and
service_role. The two private no-policy notices are informational and
intentional: the tables are outside the exposed API surface and all browser
grants are revoked.

## Baselines after rehearsal

- staging business counts: `17/4/25/0/0`;
- stable-ID source/target canonical hashes: exact match for all four entity
  groups;
- duplicate/orphan/workspace mismatch: `0/0/0`;
- synthetic commands and non-zero revisions: `0/0`;
- normalized browser write grants: `0`;
- RPC execute surface: `authenticated` plus database owner only;
- staging migration count/head: `37 /
  20260730061019_normalized_primary_write_command_contract`;
- production counts and hashes: unchanged;
- production migration count/head: `36 /
  20260729105131_baseline_secure_share_live_delta`;
- production Stage 19 objects: `0`.

## Lock-timeout infrastructure note

`supabase db query --linked` uses the Management API and did not preserve a
long-lived row lock across the submitted statements. It was not reused for
the concurrency proof. Direct staging database credentials were neither
requested nor exposed. The equivalent PostgreSQL transaction contract was
instead exercised with official PostgreSQL 17.10 client/server binaries on
localhost, using the same composite workspace revision key, `FOR UPDATE`,
three-second `lock_timeout`, idempotency ledger, normalized write, and legacy
mirror semantics. The harness and logs are retained under the Stage 19 backup
folder.

## Separate risk

Account/auth-user cascade deletion exposed a pre-existing FK action-order
issue involving the linked personnel row. Entity-graph deletion through the
Stage 19 command passed. Auth-account deletion is not part of primary-write
rollout and remains a separate migration/security scope.

The Stage 19 package is ready for production activation review while
`stable_ids_required=false`, legacy mirroring, and the documented rollback
boundary remain mandatory.
