const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const palette = read('css/theme-palette-v508.css');
const legalCss = read('css/legal-public.css');
const pages = [
  'index.html',
  'pricing.html',
  'privacy.html',
  'data-deletion.html',
  'data-protection.html',
  'terms.html',
  'security.html',
  'billing-terms.html',
  'refund-policy.html'
];

assert.match(palette, /V562: one final Dark surface authority/);
assert.match(palette, /\.public-header,.site-header,.legal-header/);
assert.match(palette, /\.summary-card,.toc,.notice/);
assert.match(palette, /background-color:var\(--atsrs-ref-dark-surface\)!important/);

assert.doesNotMatch(legalCss, /--legal-bg:#07111d|--legal-surface:#0b1725|--legal-soft:#101f31/);
assert.match(legalCss, /--legal-bg:#050606;--legal-surface:#090b0a;--legal-soft:#0d100e/);

for (const page of pages) {
  const html = read(page);
  assert.match(html, /theme-palette-v508\.css\?v=562/, `${page} must load the canonical V562 palette`);
}

for (const page of ['privacy.html', 'data-deletion.html']) {
  const html = read(page);
  assert.doesNotMatch(html, /--bg:#07111d|--surface:#0b1725|--surface-2:#101f31/);
  assert.match(html, /--bg:#050606;--surface:#090b0a;--surface-2:#0d100e/);
}

console.log('V562 canonical Dark surface contracts passed');
