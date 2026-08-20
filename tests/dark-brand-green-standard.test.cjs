const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('index.html');
const palette = read('css/theme-palette-v508.css');
const surfaces = read('css/dark-surface-standard-v58154.css');
const controls = read('css/workspace-control-standard-v522.css');
const nativeSelects = read('css/native-select-theme-v539.css');
const jobs = read('css/jobs-prototype.css');
const dashboard = read('css/personal-dashboard-qa.css');
const headings = read('css/workspace-heading-standard-v520.css');

assert.match(palette, /--atsrs-brand-green:#22c55e/);
assert.match(palette, /--atsrs-brand-green-strong:#16a34a/);
assert.match(palette, /--atsrs-ref-lime:#22c55e/);
assert.match(palette, /--atsrs-ref-lime-strong:#16a34a/);
assert.doesNotMatch(palette, /#b8ff19|#9fe600|rgba\(184,255,25/);

assert.match(palette, /body:where\(\.personal-mode,\.company-mode\)/);
assert.match(surfaces, /\.account-tabs button\.active,\.module-tabs button\.active[\s\S]*?color:#22c55e!important/);
assert.match(controls, /rgba\(34,197,94,\.08\)/);
assert.match(nativeSelects, /--atsrs-menu-accent:#22c55e/);
assert.match(jobs, /--atsrs-jobs-green-text:var\(--atsrs-brand-green,#22c55e\)/);
assert.doesNotMatch(jobs, /--atsrs-jobs-green-text:#9ad315/);
assert.match(dashboard, /corporate-personnel-summary-card\{--expiry-signal:var\(--atsrs-brand-green,#22c55e\)/);
assert.match(headings, /--atsrs-workspace-heading:var\(--atsrs-brand-green,#22c55e\)/);

for (const [asset, version] of [
  ['workspace-control-standard-v522.css', '58155'],
  ['workspace-control-standard-v523.css', '58155'],
  ['native-select-theme-v539.css', '58171'],
  ['dark-surface-standard-v58154.css', '58155'],
  ['theme-palette-v508.css', '58170'],
  ['workspace-heading-standard-v520.css', '58156'],
  ['personal-dashboard-qa.css', '58156'],
  ['jobs-prototype.css', '58168']
]) {
  assert.ok(html.includes(`${asset}?v=${version}`), `${asset} must use the V${version} cache marker`);
}

console.log('Dark brand green standard contracts passed');
