const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'brand-copper-lockup-v6254.css'), 'utf8');
const fixture = fs.readFileSync(path.join(root, 'tests', 'fixtures', 'sidebar-brand-v6257-harness.html'), 'utf8');

test('V6257 uses the square copper mark inside the authenticated sidebar slot', () => {
  assert.match(html, /data-atsrs-build="V6257"/);
  assert.match(html, /brand-copper-lockup-v6254\.css\?v=6257/);
  assert.match(css, /--atsrs-copper-mark:url\("\.\.\/assets\/branding\/atsrs-mark-copper-v6255\.png\?v=6255"\)/);
  assert.match(css, /\.atsrs-sidebar-mark[\s\S]*?background-image:var\(--atsrs-copper-mark\)!important/);
  assert.match(css, /background-position:center!important/);
  assert.match(css, /background-size:contain!important/);
  assert.match(fixture, /sidebar-head[\s\S]*?atsrs-sidebar-mark/);
});
