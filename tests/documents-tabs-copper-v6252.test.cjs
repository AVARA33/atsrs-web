const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('css/documents-tabs-copper-v6252.css', 'utf8');

test('V6257 keeps the Documents folder-tab correction before the footer hover override', () => {
  assert.match(html, /data-atsrs-build="V6257"/);
  assert.match(html, /company-banner-neutral-v6251\.css\?v=6251[\s\S]*documents-tabs-copper-v6252\.css\?v=6252[\s\S]*public-footer-copper-hover-v6253\.css\?v=6253/);
});

test('folder tabs use the site copper palette without green fallback', () => {
  assert.match(css, /\.atsrs-document-folder-tab\.active[\s\S]*border-color: #AC613B !important/);
  assert.match(css, /\.atsrs-document-folder-tab b[\s\S]*color: #F0B08E !important/);
  assert.match(css, /\.atsrs-document-folder-edit:hover[\s\S]*color: #C06D45 !important/);
  assert.doesNotMatch(css, /#25c763|#5fe58e|#22c55e|#16a34a/i);
});

test('folder-tab override does not recolor semantic document statuses', () => {
  assert.doesNotMatch(css, /status|valid|expiry|expired/i);
});
