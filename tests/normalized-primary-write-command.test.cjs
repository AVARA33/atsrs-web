const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repo = path.resolve(__dirname, '..');
const migration = fs.readFileSync(
  path.join(
    repo,
    'supabase/migrations/20260730061019_normalized_primary_write_command_contract.sql',
  ),
  'utf8',
);
const rollback = fs.readFileSync(
  path.join(repo, 'supabase/activation/normalized-primary-write-command-rollback.sql'),
  'utf8',
);
const report = fs.readFileSync(
  path.join(repo, 'docs/normalized-primary-write-command-contract.md'),
  'utf8',
);

assert.match(migration, /create table if not exists atsrs_private\.workspace_write_revisions/i);
assert.match(migration, /primary key \(workspace_user_id, workspace_account_type\)/i);
assert.match(migration, /create table if not exists atsrs_private\.workspace_write_commands/i);
assert.match(migration, /operation_id uuid not null/i);
assert.match(migration, /request_hash text not null/i);
assert.match(migration, /client_build text not null/i);
assert.match(migration, /audit_metadata jsonb not null/i);
assert.doesNotMatch(
  migration.match(/create table if not exists atsrs_private\.workspace_write_commands[\s\S]*?\);/i)[0],
  /\b(payload|operations)\s+jsonb/i,
  'command ledger must not retain raw payloads',
);

assert.match(migration, /create or replace function public\.atsrs_apply_workspace_command/i);
assert.match(migration, /security definer[\s\S]*?set search_path = ''/i);
assert.match(migration, /auth\.uid\(\)/i);
assert.doesNotMatch(migration, /user_metadata/i);
assert.match(migration, /ATSRS_STALE_REVISION/i);
assert.match(migration, /ATSRS_IDEMPOTENCY_CONFLICT/i);
assert.match(migration, /ATSRS_PARITY_MISMATCH/i);
assert.match(migration, /ATSRS_FILE_OWNERSHIP_MISMATCH/i);
assert.match(migration, /set lock_timeout = '3s'/i);
assert.match(migration, /set statement_timeout = '10s'/i);
assert.match(migration, /atsrs\.primary_write_managed/i);
assert.match(
  migration,
  /tg_op = 'DELETE'[\s\S]*?not exists[\s\S]*?from public\.atsrs_workspaces/i,
  'workspace cascade teardown must not recreate revision state',
);

assert.match(
  migration,
  /revoke all on function public\.atsrs_apply_workspace_command[\s\S]*?from public, anon, service_role/i,
);
assert.match(
  migration,
  /grant execute on function public\.atsrs_apply_workspace_command[\s\S]*?to authenticated/i,
);
assert.match(
  migration,
  /revoke insert, update, delete on table[\s\S]*?from anon, authenticated/i,
);
assert.doesNotMatch(migration, /grant\s+(insert|update|delete)[\s\S]*?to authenticated/i);

assert.match(rollback, /revoke all on function public\.atsrs_apply_workspace_command/i);
assert.match(rollback, /retain private tables and use forward recovery/i);
assert.doesNotMatch(rollback, /delete from public\.atsrs_workspace_data/i);
assert.doesNotMatch(rollback, /drop table public\./i);

assert.match(report, /staging rehearsal only/i);
assert.match(report, /staging synthetic[\s\S]*admin\/test workspace[\s\S]*selected real workspace/i);
assert.match(report, /allowlist and measured percentage rollout/i);
assert.match(report, /Raw payloads\s+and PII are never stored/i);
assert.match(report, /Edge Function[\s\S]*must not be treated as a multi-statement transaction/i);

console.log('normalized primary-write command contract tests passed');
