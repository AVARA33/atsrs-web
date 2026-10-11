const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'brand-copper-lockup-v6254.css'), 'utf8');
const asset = path.join(root, 'assets', 'branding', 'atsrs-lockup-copper-v6254.png');

test('loads the selected copper lockup as the final brand override', () => {
  assert.match(html, /data-atsrs-build="V6259"/);
  assert.match(html, /brand-copper-lockup-v6254\.css\?v=6257/);
  assert.ok(fs.existsSync(asset));
  assert.ok(fs.statSync(asset).size > 100_000);
});

test('applies the copper lockup to the main visible brand surfaces', () => {
  assert.match(css, /--atsrs-copper-lockup:url\("\.\.\/assets\/branding\/atsrs-lockup-copper-v6254\.png\?v=6254"\)/);
  assert.match(css, /#auth \.atsrs-auth-lockup/);
  assert.match(css, /\.atsrs-public-landing \.public-wordmark\.atsrs-home-lockup/);
  assert.match(css, /\.legal-brand/);
  assert.match(css, /\.sidebar-head \.atsrs-sidebar-mark/);
  assert.match(css, /--atsrs-copper-mark:url\("\.\.\/assets\/branding\/atsrs-mark-copper-v6255\.png\?v=6255"\)/);
  assert.match(css, /\.sidebar-head \.atsrs-sidebar-mark[\s\S]*?background-image:var\(--atsrs-copper-mark\)!important[\s\S]*?background-position:center!important[\s\S]*?background-size:contain!important/);
  assert.match(css, /#atsrsBootScreen \.atsrs-boot-mark/);
});

