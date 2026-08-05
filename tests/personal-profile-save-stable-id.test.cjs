const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dashboard = fs.readFileSync(path.join(root, 'js', 'dashboard.js'), 'utf8');
const serverData = fs.readFileSync(path.join(root, 'js', 'server-data.js'), 'utf8');

assert.match(
  dashboard,
  /var existing=readJson\(PROFILE_KEY,\{\}\);[\s\S]*?var data=\{[\s\S]*?atsrsId:existing\.atsrsId\|\|'',/,
  'Personal Account save must preserve the hydrated stable profile identity'
);
assert.doesNotMatch(
  dashboard,
  /var data=\{\s*name:/,
  'The saved profile object must not be rebuilt without its stable identity'
);
assert.match(
  serverData,
  /if\(!validUuid\(decoded\.atsrsId\)\)decoded\.atsrsId=await deterministicUuid\(legacyEntityKey\(key,null\)\)/,
  'Legacy profiles without an ID must still receive the deterministic owner ID during hydration'
);

console.log('Personal profile stable-ID save regression tests passed');
