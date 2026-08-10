const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'public-landing.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'js', 'public-landing.js'), 'utf8');

assert.ok(index.indexOf('id="landingPage"') < index.indexOf('id="auth"'), 'public landing must precede auth');
assert.match(index, /href="\?view=login"[^>]*>Log in</);
assert.match(index, /href="\?view=signup"/);
for (const plan of ['FREE', 'BRONZE', 'SILVER', 'GOLD']) assert.match(index, new RegExp(`>${plan}<`));
assert.match(index, /1 lifetime AI scan/);
assert.match(index, /No Candidate directory listing/);
assert.match(index, /No SMS or WhatsApp credits/);
assert.match(index, /Candidate directory visibility/);
assert.doesNotMatch(index, /end-to-end encryption|mobile app|Google Calendar integration/i);
assert.doesNotMatch(index, /\$\d+|€\d+|£\d+/);
assert.match(js, /setInterval\(rotateWordmarks,10000\)/);
assert.match(js, /swap\.classList\.toggle\('show-amp'\)/);
assert.match(js, /letterS\.textContent='S'/);
assert.match(js, /ampersand\.textContent='&'/);
assert.match(js, /prefix\.className='atsrs-brand-prefix'/);
assert.match(js, /suffix\.className='atsrs-brand-suffix'/);
assert.match(js, /prefers-reduced-motion: reduce/);
assert.match(css, /\.atsrs-brand-swap\.show-amp \.atsrs-brand-s/);
assert.match(css, /\.atsrs-brand-swap\.show-amp \.atsrs-brand-amp/);
assert.match(css, /rotateY\(-?88deg\)/);
assert.doesNotMatch(css, /\.atsrs-brand-s\{[^\n]*transform:rotate\(/);
assert.doesNotMatch(css, /\.atsrs-brand-amp\{[^\n]*transform:rotate\(/);
assert.match(css, /Automated Reporting & Tracking System/);
assert.match(js, /authSubtitle\.textContent='Automated Reporting & Tracking System'/);
assert.doesNotMatch(js, /keepProductName|setTimeout\(keepProductName/);
assert.match(css, /@media\(max-width:420px\)/);
assert.match(css, /overflow-x:clip/);
assert.match(index, /href="data-protection\.html">Data Protection &amp; GDPR<\/a>/);
assert.match(index, /href="terms\.html">Terms of Use<\/a>/);
assert.match(index, /href="privacy\.html">Privacy Notice<\/a>/);
assert.match(index, /href="data-deletion\.html">Data Rights<\/a>/);
assert.match(index, /href="security\.html">Report a Security Issue<\/a>/);

for (const image of ['personal-dashboard.png', 'candidate-directory.png', 'corporate-personnel.png']) {
  assert.ok(fs.existsSync(path.join(root, 'assets', 'landing', image)), `${image} must exist`);
}

console.log('Public landing and animated wordmark contract tests passed');
