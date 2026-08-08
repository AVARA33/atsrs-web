const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const switcher = fs.readFileSync(path.join(root, 'js', 'workspace-switcher.js'), 'utf8');
const avatar = fs.readFileSync(path.join(root, 'js', 'avatar.js'), 'utf8');
const sage = fs.readFileSync(path.join(root, 'js', 'sage-ledger.js'), 'utf8');

assert.match(index, /src="js\/sage-ledger\.js\?v=450"/, 'Current header runtime must bypass the production cache');
assert.match(switcher, /window\.atsrsProfilePhoto\.currentUrl\(\)/, 'account switcher must use the saved identity photo');
assert.match(switcher, /photo\?'\<img src="'/, 'account switcher must render the saved photo as an image');
assert.match(avatar, /atsrs:identity-photo-hydrated/, 'identity hydration must notify the account switcher');
assert.match(avatar, /window\.atsrsWorkspaceSwitcherUpdate\(\)/, 'profile-photo rendering must refresh the account switcher');
assert.match(sage, /var avatarImage=avatar\.querySelector\('img'\);[\s\S]*?if\(!avatarImage\)/, 'visual decoration must preserve an existing account photo');

console.log('Account switcher photo preservation contracts passed');
