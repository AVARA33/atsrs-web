const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'js', 'stability-runtime.js'), 'utf8');
const bootRefresh = fs.readFileSync(path.join(root, 'js', 'boot-refresh.js'), 'utf8');
const routeFeatureLoader = fs.readFileSync(path.join(root, 'js', 'route-feature-loader.js'), 'utf8');
const runbook = fs.readFileSync(path.join(root, 'docs', 'stable-id-production-activation.md'), 'utf8');

const version = index.match(/data-atsrs-build="(V\d+)"/)?.[1];
const update = index.match(/data-atsrs-update="([^"]+)"/)?.[1];
assert.equal(version, 'V564');
assert.equal(update, '16 Aug 2026');

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

assert.match(index, /src="js\/dashboard\.js\?v=420"/);
assert.match(index, /href="css\/dashboard\.css\?v=447"/);
assert.match(index, /href="css\/account\.css\?v=422"/);

for (const asset of [
  'reference-filter-state.js',
  'documents.js'
]) {
  assert.match(index, new RegExp(`src="js/${asset.replace('.', '\\.')}\\?v=410"`));
}

assert.match(index, /src="js\/server-data\.js\?v=568"/);
assert.match(index, /src="js\/account\.js\?v=412"/);

assert.match(index, /src="js\/app\.js\?v=566"/);
assert.match(index, /src="js\/boot-refresh\.js\?v=443"/);
assert.match(index, /src="js\/storage\.js\?v=559"/);
assert.match(index, /src="js\/auth\.js\?v=568"/);
assert.match(index, /href="css\/corporate-information-architecture\.css\?v=421"/);
assert.match(index, /href="css\/corporate-remediation\.css\?v=480"/);
assert.match(index, /href="css\/personal-workspace-surface\.css\?v=436"/);
assert.match(index, /href="css\/personal-dashboard-qa\.css\?v=58156"/);
assert.match(index, /href="css\/recipient-links\.css\?v=433"/);
assert.match(index, /src="js\/recipient-links\.js\?v=433"/);
assert.match(index, /src="js\/corporate-information-architecture\.js\?v=444"/);
assert.match(index, /src="js\/corporate-remediation\.js\?v=480"/);
assert.match(index, /href="vendor\/phosphor-icons\/phosphor-regular\.css\?v=442"/);
assert.match(index, /href="css\/shell-polish\.css\?v=568"/);
assert.match(index, /src="js\/personal-dashboard-qa\.js\?v=549"/);
assert.match(index, /src="js\/shell-polish\.js\?v=567"/);
assert.match(index, /href="css\/public-landing\.css\?v=58147"/);
assert.match(index, /href="css\/share-profile\.css\?v=497"/);
assert.match(index, /src="js\/public-landing\.js\?v=58147"/);
assert.match(index, /href="css\/product-experience\.css\?v=447"/);
assert.doesNotMatch(index, /src="js\/product-experience\.js\?v=447"/);
assert.match(index, /src="js\/route-feature-loader\.js\?v=569"/);
assert.match(routeFeatureLoader, /loadScript\('js\/product-experience\.js\?v=447'\)/);
assert.match(index, /src="js\/talent-directory\.js\?v=519"/);
assert.match(index, /src="js\/corporate-reporting\.js\?v=519"/);
assert.match(index, /href="css\/workspace-surface-standard-v519\.css\?v=519"/);
assert.match(index, /href="css\/workspace-heading-standard-v520\.css\?v=58156"/);
assert.match(index, /href="css\/workspace-control-standard-v522\.css\?v=522-2"/);
assert.match(index, /href="css\/workspace-control-standard-v523\.css\?v=523"/);
assert.match(index, /href="css\/personal-account-routing-v524\.css\?v=524"/);
assert.match(index, /href="css\/references-cv-upload-v525\.css\?v=525"/);
assert.match(index, /href="css\/product-updates-light-status-v526\.css\?v=526"/);
assert.match(index, /href="css\/product-updates-alignment-v531\.css\?v=531"/);
assert.match(index, /href="css\/product-updates-premium-v543\.css\?v=543"/);
assert.match(index, /href="css\/product-updates-theme-parity-v544\.css\?v=544"/);
assert.match(index, /href="css\/projects\.css\?v=503"/);
assert.match(index, /src="js\/projects\.js\?v=503"/);

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

assert.match(index, /href="css\/theme\.css\?v=537"/);
assert.match(index, /src="js\/theme\.js\?v=509"/);

assert.match(index, /href="css\/brand-auth-v513\.css\?v=547"/);
assert.match(index, /href="css\/privacy-brand-v533\.css\?v=538"/);

console.log('V564 build marker consistency tests passed');
