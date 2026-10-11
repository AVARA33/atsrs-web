const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('css/public-footer-copper-hover-v6253.css', 'utf8');

test('V6257 keeps the public footer hover override before the copper brand lockup', () => {
  assert.match(html, /data-atsrs-build="V6257"/);
  assert.match(html, /documents-tabs-copper-v6252\.css\?v=6252[\s\S]*public-footer-copper-hover-v6253\.css\?v=6253[\s\S]*brand-copper-lockup-v6254\.css\?v=6257[\s\S]*brand-copper-spinner-v6256\.css\?v=6256/);
});

test('all public footer links receive the shared copper hover and focus color', () => {
  assert.match(css, /#landingPage \.public-footer a:hover,[\s\S]*#landingPage \.public-footer a:focus-visible[\s\S]*color: #C06D45 !important/);
  assert.doesNotMatch(css, /#22c55e|#16a34a|#25c763|#5fe58e/i);
});

test('footer link geometry and resting color are not overridden', () => {
  assert.doesNotMatch(css, /(?:width|height|padding|margin|display|position|background|border):/);
  assert.doesNotMatch(css, /\.public-footer a\s*\{[^}]*color:/s);
});
