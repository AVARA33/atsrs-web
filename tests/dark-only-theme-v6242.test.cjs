const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const publicPages = [
  'index.html',
  'billing-terms.html',
  'contact.html',
  'data-deletion.html',
  'data-protection.html',
  'faq.html',
  'pricing.html',
  'privacy.html',
  'refund-policy.html',
  'security.html',
  'terms.html',
  'download/android/index.html'
];

test('every public entry point is locked to dark mode and exposes no theme switch', () => {
  for (const file of publicPages) {
    const html = read(file);
    assert.match(html, /<html[^>]*data-theme="dark"/i, `${file} must start in dark mode`);
    assert.match(html, /<meta name="color-scheme" content="dark"/i, `${file} must advertise dark color scheme only`);
    assert.doesNotMatch(html, /data-public-theme-toggle|id="themeToggle"/i, `${file} must not render a theme switch`);
  }
});

test('shared theme runtimes cannot select or persist light mode', () => {
  const theme = read('js/theme.js');
  const landing = read('js/public-landing.js');
  const legal = read('js/legal-public.js');
  const android = read('js/android-download.js');

  for (const [name, source] of Object.entries({theme, landing, legal, android})) {
    assert.doesNotMatch(source, /localStorage\.setItem\(['"]atsrs_(?:public_)?theme/i, `${name} must not persist a theme choice`);
    assert.doesNotMatch(source, /matchMedia\(['"]\(prefers-color-scheme:/i, `${name} must not follow the system color scheme`);
  }
  assert.doesNotMatch(theme, /createElement\(['"]button['"]\)[\s\S]*?atsrsThemeToggle/, 'app runtime must not create a theme switch');
  assert.match(theme, /document\.documentElement\.dataset\.theme='dark'/);
});

test('notification placement no longer depends on the removed theme control', () => {
  const shell = read('js/shell-polish.js');
  assert.match(shell, /if\(!controls\)return;/);
  assert.doesNotMatch(shell, /if\(!controls\|\|!theme\)return;/);
  assert.match(shell, /var anchor=theme&&theme\.parentElement===controls\?theme:/);
});
