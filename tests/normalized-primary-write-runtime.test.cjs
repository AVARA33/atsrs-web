const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'server-data.js'), 'utf8');
const config = require(path.join(root, 'js', 'normalized-write-canary-config.js'));
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.equal(config.enabled, true);
assert.equal(config.primaryWrite, false);
assert.equal(config.allowAllScopes, false);
assert.equal(config.scopeHashes.length, 4);
assert.ok(config.scopeHashes.every((value) => /^[0-9a-f]{64}$/.test(value)));

assert.match(source, /atsrs_apply_workspace_command/);
assert.match(source, /p_operation_id:operationId/);
assert.match(source, /p_expected_revision:expected/);
assert.match(source, /ATSRS_STALE_REVISION/);
assert.match(source, /current_revision/);
assert.match(source, /rebaseBusinessValue/);
assert.match(source, /ATSRS_WRITE_CONFLICT/);
assert.match(source, /BroadcastChannel\('atsrs-normalized-write-revisions-v1'\)/);
assert.match(source, /rollout_stage:normalizedWriteCanaryRequested\(\)\?'canary':'default'/);
assert.match(source, /client_instance_hash:await sha256Hex\(instance\)/);
assert.doesNotMatch(source, /service_role/i);

assert.match(
  index,
  /normalized-write-canary-config\.js\?v=401[\s\S]*server-data\.js\?v=401/
);

console.log('normalized primary-write browser runtime contracts passed');
