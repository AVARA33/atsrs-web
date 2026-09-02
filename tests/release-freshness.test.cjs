const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.match(html, /data-atsrs-build="V5997"/);
assert.match(html, /fetch\('\/\?atsrs_release_check='/);
assert.match(html, /cache:'no-store'/);
assert.match(html, /credentials:'same-origin'/);
assert.match(html, /serverBuild!==currentBuild/);
assert.match(html, /window\.location\.replace/);
assert.match(html, /window\.addEventListener\('pageshow'/);
assert.match(html, /window\.addEventListener\('focus'/);
assert.match(html, /document\.addEventListener\('visibilitychange'/);

console.log('Cross-device release freshness contracts passed');
