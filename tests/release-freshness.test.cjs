const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.match(html, /data-atsrs-build="V6151"/);
assert.match(html, /src="js\/route-feature-loader\.js\?v=6146"/);
assert.match(html, /fetch\('\/\?atsrs_release_check='/);
assert.match(html, /cache:'no-store'/);
assert.match(html, /credentials:'same-origin'/);
assert.match(html, /serverBuild&&currentBuild\?serverBuild!==currentBuild/);
assert.match(html, /window\.location\.replace/);
assert.match(html, /window\.addEventListener\('pageshow'/);
assert.match(html, /window\.addEventListener\('focus'/);
assert.match(html, /document\.addEventListener\('visibilitychange'/);
assert.match(html, /atsrs-release-notice-button/);
assert.match(html, /controls\.insertBefore\(updateNotice,document\.getElementById\('atsrsNotificationButton'\)/);
assert.match(html, /ATSRS update available — update when ready/);
assert.match(html, /Save or finish your current work, then press Update again/);
assert.match(html, /if\(!refreshIsSafe\(\)\)\{updateNoticeMessage\.textContent=/);
assert.match(html, /refreshFromServer\(pendingRelease\)/);
assert.doesNotMatch(html, /lastInteractionAt/);
assert.doesNotMatch(html, /isReleaseOwner/);
assert.doesNotMatch(html, /bottom:20px/);
assert.doesNotMatch(html, /if\(pendingRelease&&refreshIsSafe\(\)\)refreshFromServer/);
assert.match(html, /window\.atsrsMarkReleaseWorkSaved=function\(\)\{hasUnsavedChanges=false;\}/);
assert.match(html, /atsrs:cloud-write-complete/);

console.log('Cross-device release freshness contracts passed');
