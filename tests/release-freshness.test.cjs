const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.match(html, /data-atsrs-build="V6157"/);
assert.match(html, /data-atsrs-update="23 Sep 2026"/);
assert.match(html, /src="js\/route-feature-loader\.js\?v=6157"/);
assert.match(html, /fetch\('\/\?atsrs_release_check='/);
assert.match(html, /cache:'no-store'/);
assert.match(html, /credentials:'same-origin'/);
assert.match(html, /serverBuild===currentBuild/);
assert.match(html, /window\.location\.replace/);
assert.match(html, /window\.addEventListener\('pageshow'/);
assert.match(html, /if\(!event\.persisted\)updateOnFreshEntry\(\)/);
assert.match(html, /sessionStorage\.setItem\(reloadKey,serverBuild\)/);
assert.doesNotMatch(html, /atsrs-release-notice|ph-download-simple|ATSRS is up to date/);
assert.doesNotMatch(html, /window\.addEventListener\('focus'/);
assert.doesNotMatch(html, /visibilitychange|setInterval|pendingRelease|refreshIsSafe/);

console.log('Entry-only release freshness contracts passed');
