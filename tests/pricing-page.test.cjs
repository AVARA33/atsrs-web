const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const pricing = fs.readFileSync(path.join(root, 'pricing.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'pricing.css'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'js', 'pricing.js'), 'utf8');

assert.match(pricing, /class="public-home-link" href="\/\?view=home" aria-label="Home"/);
assert.match(pricing, /class="public-home-link public-home-mobile" href="\/\?view=home" aria-label="Home"/);

assert.match(index, /public-plan-name">FREE[\s\S]*?href="\?view=signup">Start with Free<\/a>/);
for (const plan of ['bronze', 'silver', 'gold', 'titan']) {
  assert.match(index, new RegExp(`href="pricing\\.html#${plan}">View plan details</a>`));
  assert.match(pricing, new RegExp(`id="${plan}"`));
}
assert.match(pricing, /Prices are shown in USD/);
assert.match(pricing, /Billing is not open yet/);
assert.match(pricing, /id="free" class="pricing-plan pricing-plan-free"/);
assert.match(pricing, /Document tracking and expiry dashboard/);
assert.match(pricing, /Manual and QR document upload/);
assert.match(pricing, /Full JobSearch vacancy catalogue/);
assert.match(pricing, /Immediate access to newest vacancies/);
assert.match(pricing, /Recruiter details and verified contact routes/);
assert.match(pricing, /Direct Apply and original source links/);
assert.match(pricing, /Recruiter and official company directories/);
assert.match(pricing, /24-hour recipient-specific profile sharing/);
assert.match(pricing, /Unlimited Email \+ 50 WhatsApp expiry alerts \/ month/);
assert.match(pricing, /Unlimited Email \+ 150 WhatsApp expiry alerts \/ month/);
assert.match(pricing, /Unlimited Email \+ 300 WhatsApp expiry alerts \/ month/);
assert.match(pricing, /Unlimited Email \+ 750 WhatsApp expiry alerts \/ month/);
assert.match(pricing, /Unlimited Email and WhatsApp expiry alerts/);
assert.match(pricing, /5 AI document scans \/ month \+ 1 lifetime AI CV generation/);
assert.match(pricing, /15 AI document scans \+ 3 AI CV generations \/ month/);
assert.match(pricing, /50 AI document scans \+ 5 AI CV generations \/ month/);
assert.match(pricing, /150 AI document scans \+ 7 AI CV generations \/ month/);
assert.match(pricing, /500 AI document scans \+ 10 AI CV generations \/ month/);
assert.match(pricing, /1000 MB Secure Storage/);
assert.match(pricing, /2 GB Secure Storage/);
assert.match(pricing, /5 GB Secure Storage/);
assert.match(pricing, /10 GB Secure Storage/);
assert.match(pricing, /200 Tracked Documents/);
assert.match(pricing, /700 Tracked Documents/);
assert.match(pricing, /1,500 Tracked Documents/);
assert.match(pricing, /2,000 Tracked Documents/);
assert.doesNotMatch(pricing, /No Candidate directory listing/);
assert.doesNotMatch(pricing, /No SMS or WhatsApp credits/);
assert.match(pricing, /data-monthly="\$19\.99" data-yearly="\$192"/);
assert.match(pricing, /data-monthly="\$39\.99" data-yearly="\$384"/);
assert.match(pricing, /data-monthly="\$69\.99" data-yearly="\$672"/);
assert.match(pricing, /id="titan"[\s\S]*?data-monthly="\$119\.99" data-yearly="\$1,152"/);
assert.equal((pricing.match(/class="pricing-plan pricing-plan-(?:bronze|future)/g) || []).length, 4);
assert.match(pricing, /RECOMMENDED/);
assert.match(pricing, /COMING SOON/);
assert.match(pricing, /Direct Apply/);
assert.match(pricing, /Original Source Links/);
assert.match(pricing, /AI CV Generations/);
assert.match(pricing, /Recruiter Directory/);
assert.match(pricing, /Official Company Directory/);
assert.match(pricing, /Tracked Documents<\/th><td>10<\/td><td>200<\/td><td>700<\/td><td>1,500<\/td><td>2,000<\/td>/);
assert.match(pricing, /Storage<\/th><td>100 MB<\/td><td>1000 MB<\/td><td>2 GB<\/td><td>5 GB<\/td><td>10 GB<\/td>/);
assert.match(pricing, /WhatsApp Expiry Alerts<\/th><td>50 \/ month<\/td><td>150 \/ month<\/td><td>300 \/ month<\/td><td>750 \/ month<\/td><td>Unlimited<\/td>/);
assert.match(pricing, /Silver, Gold and Titan limits are planned/);
assert.match(pricing, /id="comparison"/);
assert.match(runtime, /querySelectorAll\('\[data-plan-price\]'\)/);
assert.match(runtime, /querySelectorAll\('\[data-price-copy\]'\)/);
assert.match(runtime, /setAttribute\('aria-pressed'/);
assert.match(css, /\.pricing-paid-grid\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
assert.match(css, /@media\(max-width:1180px\)[\s\S]*?\.pricing-paid-grid\{grid-template-columns:1fr 1fr\}/);
assert.match(css, /@media\(max-width:720px\)[\s\S]*?\.pricing-plan-free,\.pricing-paid-grid\{grid-template-columns:1fr\}/);
assert.match(css, /\.pricing-table-group th/);

console.log('Personal pricing information page contracts passed');

