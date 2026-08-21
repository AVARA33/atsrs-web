const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'js', 'date-picker.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'css', 'date-picker.css'), 'utf8');
const harness = fs.readFileSync(path.join(root, 'tests', 'fixtures', 'date-picker-selection-v5851-harness.html'), 'utf8');

test('date picker assets use the current cache version', () => {
  assert.match(index, /css\/date-picker\.css\?v=5851/);
  assert.match(index, /js\/date-picker\.js\?v=5851/);
});

test('visual harness compares the real calendar selection with the real Jobs active page state', () => {
  assert.match(harness, /jobs-page-button is-current/);
  assert.match(harness, /type="date" value="2026-08-17"/);
  assert.match(harness, /\.\.\/\.\.\/js\/date-picker\.js/);
});

test('calendar controls use neutral dark surfaces and direct month/year change handling', () => {
  assert.match(styles, /\.atsrs-date-picker-dialog\{[\s\S]*?border:1px solid #343a36;[\s\S]*?background:#0b0d0c;/);
  assert.match(styles, /\.atsrs-date-picker-month select\{[\s\S]*?background-color:#050606!important;/);
  assert.match(styles, /\.atsrs-date-picker-open \.atsrs-select-menu\{[\s\S]*?z-index:2147483647!important;/);
  assert.match(styles, /\.atsrs-date-picker-days button:hover,[\s\S]*?background:rgba\(255,255,255,\.08\)!important/);
  assert.match(script, /querySelector\('\[data-date-month\]'\)\.addEventListener\('input',onPickerChange\)/);
  assert.match(script, /querySelector\('\[data-date-year\]'\)\.addEventListener\('input',onPickerChange\)/);
  assert.match(script, /querySelector\('\[data-date-month\]'\)\.addEventListener\('change',onPickerChange\)/);
  assert.match(script, /querySelector\('\[data-date-year\]'\)\.addEventListener\('change',onPickerChange\)/);
  assert.doesNotMatch(script, /picker\.addEventListener\('change',onPickerChange\)/);
});

test('selected calendar day reuses the themed active-pagination edge treatment', () => {
  assert.match(styles, /button:is\(\.selected,\[data-selected="true"\],\[aria-pressed="true"\]\)\s*\{[\s\S]*?border-top-color:var\(--atsrs-field-line\)!important;[\s\S]*?border-right-color:var\(--atsrs-field-accent\)!important;[\s\S]*?border-bottom-color:var\(--atsrs-field-line\)!important;[\s\S]*?border-left-color:var\(--atsrs-field-accent\)!important;/);
  assert.match(styles, /background:color-mix\(in srgb,var\(--atsrs-field-accent\) 5%,var\(--atsrs-field-surface\)\)!important;/);
  assert.match(styles, /box-shadow:-3px 0 0 var\(--atsrs-field-accent-ring\),3px 0 0 var\(--atsrs-field-accent-ring\),0 6px 14px var\(--atsrs-field-accent-shadow\)!important;/);
  assert.match(styles, /:focus-visible\s*\{[\s\S]*?outline:0!important;[\s\S]*?box-shadow:-4px 0 0 var\(--atsrs-field-accent-ring\),4px 0 0 var\(--atsrs-field-accent-ring\)/);
  assert.match(script, /dayButton\.dataset\.selected='true'/);
  assert.doesNotMatch(script, /style\.setProperty\('(background-color|border-color|box-shadow)'/);
  assert.doesNotMatch(styles, /background(?:-color)?:#(?:2f6fd6|2f806c)!important/);
});

test('date picker joins an open modal top layer and restores itself on close', () => {
  assert.match(script, /closest\('dialog\[open\]'\)/);
  assert.match(script, /activeDialogHost\.appendChild\(picker\)/);
  assert.match(script, /activeDialogHost\.classList\.add\('atsrs-date-picker-host'\)/);
  assert.match(script, /activeDialogHost\.classList\.remove\('atsrs-date-picker-host'\)/);
  assert.match(script, /document\.body\.appendChild\(picker\)/);
  assert.match(styles, /dialog\.atsrs-date-picker-host\s*\{[^}]*overflow:visible!important;/s);
});
