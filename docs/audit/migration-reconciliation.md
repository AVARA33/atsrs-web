# ATSRS migration reconciliation manifest

Status: evidence and proposed actions only. No `migration repair`, `db push` or
SQL apply has been executed.

Hash rule: MD5 of SQL after trimming the file and collapsing every whitespace
run to one space. The hash is a lexical reconciliation signal, not a substitute
for object-definition verification.

## Repository reconciliation status

- The 28 exact remote migration files were fetched into the repo-external audit
  directory
  `C:\Users\user\Documents\GitHub\output\atsrs-migration-reconciliation-fetch-20260729-153500`.
- All 28 remote files are now represented under their exact remote versions and
  names in `supabase/migrations`.
- The 18 reviewed local timestamp aliases were removed. Their Git history is
  the rollback point.
- `tests/migration-repository-state.test.cjs` pins the canonical SHA-256 of all
  28 remote files, rejects every retired alias and verifies the local-only
  migration set.
- The table below preserves the original audit evidence. Its old “proposed
  action” text documents why each repository move was made; the moves are now
  complete locally and have not changed remote history.
- A fresh read-only `migration list --linked` reports 28 matched versions and
  these eight local-only versions:
  `20260720192356`, `20260721191000`, `20260723140000`,
  `20260723170000`, `20260726223000`, `20260729041619`,
  `20260729105130`, `20260729105131`.

## Remote history and local equivalents

| Remote version | Remote name | Local equivalent | Remote hash | Local hash | Evidence / exact delta | Proposed action | Confidence |
|---|---|---|---|---|---|---|---|
| 20260718220449 | create_expiry_notification_foundation | none | `3e8007f8d4335b961ceb115a61584f20` | — | Notification tables/RLS/policies/triggers exist. Queue function was later changed outside history. | Fetch exact remote SQL; keep as historical truth. | medium |
| 20260718221136 | tighten_notification_table_grants | none | `3608536c5c488bb4cfa98e13beb1b1eb` | — | Current anon/outbox denials verified. | Fetch exact remote SQL. | high |
| 20260718221245 | document_notification_outbox_client_denial | none | `5b3c0410a148009bd7bcbbb9214b97b3` | — | Deny policy exists with `USING false` and `WITH CHECK false`. | Fetch exact remote SQL. | high |
| 20260718221329 | secure_rls_event_trigger_function | none | `e53ceefd7247bb73e3d9c019cb2fd40f` | — | `public.rls_auto_enable()` is not executable by public/anon/authenticated. | Fetch exact remote SQL. | high |
| 20260719160405 | v240_expiry_notification_stages | none | `f82a5ec4bd81cfae15f0b40def87da99` | — | Live queue function body does not match V240; it matches `supabase/v242_detailed_expiry_notifications.sql` body MD5 `a64e5d651e5536a4c704bf9cbb87b497`. | Fetch exact V240 SQL and create a separately generated baseline migration for the live V242 delta before any repair. | blocked |
| 20260721044053 | secure_share_access_requests | 20260721090000 | `e380cb0b183a14f922a2b11d21f95c91` | `35d92ac53b5647ea2302147e6f05c18a` | Local adds expiry backfill and `atsrs_share_events_request_idx`; both are already live. | Use exact remote timestamp/text; split the proven local delta into a new idempotent baseline migration. | medium |
| 20260722144856 | plan_quotas | 20260722120000 | `137691f106bb0ae915321a8ede0dd127` | same | SQL identical; timestamp differs. | Replace filename with exact remote version only after a reviewed reconciliation commit. | high |
| 20260722145016 | harden_ai_quota_rpc | 20260722121500 | `a7daecc6b9979c58bf45db3b8e1d23ec` | same | SQL identical; timestamp differs. | Use remote version. | high |
| 20260722152910 | share_access_revocation | 20260722183000 | `111415129891cb586a012c1e7d9f1cd5` | same | SQL identical; timestamp differs. | Use remote version. | high |
| 20260722185521 | talent_directory | 20260722200000 | `5985ea5ad610ef51fa4cb8a39098c3e3` | same | SQL identical; timestamp differs. | Use remote version. | high |
| 20260722194551 | one_time_share_downloads | 20260722213000 | `b3bacf02ff68e400350b19f22d231598` | `2c5bdf78e8cf25054f34e2116dab8849` | Executable SQL equivalent; local has two extra comments. | Use exact remote text/version; retain comments in documentation if desired. | high |
| 20260722210553 | talent_profile_actions | 20260722220000 | `b02740dafb4a3103e87780ea99ba8714` | same | SQL identical after normalization; timestamp differs. | Use remote version. | high |
| 20260723031945 | work_availability_and_system_status | 20260723093000 | `45852d9ae3328a5cd079f5d636b58bf0` | `7d1192a1dd5ac0c7abaed6a7acf4b03e` | Whitespace/layout-only difference; executable SQL equivalent. | Use exact remote text/version. | high |
| 20260723034044 | multi_work_preferences | 20260723110000 | `3659684caa4424ac16f608cd0ac88e21` | same | SQL identical; timestamp differs. | Use remote version. | high |
| 20260723035731 | linked_corporate_personnel | 20260723123000 | `9d70f7ad4ee333cd2a58e8dcf554e966` | same | SQL identical; timestamp differs. | Use remote version. | high |
| 20260723125234 | talent_official_profile_details | 20260723180000 | `8b948380e21fea2d3ff1de17fcadc816` | same | SQL identical; timestamp differs. | Use remote version. | high |
| 20260723132002 | add_talent_whatsapp_profile_fields | 20260723183000 | `e62b1c8bac243c8b2963e8ee766ab4b8` | same | SQL identical; local name omits `add_`. | Use exact remote version/name. | high |
| 20260723200035 | talent_profile_visibility | 20260723230000 | `02fda3a698f5656d040b05a1c3ecddad` | same | SQL identical; timestamp differs. | Use remote version. | high |
| 20260723200355 | enforce_talent_profile_visibility | 20260723231500 | `4cb7c9a28a468638e3ed33a73dafc07f` | same | SQL identical; timestamp differs. | Use remote version. | high |
| 20260723205032 | v317_admin_overview | none | `06b3b9b5e4d57662a1f8c7368e25a44b` | — | Three tables/RLS and function body MD5 `e1b85b744817830c843eac32dd4739a0` verified. Existing advisor warns that authenticated can execute this SECURITY DEFINER RPC. | Fetch exact remote SQL; keep advisor warning as an explicit pre-existing risk. | high |
| 20260724110719 | corporate_sent_download_requests | 20260724153000 | `85f9bfb7c43076f52a73f2999ed5ea05` | same | SQL identical; timestamp differs. | Use remote version. | high |
| 20260724112227 | talent_message_archive | 20260724170000 | `35a3350caa9b74cfffbef7ad3784f81c` | same | SQL identical; timestamp differs. | Use remote version. | high |
| 20260727120924 | whatsapp_webhook_events | 20260727193000 | `f59c0827c54c7c1b6269d24bedff8ece` | same | SQL identical; timestamp differs. | Use remote version. | high |
| 20260727131449 | grant_whatsapp_webhook_service_role_access | none | `424bf315e156d744442524a0507590f4` | — | Table SELECT/INSERT/UPDATE and sequence USAGE/SELECT verified. | Fetch exact remote SQL. | high |
| 20260727134155 | whatsapp_verification | 20260727200000 | `7e9af4ca7ba4cac43b912493174293ac` | same | SQL identical; timestamp differs. | Use remote version. | high |
| 20260729005912 | normalize_workspace_operations | same version | `8ce08ca76cba410291941f6cf0f4314f` | `18f018cb9665e5425f7122b4563b1425` | Local has one history comment; executable SQL is equal. | Keep version; optionally use exact remote text in reconciliation commit. | high |
| 20260729013053 | backfill_normalized_workspace_data | same version | `02ceaf300249f7bc80f43251b2935b54` | same | Exact normalized match. | No action. | high |
| 20260729035118 | prepare_workspace_dual_write | same version | `db91508250fb6ce73492e764f78b4439` | same | Exact normalized match; enabled synchronous AFTER trigger verified. | No action. | high |

## Local versions without remote history

| Local version | Name | Live definition evidence | Proposed history action | Rollback reference | Status |
|---|---|---|---|---|---|
| 20260720192356 | secure_profile_shares | Columns/defaults, constraints, three indexes, comments, RLS and service policy match. Extra `Dxtm` service privileges are proven PostgreSQL/Supabase default ACLs. | Mark `applied` only after staging restore and a fresh production backup; do not replay DDL. | Fresh history export + inverse `reverted` repair only; no schema DDL. | accept live baseline |
| 20260721191000 | delete_own_expiry_notifications | DELETE grant and exact owner policy verified. | Mark `applied` after fresh snapshot/history export. | Inverse history repair. | proven |
| 20260723140000 | profile_photos | `avatar_url`, bucket configuration and all four storage policies verified. | Mark `applied` after fresh snapshot/history export. | Inverse history repair. | proven |
| 20260723170000 | talent_actions_workspace_access | Required service-role SELECT grants verified; other live table privileges predate this migration or come from platform defaults. | Mark `applied` only after staging restore and fresh backup. | Inverse history repair. | accept live baseline |
| 20260726223000 | ai_cv_generation_quota | Table/defaults/FK/check/RLS verified; function body MD5s match (`fcaf57…`, `e3b22f…`). Extra service-role `Dxtm` privileges are platform defaults; RPC use is proven in `generate-cv`. | Mark `applied` only after staging restore and fresh backup. | Inverse history repair. | accept live baseline |
| 20260729041619 | stable_workspace_entity_ids | Not present remotely; runtime flag/table columns absent. | Must remain the single pending executable migration after reconciliation. | Feature flag off; non-destructive forward recovery; verified DB snapshot for data recovery. | pending |
| 20260729105130 | baseline_v242_detailed_expiry_notifications | Function body is byte-identical to live: length `4869`, MD5 `6580d4330f1f405bdbf14183b41aa37e`; SECURITY DEFINER, empty search path and owner-only EXECUTE verified. | Mark `applied` only after staging proves clean-history reproduction; do not replay on current production. | Inverse history repair; production function remains unchanged. | locally proven baseline |
| 20260729105131 | baseline_secure_share_live_delta | Live has zero null expiry, required `share_token_hash` contract and both exact indexes. Baseline is repeat-safe and refuses invalid existing rows. | Mark `applied` only after staging restore; do not replay on current production. | Inverse history repair; no production data change. | locally proven baseline |

## Exact proposed history sequence

No command below is authorized in this phase.

1. **Completed locally:** import the exact 28 remote files, retire the 18
   timestamp aliases, and pin their hashes.
2. **Completed locally:** create the V242 and secure-share baselines with
   `supabase migration new`.
3. **External gate:** restore the approved backup to staging and replay the
   repository migrations. Verify exact schema, data, ACL, function and trigger
   results.
4. Take a fresh production code ZIP, database snapshot and migration-history
   export.
5. Only if staging and the fresh production definition audit are exact, mark
   these local-only versions `applied` without replaying DDL:
   `20260720192356`, `20260721191000`, `20260723140000`,
   `20260723170000`, `20260726223000`, `20260729105130`,
   `20260729105131`.
6. Run `migration list` and `db push --dry-run`. The only pending executable
   version must be `20260729041619`; any other output is a stop condition.

No history repair is authorized until the staging gate in step 3 succeeds.
