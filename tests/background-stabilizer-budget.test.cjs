const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const auth = read('js/auth.js');
const login = read('js/login.js');
const ui = read('js/ui.js');
const index = read('index.html');

assert.doesNotMatch(auth, /atsrsStableInterval\(v78Apply/);
assert.doesNotMatch(login, /atsrsStableInterval\(lockBuildBadge/);
assert.doesNotMatch(ui, /atsrsStableInterval\((?:run|normaliseTopActions|removeFixedPortal)/);

assert.match(auth, /window\.addEventListener\('atsrs:resume',v78Apply\)/);
assert.match(ui, /window\.addEventListener\('resize',normaliseTopActions\)/);
assert.match(ui, /window\.addEventListener\('scroll',function\(\)\{requestAnimationFrame\(normaliseTopActions\)/);
assert.match(auth, /localStorage\.getItem\('atsrs_lang'\)!=='en'/);

for (const asset of ['ui.js', 'auth.js', 'login.js']) {
  assert.match(index, new RegExp(`src="js/${asset.replace('.', '\\.') }\\?v=568"`));
}

console.log('background stabilizer budget contracts passed');
