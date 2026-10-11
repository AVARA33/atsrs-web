const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'brand-copper-loading-v6255.css'), 'utf8');

test('V6255 uses the copper browser icon and preloads the orange boot mark', () => {
  assert.match(html, /data-atsrs-build="V6255"/);
  assert.match(html, /id="atsrsFavicon"[^>]+atsrs-favicon-copper-v6255\.png\?v=6255/);
  assert.match(html, /atsrsBootLogoPreload\.href='assets\/branding\/atsrs-mark-orange-v6255\.png\?v=6255'/);
  assert.match(html, /var href='assets\/branding\/atsrs-favicon-copper-v6255\.png\?v=6255'/);
  assert.match(html, /brand-copper-lockup-v6254\.css\?v=6254[\s\S]*brand-copper-loading-v6255\.css\?v=6255/);
});

test('boot screen is orange-only, rotates, and does not show the former shine sweep', () => {
  assert.match(css, /atsrs-mark-orange-v6255\.png\?v=6255/);
  assert.match(css, /animation:atsrsCopperBootSpin 1\.55s linear infinite!important/);
  assert.match(css, /#atsrsBootScreen \.atsrs-boot-shine\{[\s\S]*display:none!important/);
  assert.match(css, /@keyframes atsrsCopperBootSpin/);
});

test('required generated brand assets exist and are non-empty', () => {
  for (const file of [
    'atsrs-mark-copper-v6255.png',
    'atsrs-mark-orange-v6255.png',
    'atsrs-favicon-copper-v6255.png'
  ]) {
    const asset = path.join(root, 'assets', 'branding', file);
    assert.ok(fs.statSync(asset).size > 1024, `${file} should contain image data`);
  }
});
