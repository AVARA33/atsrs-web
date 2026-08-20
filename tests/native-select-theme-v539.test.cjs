const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'native-select-theme-v539.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'js', 'select-standard.js'), 'utf8');

test('shared dropdown standard loads after the theme layer', () => {
  assert.match(index, /native-select-theme-v539\.css\?v=58168/);
  assert.match(index, /theme\.js\?v=577[\s\S]*select-standard\.js\?v=58163/);
});

test('custom single-select replaces operating-system popup interaction', () => {
  assert.match(js, /role','combobox/);
  assert.match(js, /role','listbox/);
  assert.match(js, /role','option/);
  assert.match(js, /ArrowDown/);
  assert.match(js, /Home/);
  assert.match(js, /Escape/);
  assert.match(js, /dispatchEvent\(new Event\('change'/);
  assert.match(css, /\.atsrs-select-trigger/);
  assert.match(css, /\.atsrs-select-menu/);
  assert.match(css, /\.atsrs-select-option/);
});

test('selected and interactive rows use theme-aware subtle ATSRS states', () => {
  assert.match(css, /--atsrs-menu-accent:#22c55e/);
  assert.match(css, /--atsrs-menu-selected:rgba\(34,197,94,\.12\)/);
  assert.match(css, /html\[data-theme="light"\] body\{[\s\S]*--atsrs-menu-accent:#167bd3/);
  assert.match(css, /--atsrs-menu-hover:rgba\(22,123,211,\.07\)/);
  assert.match(css, /\[aria-selected="true"\]:not\(\[data-active\]\)/);
  assert.match(css, /\.atsrs-select-option\[data-active\]/);
  assert.doesNotMatch(css, /\.atsrs-select-option\[data-active\][\s\S]*?background:var\(--atsrs-menu-accent\)!important/);
  assert.doesNotMatch(css, /#1473d2|#b8ff19|#9fe600/);
});

test('Jobs keeps its existing custom dropdown implementation', () => {
  assert.match(js, /\.jobs-native-select/);
  assert.match(js, /\.jobs-select-host/);
});

test('existing custom dropdowns inherit the same state hierarchy', () => {
  assert.match(css, /\.personnel-combobox-options/);
  assert.match(css, /\.work-type-select-option\[aria-selected="true"\]/);
  assert.match(css, /\.phone-code-option\[aria-selected="true"\]/);
  assert.match(css, /label:has\(input:checked\)/);
});
