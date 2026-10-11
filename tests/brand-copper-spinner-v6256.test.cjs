const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'brand-copper-spinner-v6256.css'), 'utf8');

test('V6259 keeps the copper favicon but removes the boot-logo preload', () => {
  assert.match(html, /data-atsrs-build="V6259"/);
  assert.match(html, /id="atsrsFavicon"[^>]+atsrs-favicon-copper-v6255\.png\?v=6255/);
  assert.match(html, /atsrsBootLogoPreload\.removeAttribute\('href'\)/);
  assert.match(html, /brand-copper-lockup-v6254\.css\?v=6257[\s\S]*brand-copper-spinner-v6256\.css\?v=6256/);
});

test('boot screen uses the Phosphor line spinner instead of a filled logo', () => {
  assert.match(html, /<i class="ph ph-spinner-gap atsrs-boot-spinner"><\/i>/);
  assert.doesNotMatch(css, /background-image|atsrs-mark-orange/);
  assert.match(css, /color:#C06D45!important/);
  assert.match(css, /animation:atsrsCopperLineSpin \.82s linear infinite!important/);
  assert.match(css, /#atsrsBootScreen \.atsrs-boot-mark\{[\s\S]*background:transparent!important/);
});
