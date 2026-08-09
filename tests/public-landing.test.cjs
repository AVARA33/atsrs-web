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
assert.match(js, /swap\.textContent==='S'\?'&':'S'/);
assert.match(js, /prefers-reduced-motion: reduce/);
assert.match(css, /\.atsrs-brand-swap\.is-rotating\{transform:rotateY\(180deg\)\}/);
assert.match(css, /Automated Reporting & Tracking System/);
assert.match(css, /@media\(max-width:420px\)/);
assert.match(css, /overflow-x:clip/);

for (const image of ['personal-dashboard.png', 'candidate-directory.png', 'corporate-personnel.png']) {
  assert.ok(fs.existsSync(path.join(root, 'assets', 'landing', image)), `${image} must exist`);
}

console.log('Public landing and animated wordmark contract tests passed');
