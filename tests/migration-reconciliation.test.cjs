const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const manifest = fs.readFileSync(
  path.join(root, 'docs/audit/migration-reconciliation.md'),
  'utf8'
);

const [remoteSection, localAndPlan = ''] = manifest.split(
  '## Local versions without remote history'
);
const [localSection, plan = ''] = localAndPlan.split(
  '## Exact proposed history sequence'
);

const versions = text => [...text.matchAll(/^\|\s*(\d{14})\s*\|/gm)].map(match => match[1]);
const remoteVersions = versions(remoteSection);
const localOnlyVersions = versions(localSection);

assert.equal(remoteVersions.length, 28, 'the read-only remote history audit must contain 28 versions');
assert.equal(new Set(remoteVersions).size, 28, 'remote history versions must be unique');
assert.deepEqual(
  localOnlyVersions,
  [
    '20260720192356',
    '20260721191000',
    '20260723140000',
    '20260723170000',
    '20260726223000',
    '20260729041619',
    '20260729105130',
    '20260729105131'
  ],
  'every local version without remote history must remain explicitly classified'
);

assert.match(manifest, /18 reviewed local timestamp aliases/i);
assert.match(manifest, /exact 28 remote files/i);
assert.match(manifest, /baseline_v242_detailed_expiry_notifications/i);
assert.match(manifest, /accept live baseline/i);
assert.match(plan, /only pending executable[\s\S]+?20260729041619/i);
assert.match(manifest, /No `migration repair`, `db push` or\s+SQL apply has been executed/i);

console.log('migration reconciliation manifest tests passed');
