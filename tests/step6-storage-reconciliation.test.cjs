const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const migration = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260816195500_storage_reconciliation_report.sql'),
  'utf8'
);
const operation = fs.readFileSync(
  path.join(root, 'scripts/operations/Get-AtsrsStorageReconciliation.ps1'),
  'utf8'
);

test('storage reconciliation is aggregate-only and service-role-only', () => {
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = ''/i);
  assert.match(migration, /revoke all on function[\s\S]*from authenticated/i);
  assert.match(migration, /grant execute on function[\s\S]*to service_role/i);
  assert.match(migration, /metadata_without_storage/i);
  assert.match(migration, /storage_without_metadata_older_than_24_hours/i);
  assert.doesNotMatch(migration, /delete\s+from\s+storage\.objects/i);
  assert.doesNotMatch(migration, /['"]storage_path['"]/i);
});

test('operations command stores only the aggregate report and clears its secret', () => {
  assert.match(operation, /rpc\/atsrs_storage_reconciliation_report/);
  assert.match(operation, /ConvertTo-Json -Depth 8 -Compress/);
  assert.match(operation, /finally\s*\{\s*\$serviceRole = \$null/);
  assert.doesNotMatch(operation, /Write-Output\s+.*serviceRole/i);
});
