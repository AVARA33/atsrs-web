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

assert.match(index, /public-plan-name">FREE[\s\S]*?href="\?view=signup">Start 7-day trial<\/a>/);
for (const plan of ['bronze', 'silver', 'gold', 'titan']) {
  assert.match(index, new RegExp(`href="pricing\\.html#${plan}">View plan details</a>`));
  assert.match(pricing, new RegExp(`id="${plan}"`));
}
assert.match(pricing, /Prices are shown in USD/);
assert.match(pricing, /Billing is not open yet/);
assert.match(pricing, /id="free" class="pricing-plan pricing-plan-free"/);
assert.match(pricing, /10 Tracked Documents/);
assert.match(pricing, /100 MB Storage/);
assert.match(pricing, /50 WhatsApp Expiry Alerts \/ month/);
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
assert.match(pricing, /shares the same 15 AI scan monthly allowance/);
assert.match(pricing, /id="comparison"/);
assert.match(runtime, /querySelectorAll\('\[data-plan-price\]'\)/);
assert.match(runtime, /querySelectorAll\('\[data-price-copy\]'\)/);
assert.match(runtime, /setAttribute\('aria-pressed'/);
assert.match(css, /\.pricing-paid-grid\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
assert.match(css, /@media\(max-width:1180px\)[\s\S]*?\.pricing-paid-grid\{grid-template-columns:1fr 1fr\}/);
assert.match(css, /@media\(max-width:720px\)[\s\S]*?\.pricing-plan-free,\.pricing-paid-grid\{grid-template-columns:1fr\}/);

console.log('Personal pricing information page contracts passed');

