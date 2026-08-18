const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('index.html');
const palette = read('css/theme-palette-v508.css');
const surfaces = read('css/dark-surface-standard-v58154.css');
const controls = read('css/workspace-control-standard-v522.css');
const nativeSelects = read('css/native-select-theme-v539.css');

assert.match(palette, /--atsrs-ref-lime:#22c55e/);
assert.match(palette, /--atsrs-ref-lime-strong:#16a34a/);
assert.doesNotMatch(palette, /#b8ff19|#9fe600|rgba\(184,255,25/);

assert.match(palette, /body:where\(\.personal-mode,\.company-mode\)/);
assert.match(surfaces, /\.account-tabs button\.active,\.module-tabs button\.active[\s\S]*?color:#22c55e!important/);
assert.match(controls, /rgba\(34,197,94,\.08\)/);
assert.match(nativeSelects, /--atsrs-menu-accent:#22c55e/);

for (const asset of [
  'workspace-control-standard-v522.css',
  'workspace-control-standard-v523.css',
  'native-select-theme-v539.css',
  'theme-palette-v508.css',
  'dark-surface-standard-v58154.css'
]) {
  assert.ok(html.includes(`${asset}?v=58155`), `${asset} must use the V58155 cache marker`);
}

console.log('Dark brand green standard contracts passed');
