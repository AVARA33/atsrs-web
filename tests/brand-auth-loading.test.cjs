const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'brand-auth-v513.css'), 'utf8');
const harness = fs.readFileSync(path.join(root, 'tests', 'fixtures', 'brand-auth-loading-harness.html'), 'utf8');
const processor = fs.readFileSync(path.join(root, 'scripts', 'make-transparent-brand-assets.py'), 'utf8');

const boot = index.match(/<div id="atsrsBootScreen"[\s\S]*?<\/div>\s*<script id="atsrs-v178-modular-boot-guard">/)?.[0] || '';
assert.match(boot, /atsrs-boot-mark/);
assert.doesNotMatch(boot, /atsrs-spinner|atsrs-loader-title|atsrs-loader-sub|Welcome to ATSRS|Getting things ready/);
assert.match(index, /atsrs-auth-lockup[\s\S]*?Applicant Tracking System &amp; Recruitment Solutions/);
assert.match(index, /public-wordmark atsrs-home-lockup/);
assert.match(css, /atsrs-lockup-green-transparent\.png/);
assert.match(css, /atsrs-lockup-blue-transparent\.png/);
assert.match(css, /html\[data-theme="light"\] #auth \.auth-card[\s\S]*?background:transparent!important/);
assert.match(css, /#auth:not\(\.hidden\) \.auth-card/);
assert.match(css, /html\[data-theme="light"\] #auth \.atsrs-auth-lockup[\s\S]*?filter:saturate\(1\.12\) contrast\(1\.04\)/);
assert.match(css, /html\[data-theme="light"\] \.atsrs-public-landing \.public-wordmark\.atsrs-home-lockup[\s\S]*?filter:saturate\(1\.12\) contrast\(1\.04\)/);
assert.match(css, /\.public-wordmark\.atsrs-home-lockup::after[\s\S]*?content:none!important/);
assert.match(css, /atsrs-mark-green\.png/);
assert.match(css, /html\[data-theme="light"\] #atsrsBootScreen\{[\s\S]*?linear-gradient\(135deg,#f8fafc[\s\S]*?color-scheme:light/);
assert.match(css, /html\[data-theme="light"\] #atsrsBootScreen \.atsrs-boot-mark\{[\s\S]*?background-color:transparent[\s\S]*?atsrs-lockup-light-transparent\.png[\s\S]*?background-size:auto 100%/);
assert.ok(index.indexOf("localStorage.getItem('atsrs_theme')") < index.indexOf('css/brand-auth-v513.css?v=547'));
assert.match(css, /@keyframes atsrsLogoShine/);
assert.match(css, /prefers-reduced-motion:reduce/);
assert.match(harness, /brand-auth-v513\.css\?v=547/);
assert.doesNotMatch(harness, /atsrs-spinner|Welcome to ATSRS|Getting things ready/);
assert.match(processor, /graphite = np\.asarray\(\(8, 13, 21\)/);
assert.match(processor, /neutral & text_region/);
assert.match(processor, /coloured_alpha = np\.where\(coloured, alpha, 0\.0\)/);

for (const asset of ['atsrs-lockup-green-transparent.png', 'atsrs-lockup-blue-transparent.png', 'atsrs-lockup-light-transparent.png', 'atsrs-mark-green.png', 'atsrs-mark-blue.png']) {
  assert.ok(fs.statSync(path.join(root, 'assets', 'branding', asset)).size > 100000);
}

console.log('V516 graphite ATS and luminous source-blue logo contracts passed');
