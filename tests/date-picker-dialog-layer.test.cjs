const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'js', 'date-picker.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'css', 'date-picker.css'), 'utf8');

test('date picker assets use the current cache version', () => {
  assert.match(index, /css\/date-picker\.css\?v=505/);
  assert.match(index, /js\/date-picker\.js\?v=505/);
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

test('selected calendar day remains visibly highlighted in both themes', () => {
  assert.match(styles, /#atsrsDatePicker \.atsrs-date-picker-days button\.selected\s*\{[\s\S]*?background:#2f806c!important;[\s\S]*?color:#ffffff!important;/);
  assert.match(styles, /html\[data-theme="light"\] #atsrsDatePicker \.atsrs-date-picker-days button\.selected\s*\{[\s\S]*?background:#2f6fd6!important;[\s\S]*?color:#ffffff!important;/);
  assert.match(script, /dayButton\.dataset\.selected='true'/);
  assert.match(script, /style\.setProperty\('background-color',isLight\?'#2f6fd6':'#2f806c','important'\)/);
  assert.match(styles, /button\[aria-pressed="true"\][\s\S]*?background-color:#2f806c!important;/);
});

test('date picker joins an open modal top layer and restores itself on close', () => {
  assert.match(script, /closest\('dialog\[open\]'\)/);
  assert.match(script, /activeDialogHost\.appendChild\(picker\)/);
  assert.match(script, /activeDialogHost\.classList\.add\('atsrs-date-picker-host'\)/);
  assert.match(script, /activeDialogHost\.classList\.remove\('atsrs-date-picker-host'\)/);
  assert.match(script, /document\.body\.appendChild\(picker\)/);
  assert.match(styles, /dialog\.atsrs-date-picker-host\s*\{[^}]*overflow:visible!important;/s);
});
