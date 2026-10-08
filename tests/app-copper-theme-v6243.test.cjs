const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('V6244 loads the permanent app-wide dark copper theme', () => {
  const html = read('index.html');
  const css = read('css/app-copper-theme-v6243.css');
  assert.match(html, /data-atsrs-build="V6244"/);
  assert.match(html, /href="css\/app-copper-theme-v6243\.css\?v=6244"/);
  assert.match(css, /--atsrs-ref-dark-bg:#0B0C0D/);
  assert.match(css, /--atsrs-ref-dark-line:#34383C/);
  assert.match(css, /--atsrs-shell-accent:#AC613B/);
  assert.match(css, /--atsrs-shell-accent-strong:#C06D45/);
});

test('standalone public pages load the same permanent copper theme', () => {
  for (const file of [
    'billing-terms.html', 'contact.html', 'data-deletion.html', 'data-protection.html',
    'faq.html', 'pricing.html', 'privacy.html', 'refund-policy.html', 'security.html',
    'terms.html', 'download/android/index.html'
  ]) {
    assert.match(read(file), /app-copper-theme-v6243\.css\?v=6244/, `${file} must load copper mode`);
  }
});

test('copper mode covers the main authenticated routes without changing their geometry', () => {
  const css = read('css/app-copper-theme-v6243.css');
  for (const route of [
    '#dashboardPage', '#recruitersPage', '#employersPage', '#certificatesPage',
    '#refsPage', '#rotationPage', '#profilePage', '#developerPage', '#introPage'
  ]) assert.match(css, new RegExp(route.replace('#', '\\#')));
  assert.doesNotMatch(css, /(?:^|[;{]\s*)(?:width|height|grid-template-columns):[^;]+!important/m);
});

test('theme uses graphite surfaces and copper controls while preserving semantic errors', () => {
  const css = read('css/app-copper-theme-v6243.css');
  assert.match(css, /border-top-color:#AC613B!important/);
  assert.match(css, /border-left-color:#AC613B!important/);
  assert.match(css, /background:#AC613B!important/);
  assert.doesNotMatch(css, /#22c55e|#16a34a|rgba\(34,197,94|rgba\(22,163,74/i);
  assert.doesNotMatch(css, /\.danger|\.error|\.expired/);
});

test('legacy directory and sidebar accents cannot fall back to green', () => {
  const css = read('css/app-copper-theme-v6243.css');
  assert.match(css, /\.sidebar \.nav button\.active :is\(i,span\)/);
  assert.match(css, /#recruitersPage \.recruiters-hero-eyebrow/);
  assert.match(css, /#employersPage \.company-hero-eyebrow/);
  assert.match(css, /#recruitersPage \.recruiters-hero-actions button:first-child/);
});
