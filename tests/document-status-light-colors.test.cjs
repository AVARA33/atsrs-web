const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'shell-polish.css'), 'utf8');

assert.match(index, /css\/shell-polish\.css\?v=572/);
assert.match(index, /js\/app\.js\?v=567/);
assert.match(app, /class="atsrs-document-status /);
assert.match(app, /st\.expired\?'is-expired'/);
assert.match(app, /Number\(st\.days\)>0&&Number\(st\.days\)<=30\?'is-expiring':'is-neutral'/);

for (const [className, color] of [
  ['is-valid', '#187642'],
  ['is-expiring', '#8a5b00'],
  ['is-expired', '#a33a43'],
]) {
  const rule = new RegExp(`html\\[data-theme="light"\\] #certificatesPage \\.atsrs-document-status\\.${className}\\{[\\s\\S]*?color:${color}!important`);
  assert.match(css, rule);
}

assert.doesNotMatch(css, /html\[data-theme="dark"\] #certificatesPage \.atsrs-document-status/);
assert.doesNotMatch(css, /\.atsrs-document-status[^\{]*\{[^\}]*(?:background|border|box-shadow):/);

console.log('Light document status semantic color contracts passed');
