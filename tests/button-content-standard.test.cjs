const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'button-content-standard-v58148.css'), 'utf8');

test('loads the shared button content alignment layer after product styles', () => {
  const jobsIndex = index.indexOf('css/jobs-prototype.css?v=58151');
  const alignmentIndex = index.indexOf('css/button-content-standard-v58148.css?v=58148');

  assert.notEqual(jobsIndex, -1);
  assert.ok(alignmentIndex > jobsIndex);
});

test('centres action content without changing control dimensions or appearance', () => {
  assert.match(css, /--atsrs-button-content-gap:7px/);
  assert.match(css, /display:inline-flex/);
  assert.match(css, /align-items:center/);
  assert.match(css, /justify-content:center/);
  assert.match(css, /gap:var\(--atsrs-button-content-gap\)/);
  assert.match(css, /text-align:center/);
  assert.match(css, /line-height:1\.2/);

  assert.doesNotMatch(css, /(?:^|[;{])\s*(?:width|height|min-height|padding|margin|color|background|border|border-radius|box-shadow)\s*:/m);
});

test('keeps navigation, menus and select-like options out of the centring rule', () => {
  for (const exception of [
    '.nav button',
    '.lang-menu button',
    '.workspace-switcher-button',
    '.workspace-option',
    '.work-type-select-toggle',
    '.work-type-select-option',
    '.personnel-combobox-options button',
    '.jobs-admin-list-item',
    '[role="option"]',
    '[role="menuitem"]'
  ]) {
    assert.ok(css.includes(exception), `missing exception: ${exception}`);
  }
});
