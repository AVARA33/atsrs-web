const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('V6264 loads the permanent app-wide dark copper theme', () => {
  const html = read('index.html');
  const css = read('css/app-copper-theme-v6243.css');
  assert.match(html, /data-atsrs-build="V6264"/);
  assert.match(html, /href="css\/app-copper-theme-v6243\.css\?v=6264"/);
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

test('auth and legal navigation hover states use the stronger copper accent', () => {
  const css = read('css/app-copper-theme-v6243.css');
  const privacy = read('privacy.html');
  assert.match(css, /#auth \.auth-home-link:is\(:hover,:focus-visible\)/);
  assert.match(css, /\.legal-switch:is\(:hover,:focus-visible\)[\s\S]*?color:#C06D45!important/);
  assert.match(privacy, /\.toc a:hover,\.toc a:focus-visible\{color:#c06d45\}/);
  assert.match(privacy, /\.legal-switch:hover,\.legal-switch:focus-visible\{color:#c06d45;border-bottom-color:#c06d45\}/);
});

test('legacy References and Profile accents resolve to copper without changing error colors', () => {
  const css = read('css/app-copper-theme-v6243.css');
  assert.match(css, /body\.personal-mode :is\(#refsPage,#profilePage\)[\s\S]*?--atsrs-field-accent:#AC613B!important/);
  assert.match(css, /#profilePage :is\([\s\S]*?\.profile-sharing-create-button,\.profile-sharing-dialog-confirm[\s\S]*?background:#AC613B!important/);
  assert.match(css, /#refsPage :is\([\s\S]*?\.atsrs-v134-status\.ready[\s\S]*?color:#D58A63!important/);
  assert.doesNotMatch(css, /\.danger|\.error|\.expired/);
});
