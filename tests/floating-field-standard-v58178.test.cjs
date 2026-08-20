const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'floating-field-standard-v58178.css'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'js', 'floating-fields.js'), 'utf8');

assert.match(index, /data-atsrs-build="V5818"/);
assert.match(index, /floating-field-standard-v58178\.css\?v=58179/);
assert.match(index, /floating-fields\.js\?v=58179/);
assert.ok(index.indexOf('floating-fields.js?v=58179') > index.indexOf('select-open-position.js'), 'field runtime must run after select enhancement');

assert.match(runtime, /input:not\(\[type="hidden"\]\):not\(\[type="checkbox"\]\):not\(\[type="radio"\]\):not\(\[type="range"\]\):not\(\[type="file"\]\)/);
assert.match(runtime, /control\.parentElement&&control\.parentElement\.closest\('\.hidden,\[hidden\],\[aria-hidden="true"\]'\)/);
assert.match(runtime, /new MutationObserver\(schedule\)/);
assert.match(runtime, /attributeFilter:\['data-theme'\]/);
assert.match(runtime, /getComputedStyle\(node\)\.backgroundColor/);
assert.match(runtime, /--atsrs-field-label-surface/);
assert.match(runtime, /label\.htmlFor=control\.id/);
assert.doesNotMatch(runtime, /document\.createElement\('label'\);[\s\S]{0,180}shell\.appendChild\(frame\)/, 'interactive frames must not be nested in generated labels');

assert.match(css, /--atsrs-field-height:44px/);
assert.match(css, /--atsrs-field-radius:10px/);
assert.match(css, /align-self:start!important/);
assert.match(css, /\.atsrs-field-shell:not\(\.atsrs-field-textarea\)[\s\S]*height:var\(--atsrs-field-height\)!important/);
assert.match(css, /html\[data-theme="dark"\][\s\S]*--atsrs-field-accent:var\(--atsrs-brand-green,#22c55e\)/);
assert.match(css, /html\[data-theme="light"\][\s\S]*--atsrs-field-accent:var\(--atsrs-light-blue,#2563eb\)/);
assert.match(css, /transform:translateY\(-50%\)!important/);
assert.match(css, /background:var\(--atsrs-field-label-surface\)!important/);
assert.match(css, /\.atsrs-field-shell:focus-within/);
assert.match(css, /input:-webkit-autofill/);
assert.match(css, /@media\(max-width:620px\)/);
assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);

for (const id of ['jobsRoleFilter', 'jobsLocationFilter', 'crewSearch', 'crewCompanyFilter', 'crewPositionFilter', 'crewStatusFilter']) {
  assert.match(index, new RegExp(`id="${id}"`), `missing representative workspace control ${id}`);
}

console.log('V58178 site-wide floating field contracts passed');
