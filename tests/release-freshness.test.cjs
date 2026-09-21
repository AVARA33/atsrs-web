const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.match(html, /data-atsrs-build="V6146"/);
assert.match(html, /fetch\('\/\?atsrs_release_check='/);
assert.match(html, /cache:'no-store'/);
assert.match(html, /credentials:'same-origin'/);
assert.match(html, /serverBuild!==currentBuild/);
assert.match(html, /window\.location\.replace/);
assert.match(html, /window\.addEventListener\('pageshow'/);
assert.match(html, /window\.addEventListener\('focus'/);
assert.match(html, /document\.addEventListener\('visibilitychange'/);
assert.match(html, /function isReleaseOwner\(\)\{return window\.__atsrsDeveloperAccess===true;\}/);
assert.match(html, /ATSRS update available/);
assert.match(html, /Your current page will not reload automatically/);
assert.match(html, /Finish or save your current work first/);
assert.match(html, /if\(isReleaseOwner\(\)&&refreshIsSafe\(\)\)\{refreshFromServer\(pendingRelease\)/);
assert.doesNotMatch(html, /if\(pendingRelease&&refreshIsSafe\(\)\)refreshFromServer/);
assert.match(html, /window\.atsrsMarkReleaseWorkSaved=function\(\)\{hasUnsavedChanges=false;\}/);
assert.match(html, /atsrs:cloud-write-complete/);

console.log('Cross-device release freshness contracts passed');
