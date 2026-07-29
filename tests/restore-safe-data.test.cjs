const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  sha256,
  stripWorkspace,
  transformSql,
} = require('../scripts/staging/build-restore-safe-data.cjs');

const insert = (key, marker) =>
  `INSERT INTO "public"."atsrs_workspace_data" ("user_id", "account_type", "data_key", "payload", "updated_at") VALUES ('00000000-0000-0000-0000-00000000000${marker}', 'personal', '${key}', '{"value":"{}"}', '2026-07-29');`;

const fixture = [
  '-- before',
  insert('atsrs_user_personal_certs', '1'),
  insert('__cloud_data_migration_v2', '2'),
  insert('atsrs_user_personal_profile', '3'),
  insert('atsrs_user_company_personnel', '4'),
  '-- after',
  '',
].join('\n');

const result = transformSql(fixture, 4);
const outputLines = result.output.split('\n').filter(line => line.startsWith('INSERT INTO'));
assert.match(outputLines[0], /personal_profile/);
assert.match(outputLines[1], /company_personnel/);
assert.match(outputLines[2], /personal_certs/);
assert.match(outputLines[3], /__cloud_data_migration_v2/);
assert.equal(stripWorkspace(fixture), stripWorkspace(result.output));
assert.equal(
  sha256(
    fixture
      .split('\n')
      .filter(line => line.startsWith('INSERT INTO'))
      .map(sha256)
      .sort()
      .join('\n'),
  ),
  result.statementMultisetSha256,
);

const rawPath = process.env.ATSRS_RAW_DATA_BACKUP;
const safePath = process.env.ATSRS_RESTORE_SAFE_DATA_BACKUP;
if (rawPath || safePath) {
  assert.ok(rawPath && safePath, 'both data artifact paths are required');
  const raw = fs.readFileSync(path.resolve(rawPath), 'utf8');
  const safe = fs.readFileSync(path.resolve(safePath), 'utf8');
  const artifact = transformSql(raw);
  assert.equal(artifact.output, safe);
  assert.equal(artifact.workspaceStatements, 17);
  assert.equal(stripWorkspace(raw), stripWorkspace(safe));
}

console.log('restore-safe data ordering and diff contract tests passed');
