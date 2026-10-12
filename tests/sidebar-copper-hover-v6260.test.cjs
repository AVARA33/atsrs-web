const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'app-copper-theme-v6243.css'), 'utf8');

test('V6260 loads the copper sidebar hover override with a fresh cache key', () => {
  assert.match(html, /data-atsrs-build="V6264"/);
  assert.match(html, /app-copper-theme-v6243\.css\?v=6264/);
});

test('sidebar hover and focus color both icon and label copper', () => {
  assert.match(css, /button:hover :is\(\.atsrs-nav-icon,\.atsrs-nav-label,i,span\)/);
  assert.match(css, /button:focus-visible :is\(\.atsrs-nav-icon,\.atsrs-nav-label,i,span\)/);
  assert.match(css, /color:#D58A63!important/);
});

test('sidebar quick links no longer force the legacy green hover color', () => {
  assert.match(css, /\.sidebar-quick-links \[role="button"\]:hover[\s\S]*?color:#D58A63!important/);
  assert.match(css, /outline:2px solid rgba\(192,109,69,\.72\)!important/);
});
