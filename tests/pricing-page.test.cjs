const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const pricing = fs.readFileSync(path.join(root, 'pricing.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'pricing.css'), 'utf8');

assert.match(index, /public-plan-name">FREE[\s\S]*?href="\?view=signup">Start with Free<\/a>/);
for (const plan of ['bronze', 'silver', 'gold']) {
  assert.match(index, new RegExp(`href="pricing\\.html#${plan}">View plan details</a>`));
  assert.match(pricing, new RegExp(`id="${plan}"`));
}
assert.match(pricing, /No paid subscription is being sold yet/);
assert.match(pricing, /Final price to be announced/);
assert.match(pricing, /1 lifetime AI scan/);
assert.match(pricing, /No Candidate directory listing/);
assert.match(pricing, /No SMS or WhatsApp credits/);
assert.match(pricing, /Candidate directory visibility/);
assert.doesNotMatch(pricing, /\$\d+|€\d+|£\d+/);
assert.match(pricing, /id="comparison"/);
assert.match(css, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
assert.match(css, /@media\(max-width:720px\)[\s\S]*?\.pricing-plan-grid\{grid-template-columns:1fr\}/);

console.log('Personal pricing information page contracts passed');
