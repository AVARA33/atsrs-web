const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const expiry = require(path.join(root, 'js', 'expiry-status.js'));
const now = new Date('2026-08-04T12:00:00Z');

const cases = [
  ['', 'current', 'no_expiry'],
  ['N/A', 'current', 'no_expiry'],
  ['invalid', 'current', 'unconfirmed'],
  ['2026-11-03', 'current', 'dated'],
  ['2026-11-02', 'expiring_31_90', 'dated'],
  ['2026-09-04', 'expiring_31_90', 'dated'],
  ['2026-09-03', 'expiring_1_30', 'dated'],
  ['2026-08-05', 'expiring_1_30', 'dated'],
  ['2026-08-04', 'expires_today', 'dated'],
  ['2026-08-03', 'expired', 'dated']
];
for (const [value, bucket, dateState] of cases) {
  const result = expiry.classify(value, now);
  assert.equal(result.bucket, bucket, `${value || 'empty'} bucket`);
  assert.equal(result.dateState, dateState, `${value || 'empty'} date state`);
}

const reportingSource = fs.readFileSync(path.join(root, 'js', 'corporate-reporting.js'), 'utf8');
const storageSource = fs.readFileSync(path.join(root, 'js', 'storage.js'), 'utf8');
const context = {
  window: { atsrsExpiryStatus: expiry, addEventListener() {} },
  document: {
    readyState: 'loading',
    addEventListener() {},
    getElementById() { return null; }
  },
  localStorage: { getItem() { return 'company'; } },
  CustomEvent: class {},
  console,
  setTimeout() { return 0; }
};
vm.runInNewContext(reportingSource, context, { filename: 'corporate-reporting.js' });

const canonical = context.window.atsrsCorporateReporting.canonicalPayload({
  generated_at: '2026-08-04T08:00:00Z',
  summary: { personnel: 1, ready: 1, review: 0 },
  rows: [{
    professional_user_id: 'synthetic-profile',
    name: 'Synthetic',
    surname: 'Profile',
    current_count: 1,
    expiring_90_count: 0,
    documents: [{ title: 'Synthetic document', expiry: '2026-09-24', status: 'Valid' }]
  }]
});

assert.equal(canonical.summary.personnel, 1);
assert.equal(canonical.summary.documents, 1);
assert.equal(canonical.summary.review, 1);
assert.equal(canonical.rows[0].expiring_90_count, 1, '51-day document must be 31–90');
assert.equal(canonical.rows[0].expiring_30_count, 0);
assert.equal(canonical.rows[0].expiring_today_count, 0);
assert.equal(canonical.rows[0].status, 'review');
assert.equal(canonical.rows[0].documents[0].expiry_bucket, 'expiring_31_90');
assert.doesNotMatch(reportingSource, /actionCall\('report'\)/, 'Reports must reuse the shared compliance snapshot');
assert.match(storageSource, /if\(!companyMode\)\{[\s\S]*renderRiskList\(certificates\)/);
assert.match(storageSource, /Corporate Dashboard is owned by corporate-reporting\.js/);

console.log('Shared expiry status contract tests passed');
