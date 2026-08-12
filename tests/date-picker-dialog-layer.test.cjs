const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'js', 'date-picker.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'css', 'date-picker.css'), 'utf8');

test('date picker assets use the current cache version', () => {
  assert.match(index, /css\/date-picker\.css\?v=496/);
  assert.match(index, /js\/date-picker\.js\?v=496/);
});

test('date picker joins an open modal top layer and restores itself on close', () => {
  assert.match(script, /closest\('dialog\[open\]'\)/);
  assert.match(script, /activeDialogHost\.appendChild\(picker\)/);
  assert.match(script, /activeDialogHost\.classList\.add\('atsrs-date-picker-host'\)/);
  assert.match(script, /activeDialogHost\.classList\.remove\('atsrs-date-picker-host'\)/);
  assert.match(script, /document\.body\.appendChild\(picker\)/);
  assert.match(styles, /dialog\.atsrs-date-picker-host\s*\{[^}]*overflow:visible!important;/s);
});
