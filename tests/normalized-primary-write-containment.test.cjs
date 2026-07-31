const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migration = fs.readFileSync(
  path.join(
    root,
    'supabase',
    'migrations',
    '20260730154540_contain_workspace_command_retry_storm.sql',
  ),
  'utf8',
);
const rollback = fs.readFileSync(
  path.join(
    root,
    'supabase',
    'activation',
    'normalized-primary-write-containment-rollback.sql',
  ),
  'utf8',
);
const staleRevisionForwardFix = fs.readFileSync(
  path.join(
    root,
    'supabase',
    'migrations',
    '20260730155715_reject_stale_workspace_revision_without_retry.sql',
  ),
  'utf8',
);
const runtime = fs.readFileSync(
  path.join(root, 'js', 'server-data.js'),
  'utf8',
);

assert.match(migration, /^begin;/m);
assert.match(migration, /commit;\s*$/);
assert.match(
  migration,
  /atsrs_apply_workspace_command_pre_containment_v1/,
);
assert.match(
  migration,
  /select command\.request_hash, command\.result[\s\S]*?current_revision <> p_expected_revision[\s\S]*?pg_try_advisory_xact_lock\(session_lock_key\)/,
  'replay and cheap stale rejection must precede session/workspace locks',
);
assert.match(migration, /auth\.jwt\(\) ->> 'session_id'/);
assert.match(migration, /ATSRS_SESSION_BUSY/);
assert.match(migration, /ATSRS_WORKSPACE_BUSY/);
assert.match(migration, /for update nowait/);
assert.match(migration, /set lock_timeout = '500ms'/);
assert.match(migration, /set statement_timeout = '6s'/);
assert.match(migration, /security definer[\s\S]*?set search_path = ''/);
assert.doesNotMatch(migration, /user_metadata/i);
assert.doesNotMatch(
  migration,
  /grant execute on function[\s\S]*?to (?:public|anon|service_role)/i,
);
assert.match(
  migration,
  /revoke all on function public\.atsrs_apply_workspace_command[\s\S]*?from public, anon, service_role/,
);
assert.match(
  migration,
  /grant execute on function public\.atsrs_apply_workspace_command[\s\S]*?to authenticated/,
);

assert.match(staleRevisionForwardFix, /^begin;/m);
assert.match(staleRevisionForwardFix, /commit;\s*$/);
assert.doesNotMatch(
  staleRevisionForwardFix,
  /errcode = '40001'[\s\S]*?message = 'ATSRS_STALE_REVISION'/,
  'stale revisions must not use retryable serialization-failure SQLSTATE',
);
assert.equal(
  (
    staleRevisionForwardFix.match(
      /errcode = 'P0001',\s*message = 'ATSRS_STALE_REVISION'/g,
    ) || []
  ).length,
  2,
  'both pre-lock and post-lock CAS guards must fail without retry',
);
assert.match(
  staleRevisionForwardFix,
  /security definer[\s\S]*?set search_path = ''/,
);
assert.match(
  staleRevisionForwardFix,
  /revoke all on function public\.atsrs_apply_workspace_command[\s\S]*?from public, anon, service_role/,
);
assert.match(
  staleRevisionForwardFix,
  /grant execute on function public\.atsrs_apply_workspace_command[\s\S]*?to authenticated/,
);

assert.match(runtime, /request=request\.retry\(false\)/);
assert.match(runtime, /function executeRpcWithTransientRetry\(/);
assert.match(runtime, /transientRetries/);
assert.match(runtime, /transientRetryDelay/);
assert.match(runtime, /function commandCircuitError\(/);
assert.match(runtime, /function recordCommandFailure\(/);
assert.match(runtime, /function isRateLimited\(/);
assert.match(runtime, /config\.rateLimitOpenMs/);
assert.match(runtime, /if\(isStaleRevision\(error\)\)/);
assert.match(runtime, /config\.staleOpenMs/);
assert.match(runtime, /if\(flushPromise\)return flushPromise/);
assert.match(runtime, /function retryFailedOperations\(/);
assert.doesNotMatch(
  runtime,
  /var staleRevision=isStaleRevision\(commandError\)/,
  'stale command responses must not enter an internal retry loop',
);

assert.match(rollback, /^begin;/m);
assert.match(
  rollback,
  /atsrs_apply_workspace_command_pre_containment_v1/,
);
assert.doesNotMatch(rollback, /delete from/i);
assert.doesNotMatch(rollback, /drop table/i);
assert.match(rollback, /commit;\s*$/);

console.log('normalized primary-write containment contracts passed');
