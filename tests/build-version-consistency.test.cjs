const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'js', 'stability-runtime.js'), 'utf8');
const bootRefresh = fs.readFileSync(path.join(root, 'js', 'boot-refresh.js'), 'utf8');
const runbook = fs.readFileSync(path.join(root, 'docs', 'stable-id-production-activation.md'), 'utf8');

const version = index.match(/data-atsrs-build="(V\d+)"/)?.[1];
const update = index.match(/data-atsrs-update="([^"]+)"/)?.[1];
assert.equal(version, 'V468');
assert.equal(update, '11 Aug 2026');

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
assert.match(index, /href="css\/dashboard\.css\?v=447"/);
assert.match(index, /href="css\/account\.css\?v=420"/);

for (const asset of [
  'reference-filter-state.js',
  'server-data.js',
  'documents.js',
  'account.js'
]) {
  assert.match(index, new RegExp(`src="js/${asset.replace('.', '\\.')}\\?v=410"`));
}

assert.match(index, /src="js\/app\.js\?v=468"/);
assert.match(index, /src="js\/boot-refresh\.js\?v=442"/);
assert.match(index, /src="js\/storage\.js\?v=467"/);
assert.match(index, /src="js\/auth\.js\?v=459"/);
assert.match(index, /href="css\/corporate-information-architecture\.css\?v=421"/);
assert.match(index, /href="css\/personal-workspace-surface\.css\?v=436"/);
assert.match(index, /href="css\/personal-dashboard-qa\.css\?v=449"/);
assert.match(index, /href="css\/recipient-links\.css\?v=433"/);
assert.match(index, /src="js\/recipient-links\.js\?v=433"/);
assert.match(index, /src="js\/corporate-information-architecture\.js\?v=444"/);
assert.match(index, /src="js\/corporate-remediation\.js\?v=444"/);
assert.match(index, /href="vendor\/phosphor-icons\/phosphor-regular\.css\?v=441"/);
assert.match(index, /href="css\/shell-polish\.css\?v=462"/);
assert.match(index, /src="js\/shell-polish\.js\?v=447"/);
assert.match(index, /href="css\/public-landing\.css\?v=468"/);
assert.match(index, /src="js\/public-landing\.js\?v=459"/);
assert.match(index, /href="css\/product-experience\.css\?v=447"/);
assert.match(index, /src="js\/product-experience\.js\?v=447"/);
assert.match(index, /src="js\/talent-directory\.js\?v=447"/);
assert.match(index, /src="js\/corporate-reporting\.js\?v=447"/);

assert.match(runtime, /document\.documentElement\.dataset\.atsrsBuild/);
assert.match(runtime, /document\.documentElement\.dataset\.atsrsUpdate/);
assert.doesNotMatch(runtime, /ATSRS V385|28 Jul 2026/);
assert.doesNotMatch(index, /ATSRS V385|Last Update: 28 Jul 2026/);
assert.match(index, /function hardUnlockBoot\(\)/);
assert.match(index, /classList\.remove\('atsrs-session-pending'\)/);
assert.match(index, /setTimeout\(hardUnlockBoot,5000\)/);
assert.match(index, /window\.addEventListener\('error',function\(\)\{setTimeout\(hardUnlockBoot,0\);\}\)/);
assert.match(runbook, /Frontend release: V390/);
assert.match(bootRefresh, /BOOT_DEADLINE_MS=5000/);
assert.match(bootRefresh, /visibilitychange/);
assert.match(bootRefresh, /window\.addEventListener\('pageshow',armFallback\)/);
assert.doesNotMatch(bootRefresh, /setTimeout\(finishBoot,12000\)/);

assert.match(index, /href="css\/theme\.css\?v=462"/);
assert.match(index, /src="js\/theme\.js\?v=460"/);

console.log('V468 build marker consistency tests passed');
