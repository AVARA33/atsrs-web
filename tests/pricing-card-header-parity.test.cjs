const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css', 'pricing.css'), 'utf8');
const page = fs.readFileSync(path.join(root, 'pricing.html'), 'utf8');

for (const [plan, accent] of [
  ['bronze', '#a96d36'],
  ['silver', '#8a9baa'],
  ['gold', '#c99b2d'],
]) {
  assert.match(css, new RegExp(`\\.pricing-plan-${plan}\\{--pricing-plan-accent:${accent}`));
}
assert.match(css, /\.pricing-plan-titan\{--pricing-plan-accent:var\(--public-muted\)/);
assert.match(css, /html\[data-theme="light"\] \.pricing-paid-grid \.pricing-plan\{[\s\S]*?border-top-color:var\(--pricing-plan-accent\)!important/);
assert.match(css, /--pricing-plan-accent-text:color-mix\(in srgb,var\(--pricing-plan-accent\) 72%,var\(--public-ink\)\)/);
assert.match(css, /background:linear-gradient\(180deg,color-mix\(in srgb,var\(--pricing-plan-accent\) 12%,var\(--public-surface\)\)[\s\S]*?var\(--public-surface\) 205px\)!important/);
assert.match(css, /html\[data-theme="light"\] \.pricing-paid-grid \.pricing-plan \.pricing-plan-status\{[\s\S]*?color:var\(--pricing-plan-accent-text\)!important/);
assert.match(css, /html\[data-theme="light"\] \.pricing-paid-grid \.pricing-plan \.public-plan-name\{color:var\(--pricing-plan-accent-text\)!important\}/);
assert.doesNotMatch(css, /html\[data-theme="dark"\][^{]*\.pricing-paid-grid/);
assert.match(page, /css\/pricing\.css\?v=5968/);

console.log('Pricing card header theme-parity assertions passed.');
