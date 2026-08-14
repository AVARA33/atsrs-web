const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const storage = fs.readFileSync(path.join(root, 'js', 'storage.js'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'js', 'shell-polish.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'personal-account-routing-v524.css'), 'utf8');

assert.match(index, /data-atsrs-build="V529"/);
assert.match(index, /personal-account-routing-v524\.css\?v=524/);
assert.match(index, /storage\.js\?v=524/);
assert.match(index, /shell-polish\.js\?v=524/);

assert.match(storage, /renderedPage=personal&&page==="security"\?"profile":page/);
assert.match(storage, /atsrsAccountRoute=personal&&\(requestedPage==="profile"\|\|requestedPage==="security"\)\?requestedPage:""/);
assert.match(storage, /requestedPage==="profile"\)showAccountTab\("general"\)/);
assert.match(storage, /requestedPage==="security"\)showAccountTab\("security"\)/);
assert.match(storage, /personal&&requestedPage==="security"\?"Security"/);
assert.match(storage, /security:navCompliance/);
assert.match(shell, /showPage\('security',compliance\)/);
assert.doesNotMatch(shell, /showPage\('profile',compliance\)/);

assert.match(css, /data-atsrs-account-route="profile"[\s\S]*#accountTabSecurityBtn/);
assert.match(css, /data-atsrs-account-route="security"[\s\S]*\.account-tabs/);
assert.match(css, /data-atsrs-account-route="security"[\s\S]*#accountGeneralTab/);
assert.match(css, /data-atsrs-account-route="security"[\s\S]*#accountSharingTab/);
assert.match(css, /data-atsrs-account-route="security"[\s\S]*#accountSecurityTab\.active/);

console.log('V524 Personal Profile and Security route isolation contracts passed');
