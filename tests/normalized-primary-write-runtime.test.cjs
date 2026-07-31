const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'server-data.js'), 'utf8');
const policy = fs.readFileSync(
  path.join(root, 'js', 'workspace-command-policy.js'),
  'utf8',
);
const config = require(path.join(root, 'js', 'normalized-write-canary-config.js'));
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.equal(config.enabled, true);
assert.equal(config.primaryWrite, true);
assert.equal(config.requestTimeoutMs, 12000);
assert.equal(config.transientRetries, 2);
assert.equal(config.circuitFailureThreshold, 2);
assert.equal(config.circuitTransientOpenMs, 15000);
assert.equal(config.circuitStaleOpenMs, 120000);
assert.equal(config.circuitBusyOpenMs, 5000);
assert.equal(config.circuitRateLimitOpenMs, 30000);
assert.equal(config.allowAllScopes, false);
assert.equal(config.scopeHashes.length, 4);
assert.ok(config.scopeHashes.every((value) => /^[0-9a-f]{64}$/.test(value)));

assert.match(source, /atsrs_apply_workspace_command/);
assert.match(source, /ATSRS_TRANSPORT_TIMEOUT/);
assert.match(source, /Promise\.race\(\[Promise\.resolve\(request\),timeout\]\)/);
assert.match(source, /p_operation_id:operationId/);
assert.match(source, /p_expected_revision:expected/);
assert.match(policy, /ATSRS_STALE_REVISION/);
assert.match(source, /request=request\.retry\(false\)/);
assert.match(source, /function recordCommandFailure\(context,error\)/);
assert.match(source, /function retryFailedOperations\(\)/);
assert.match(source, /if\(flushPromise\)return flushPromise/);
assert.match(source, /ATSRS_CIRCUIT_OPEN/);
assert.doesNotMatch(
  source,
  /if\(!staleRevision&&!workspaceBusy\)throw commandError/
);
assert.match(source, /current_revision/);
assert.match(source, /rebaseBusinessValue/);
assert.match(policy, /ATSRS_WRITE_CONFLICT/);
assert.match(source, /ATSRSWorkspaceCommandPolicy/);
assert.match(source, /BroadcastChannel\('atsrs-normalized-write-revisions-v1'\)/);
assert.match(source, /rollout_stage:normalizedWriteCanaryRequested\(\)\?'canary':'default'/);
assert.match(source, /client_instance_hash:await sha256Hex\(instance\)/);
assert.doesNotMatch(source, /service_role/i);

assert.match(
  index,
  /normalized-write-canary-config\.js\?v=407[\s\S]*workspace-command-policy\.js\?v=407[\s\S]*reference-filter-state\.js\?v=409[\s\S]*server-data\.js\?v=409/
);
const app = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
assert.match(app, /selection=typeof selectedPersonnel==='function'/);
assert.match(app, /atsrsPersonnelId:selection\.id/);
assert.match(app, /ensureAtsrsId\(item\)/);
assert.doesNotMatch(
  app,
  /var person=.*?byId\('cPerson'\).*?\.value[\s\S]{0,200}var item=\{/,
);

console.log('normalized primary-write browser runtime contracts passed');
