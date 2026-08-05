const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'js', 'stability-runtime.js'), 'utf8');
const runbook = fs.readFileSync(path.join(root, 'docs', 'stable-id-production-activation.md'), 'utf8');

const version = index.match(/data-atsrs-build="(V\d+)"/)?.[1];
const update = index.match(/data-atsrs-update="([^"]+)"/)?.[1];
assert.equal(version, 'V419');
assert.equal(update, '5 Aug 2026');

for (const asset of [
  'stability-runtime.js',
  'stable-id-compatibility-config.js',
  'stable-id-compatibility-runtime.js',
  'normalized-write-canary-config.js',
  'workspace-command-policy.js',
  'shadow-read.js',
  'normalized-read-adapter.js',
  'normalized-read-canary-config.js',
  'normalized-read-runtime.js',
  'share-profile.js',
  'workspace-switcher.js'
]) {
  assert.match(index, new RegExp(`src="js/${asset.replace('.', '\\.')}\\?v=409"`));
}

assert.match(index, /src="js\/dashboard\.js\?v=418"/);
assert.match(index, /href="css\/account\.css\?v=419"/);

for (const asset of [
  'reference-filter-state.js',
  'server-data.js',
  'documents.js',
  'account.js'
]) {
  assert.match(index, new RegExp(`src="js/${asset.replace('.', '\\.')}\\?v=410"`));
}

assert.match(index, /src="js\/app\.js\?v=416"/);
assert.match(index, /src="js\/boot-refresh\.js\?v=412"/);
assert.match(index, /src="js\/storage\.js\?v=417"/);
assert.match(index, /href="css\/corporate-information-architecture\.css\?v=417"/);

assert.match(runtime, /document\.documentElement\.dataset\.atsrsBuild/);
assert.match(runtime, /document\.documentElement\.dataset\.atsrsUpdate/);
assert.doesNotMatch(runtime, /ATSRS V385|28 Jul 2026/);
assert.doesNotMatch(index, /ATSRS V385|Last Update: 28 Jul 2026/);
assert.match(runbook, /Frontend release: V390/);

console.log('V419 build marker consistency tests passed');
