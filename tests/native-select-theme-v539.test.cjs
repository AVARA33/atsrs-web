const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'native-select-theme-v539.css'), 'utf8');

test('V539 loads the final select-theme layer', () => {
  assert.match(index, /data-atsrs-build="V549"/);
  assert.match(index, /native-select-theme-v539\.css\?v=539/);
});

test('dark native menus use black surfaces and green selected rows', () => {
  assert.match(css, /--atsrs-menu-surface:#050606/);
  assert.match(css, /--atsrs-menu-accent:#b8ff19/);
  assert.match(css, /select:not\(\[multiple\]\) option:where\(:checked,:hover,:focus,:active\)/);
  assert.match(css, /background-image:linear-gradient\(var\(--atsrs-menu-accent\),var\(--atsrs-menu-accent\)\)/);
});

test('custom dropdown menus use the same dark selection language', () => {
  assert.match(css, /\.personnel-combobox-options/);
  assert.match(css, /\.work-type-select-option\[aria-selected="true"\]/);
  assert.match(css, /\.phone-code-option\[aria-selected="true"\]/);
  assert.match(css, /label:has\(input:checked\)/);
});

test('light native selection remains blue', () => {
  assert.match(css, /html\[data-theme="light"\]/);
  assert.match(css, /background-color:#1473d2/);
});
