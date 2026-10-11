const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'brand-copper-spinner-v6256.css'), 'utf8');

test('V6261 keeps the copper favicon but removes the boot-logo preload', () => {
  assert.match(html, /data-atsrs-build="V6261"/);
  assert.match(html, /id="atsrsFavicon"[^>]+atsrs-favicon-copper-v6255\.png\?v=6255/);
  assert.match(html, /atsrsBootLogoPreload\.removeAttribute\('href'\)/);
  assert.match(html, /brand-copper-lockup-v6254\.css\?v=6257[\s\S]*brand-copper-spinner-v6256\.css\?v=6261/);
});

test('boot screen uses sequential copper segments instead of a rotating glyph or filled logo', () => {
  assert.match(html, /class="atsrs-spinner atsrs-boot-spinner"/);
  assert.equal((html.match(/<span><\/span>/g) || []).length >= 8, true);
  assert.doesNotMatch(html, /ph-spinner-gap atsrs-boot-spinner/);
  assert.doesNotMatch(css, /background-image|atsrs-mark-orange/);
  assert.match(css, /background:#C06D45!important/);
  assert.match(css, /animation:atsrsCopperSegmentPulse 1s linear infinite!important/);
  assert.match(css, /span:nth-child\(8\)[\s\S]*animation-delay:0s!important/);
  assert.match(css, /#atsrsBootScreen \.atsrs-boot-mark\{[\s\S]*background:transparent!important/);
});
