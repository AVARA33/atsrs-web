const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('css/company-banner-neutral-v6251.css', 'utf8');

test('V6253 loads the Companies banner correction after the shared copper edge standard', () => {
  assert.match(html, /data-atsrs-build="V6253"/);
  assert.match(html, /copper-edge-standard-v6250\.css\?v=6250[\s\S]*company-banner-neutral-v6251\.css\?v=6251/);
});

test('Companies headline is white with no copper text effect', () => {
  assert.match(css, /#employersPage \.company-hero-copy h1[\s\S]*color: #F7F4F1 !important/);
  assert.match(css, /-webkit-text-fill-color: #F7F4F1 !important/);
  assert.match(css, /text-shadow: none !important/);
  assert.match(css, /filter: none !important/);
});

test('all three directory banners share the largest frame geometry and edge treatment', () => {
  assert.match(css, /#jobsPage \.jobs-hero,[\s\S]*#recruitersPage \.recruiters-hero,[\s\S]*#employersPage \.company-directory-hero/);
  assert.match(css, /height: 274px !important/);
  assert.match(css, /min-height: 274px !important/);
  assert.match(css, /border-radius: 18px !important/);
  assert.match(css, /border-width: 2px 1px 1px 2px !important/);
  assert.match(css, /border-top-color: #AC613B !important/);
  assert.match(css, /border-left-color: #AC613B !important/);
  assert.match(css, /border-right-color: #34383C !important/);
  assert.match(css, /border-bottom-color: #34383C !important/);
  assert.match(css, /box-shadow: none !important/);
});
