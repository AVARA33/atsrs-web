const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css', 'talent-directory.css'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('dark talent modal backdrop keeps one stable surface across pointer states', () => {
  assert.match(css, /button\.talent-modal-backdrop:hover:not\(:disabled\)/);
  assert.match(css, /button\.talent-modal-backdrop:focus-visible/);
  assert.match(css, /\.talent-modal-backdrop\{[^}]*background:rgba\(1,7,13,\.58\);[^}]*backdrop-filter:blur\(2px\)/);
  assert.match(css, /button\.talent-modal-backdrop:active\{[\s\S]*background:rgba\(1,7,13,\.58\)!important;[\s\S]*border:0!important;[\s\S]*outline:0!important;[\s\S]*box-shadow:none!important;[\s\S]*backdrop-filter:blur\(2px\)!important;/);
});

test('production loads the corrected talent modal stylesheet', () => {
  assert.match(index, /css\/talent-directory\.css\?v=577/);
});
