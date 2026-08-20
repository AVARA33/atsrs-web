const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'native-select-theme-v539.css'), 'utf8');
const neutralCss = fs.readFileSync(path.join(root, 'css', 'dropdown-neutral-state-v58174.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'js', 'select-standard.js'), 'utf8');

test('shared dropdown standard loads after the theme layer', () => {
  assert.match(index, /native-select-theme-v539\.css\?v=58173/);
  assert.match(index, /dropdown-neutral-state-v58174\.css\?v=58174/);
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
  assert.match(css, />\.sr-only\{[\s\S]*clip-path:inset\(50%\)!important/);
  assert.match(css, /\.atsrs-select-menu/);
  assert.match(css, /\.atsrs-select-option/);
});

test('selected rows stay neutral and pointer or keyboard movement uses a grey hover state', () => {
  assert.match(css, /--atsrs-menu-accent:#22c55e/);
  assert.match(css, /--atsrs-menu-selected:transparent/);
  assert.match(neutralCss, /--atsrs-menu-selected:transparent!important/);
  assert.match(neutralCss, /\.atsrs-select-option\[aria-selected="true"\]:not\(\[data-active\]\)\{[\s\S]*?background:transparent!important;[\s\S]*?box-shadow:none!important;/);
  assert.match(neutralCss, /\.atsrs-select-option\[data-active\],[\s\S]*?background:var\(--atsrs-menu-hover\)!important;/);
  assert.match(css, /--atsrs-menu-hover:rgba\(255,255,255,\.08\)/);
  assert.match(css, /html\[data-theme="light"\] body\{[\s\S]*--atsrs-menu-accent:var\(--atsrs-control-focus-border,#2563eb\)/);
  assert.match(css, /--atsrs-menu-hover:rgba\(15,23,42,\.07\)/);
  assert.match(css, /\[aria-selected="true"\]:not\(\[data-active\]\)/);
  assert.match(css, /\.atsrs-select-option\[data-active\]/);
  assert.match(css, /\[aria-selected="true"\]:not\(\[data-active\]\)\{[\s\S]*?box-shadow:none!important/);
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
