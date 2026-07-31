const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migration = fs.readFileSync(
  path.join(
    root,
    'supabase',
    'migrations',
    '20260730133558_bound_workspace_command_locking.sql',
  ),
  'utf8',
);
const rollback = fs.readFileSync(
  path.join(
    root,
    'supabase',
    'activation',
    'normalized-primary-write-locking-rollback.sql',
  ),
  'utf8',
);
const runtime = fs.readFileSync(
  path.join(root, 'js', 'server-data.js'),
  'utf8',
);
const harness = fs.readFileSync(
  path.join(root, 'scripts', 'stage19-staging-rpc-harness.cjs'),
  'utf8',
);

assert.match(migration, /^begin;/m);
assert.match(migration, /commit;\s*$/);
assert.match(
  migration,
  /atsrs_apply_workspace_command_pre_lock_v1/,
);
assert.match(
  migration,
  /select command\.request_hash, command\.result[\s\S]*?pg_try_advisory_xact_lock/,
  'committed replay must be resolved before workspace serialization',
);
assert.match(migration, /pg_try_advisory_xact_lock\(lock_key\)/);
assert.match(migration, /for update nowait/);
assert.match(migration, /ATSRS_WORKSPACE_BUSY/);
assert.match(migration, /set lock_timeout = '1s'/);
assert.match(migration, /set statement_timeout = '8s'/);
assert.match(
  migration,
  /create or replace function public\.atsrs_get_workspace_command_revision/,
);
assert.match(
  migration,
  /security definer[\s\S]*?set search_path = ''/,
);
assert.match(migration, /auth\.uid\(\)/);
assert.doesNotMatch(migration, /user_metadata/i);
assert.match(
  migration,
  /revoke all on function public\.atsrs_get_workspace_command_revision\(text\)[\s\S]*?from public, anon, service_role/,
);
assert.match(
  migration,
  /grant execute on function public\.atsrs_get_workspace_command_revision\(text\)[\s\S]*?to authenticated/,
);
assert.doesNotMatch(
  migration,
  /grant execute[\s\S]*?to (?:public|anon|service_role)/i,
);

assert.match(runtime, /function loadFreshCommandRevision\(context,key\)/);
assert.match(runtime, /navigator&&window\.navigator\.locks/);
assert.match(runtime, /locks\.request\(/);
assert.match(runtime, /ATSRS_COMMAND_LOCK_TIMEOUT/);
assert.match(runtime, /function isWorkspaceBusy\(error\)/);
assert.match(runtime, /if\(isWorkspaceBusy\(error\)\)[\s\S]*?openCommandCircuit/);
assert.doesNotMatch(
  runtime,
  /workspaceBusy[\s\S]*?await loadFreshCommandRevision\(context,key\)/,
);
assert.match(runtime, /atsrs_get_workspace_command_revision/);
assert.match(
  runtime,
  /var freshRevision=await loadFreshCommandRevision\(context,key\)/,
);
assert.match(runtime, /candidate=rebaseBusinessValue\(key,freshValue,mergeBase,candidate\)/);
assert.match(runtime, /ATSRS_REVISION_TIMEOUT/);
assert.doesNotMatch(runtime, /service_role/i);

assert.match(harness, /revision-fetch-start/);
assert.match(harness, /revision-fetch-complete/);
assert.match(harness, /workspace-lock-acquired/);
assert.match(harness, /navigator\.locks\.request/);
assert.match(harness, /scenario === 'suite'/);
assert.match(harness, /const rpcFetch = async \(functionName, body\)/);
for (const suiteGate of [
  'SUITE_CREATE',
  'SUITE_REPLAY',
  'SUITE_NO_OP',
  'SUITE_UPDATE',
  'SUITE_STALE_REVISION',
  'SUITE_CONCURRENCY_GUARD',
  'SUITE_STALE_RATE_GUARD',
  'SUITE_OFFLINE_RECONNECT',
  'SUITE_ATOMIC_FAILURE',
  'SUITE_DELETE'
]) {
  assert.match(harness, new RegExp(suiteGate));
}
assert.match(harness, /p_expected_revision:\s*freshRevision/);
assert.match(harness, /test_scope: 'rpc_server_rehearsal'/);
assert.match(harness, /method: 'DELETE'/);

assert.match(rollback, /^begin;/m);
assert.match(
  rollback,
  /drop function if exists[\s\S]*?atsrs_get_workspace_command_revision/,
);
assert.match(
  rollback,
  /atsrs_apply_workspace_command_pre_lock_v1[\s\S]*?rename to atsrs_apply_workspace_command/,
);
assert.match(rollback, /set schema public/);
assert.doesNotMatch(rollback, /delete from public\.atsrs_workspace_data/i);
assert.doesNotMatch(rollback, /drop table/i);
assert.match(rollback, /commit;\s*$/);

console.log('normalized primary-write locking contracts passed');
