const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const serverData = read('js/server-data.js');
const readRuntime = read('js/normalized-read-runtime.js');
const dualWrite = read(
  'supabase/migrations/20260729035118_prepare_workspace_dual_write.sql'
);
const auditSql = read('supabase/audit/normalized-primary-write-preflight.sql');
const report = read('docs/normalized-primary-write-preparation.md');

const normalizedTables = [
  'atsrs_workspace_projects',
  'atsrs_workspace_personnel',
  'atsrs_personnel_certificates',
  'atsrs_project_personnel'
];

assert.match(serverData, /var DATA_TABLE='atsrs_workspace_data'/);
assert.match(serverData, /function upsertStorageValue/);
assert.match(serverData, /\.eq\('updated_at',expected\)/);
assert.match(serverData, /function rebaseBusinessValue/);
assert.match(serverData, /if\(memoryStore\.has\(key\)&&sameValue\(memoryStore\.get\(key\),value\)\)return true/);
assert.match(serverData, /while\(passes<4\)/);

for (const table of normalizedTables) {
  assert.doesNotMatch(
    serverData,
    new RegExp(`\\.from\\(['"]${table}['"]\\)[\\s\\S]{0,240}\\.(?:insert|upsert|update|delete)\\(`)
  );
  assert.match(
    dualWrite,
    new RegExp(`revoke insert, update, delete[\\s\\S]{0,160}public\\.${table}[\\s\\S]{0,80}authenticated`, 'i')
  );
}

assert.match(
  dualWrite,
  /create trigger atsrs_workspace_data_normalized_shadow[\s\S]+?after insert or update or delete[\s\S]+?execute function atsrs_private\.sync_workspace_normalized_shadow\(\)/i
);
assert.doesNotMatch(
  dualWrite,
  /create trigger[\s\S]{0,160}on public\.(?:atsrs_workspace_projects|atsrs_workspace_personnel|atsrs_personnel_certificates|atsrs_project_personnel)/i
);
assert.doesNotMatch(readRuntime, /\.(?:insert|upsert|update|delete)\(/);

assert.doesNotMatch(
  auditSql,
  /\b(?:insert\s+into|update\s+public\.|delete\s+from|alter\s+|create\s+|drop\s+|grant\s+|revoke\s+|truncate\s+)\b/i
);
assert.match(auditSql, /normalized_reverse_triggers/);
assert.match(auditSql, /stable_ids_required/);

assert.match(report, /Stage 18: \*\*PASS and closed\*\*/);
assert.match(report, /Production normalized primary-write activation: \*\*NO-GO\*\*/);
assert.match(report, /normalized write → legacy JSON fallback/);
assert.match(report, /request\/idempotency UUID/);
assert.match(report, /expected workspace revision/);
assert.match(report, /does not use\s+user-editable `user_metadata`/);
assert.match(report, /zero `authenticated INSERT\/UPDATE\/DELETE` grants/);

console.log('normalized primary-write preparation contracts passed');
