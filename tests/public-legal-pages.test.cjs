const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pages = {
  protection: read('data-protection.html'),
  terms: read('terms.html'),
  privacy: read('privacy.html'),
  rights: read('data-deletion.html'),
  security: read('security.html'),
  billing: read('billing-terms.html'),
  refunds: read('refund-policy.html')
};
const css = read('css/legal-public.css');
const runtime = read('js/legal-public.js');
const headerCss = read('css/public-legal-header.css');

for (const [name, html] of Object.entries({protection: pages.protection, terms: pages.terms, rights: pages.rights, security: pages.security})) {
  assert.match(html, /<meta name="viewport"/i, `${name} must be responsive`);
  assert.match(html, /Data Protection &amp; GDPR/);
  assert.match(html, /Terms of Use/);
  assert.match(html, /Privacy Notice/);
  assert.match(html, /Data Rights/);
  assert.match(html, /Report a Security Issue/);
}

for (const [name, html] of Object.entries(pages)) {
  assert.match(html, /class="public-header"/, `${name} must reuse the public header`);
  assert.match(html, /class="public-wordmark atsrs-home-lockup"/, `${name} must reuse the Home lockup`);
  assert.match(html, /href="\/\?view=home#platform"/, `${name} must retain public navigation`);
  assert.match(html, /href="\/\?view=login"/, `${name} must retain the Login route`);
  assert.match(html, /data-public-theme-toggle/, `${name} must retain the public theme control`);
}

assert.match(pages.privacy, /<h1>Privacy Notice<\/h1>/);
assert.match(pages.privacy, /data-legal-target="dataRights"/);

assert.match(pages.protection, /not a certification statement/i);
assert.match(pages.protection, /does not claim an external GDPR certification/i);
assert.match(pages.terms, /AI suggestions and expiry indicators require human confirmation/i);
assert.match(pages.terms, /Date status is not certification/i);
assert.match(pages.security, /Do not send passwords, access tokens, private keys, one-time codes/i);
assert.match(pages.security, /does not currently promise a fixed response time, monetary bounty/i);
assert.doesNotMatch(pages.protection, /AWS|employee GDPR training|certified GDPR compliant/i);
assert.doesNotMatch(pages.security, /security@atsrs\.com|guaranteed response|safe harbour/i);
assert.match(css, /min-height:44px/);
assert.match(css, /@media\(max-width:600px\)/);
assert.match(runtime, /localStorage\.getItem\('atsrs_theme'\)/);
assert.match(runtime, /querySelectorAll\('\[data-public-theme-toggle\]'\)/);
assert.match(headerCss, /html\[data-embedded="true"\] \.legal-public-nav-shell\{display:none\}/);

console.log('Public legal information architecture contracts passed');
