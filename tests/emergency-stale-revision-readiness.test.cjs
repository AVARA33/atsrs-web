const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const forward = fs.readFileSync(
  path.join(
    root,
    'supabase',
    'activation',
    'emergency-stale-revision-nonretryable.sql',
  ),
  'utf8',
);
const rollback = fs.readFileSync(
  path.join(
    root,
    'supabase',
    'activation',
    'emergency-stale-revision-nonretryable-rollback.sql',
  ),
  'utf8',
);

for (const sql of [forward, rollback]) {
  assert.match(sql, /^begin;/m);
  assert.match(sql, /set local lock_timeout = '250ms'/);
  assert.match(sql, /set local statement_timeout = '5s'/);
  assert.match(sql, /eligible_match_count <> 1/);
  assert.match(sql, /security|revoke all on function/i);
  assert.match(
    sql,
    /revoke all on function public\.atsrs_apply_workspace_command[\s\S]*?from public, anon, service_role/,
  );
  assert.match(
    sql,
    /grant execute on function public\.atsrs_apply_workspace_command[\s\S]*?to authenticated/,
  );
  assert.doesNotMatch(sql, /\b(?:insert|update|delete)\s+(?:into|from)?\s*public\./i);
  assert.doesNotMatch(sql, /drop\s+(?:table|column|schema)/i);
  assert.match(sql, /commit;\s*$/);
}

assert.match(
  forward,
  /errcode = ''40001''[\s\S]*?message = ''ATSRS_STALE_REVISION''/,
);
assert.match(forward, /'errcode = ''P0001''\\1'/);
assert.match(
  rollback,
  /errcode = ''P0001''[\s\S]*?message = ''ATSRS_STALE_REVISION''/,
);
assert.match(rollback, /'errcode = ''40001''\\1'/);

console.log('emergency stale-revision readiness contracts passed');
