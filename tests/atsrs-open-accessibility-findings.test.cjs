const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'js', 'personal-dashboard-qa.js'), 'utf8');
const share = fs.readFileSync(path.join(root, 'js', 'share-profile.js'), 'utf8');

assert.doesNotMatch(html, /Managed in Profile/);
assert.doesNotMatch(dashboard, /Profile → Privacy & Sharing/);
assert.doesNotMatch(dashboard, /managed in Account/i);

assert.match(html, /id="profileTimezone" aria-labelledby="profileTimezoneTitle"/);
assert.match(html, /id="profileVisibility" aria-labelledby="profileVisibilityTitle"/);

assert.match(html, /id="saveShareBtn"[^>]*disabled/);
assert.match(share, /create\.disabled=selected===0/);
assert.match(share, /finally\{syncShareSelectAll\(\);\}/);

console.log('ATSRS-002, ATSRS-004 and ATSRS-005 regression contracts passed');
