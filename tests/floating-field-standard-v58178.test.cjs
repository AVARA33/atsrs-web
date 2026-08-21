const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'floating-field-standard-v58178.css'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'js', 'floating-fields.js'), 'utf8');

assert.match(index, /data-atsrs-build="V5831"/);
assert.match(index, /floating-field-standard-v58178\.css\?v=58190/);
assert.match(index, /floating-fields\.js\?v=58185/);
assert.ok(index.indexOf('floating-fields.js?v=58185') > index.indexOf('select-open-position.js'), 'field runtime must run after select enhancement');

assert.match(runtime, /input:not\(\[type="hidden"\]\):not\(\[type="checkbox"\]\):not\(\[type="radio"\]\):not\(\[type="range"\]\):not\(\[type="file"\]\)/);
assert.match(runtime, /control\.parentElement&&control\.parentElement\.closest\('\.hidden,\[hidden\],\[aria-hidden="true"\]'\)/);
assert.match(runtime, /new MutationObserver\(schedule\)/);
assert.match(runtime, /attributeFilter:\['data-theme'\]/);
assert.match(runtime, /getComputedStyle\(node\)\.backgroundColor/);
assert.match(runtime, /--atsrs-field-label-surface/);
assert.match(runtime, /label\.htmlFor=control\.id/);
assert.match(runtime, /jobsHost\.querySelector\('\.jobs-select-toggle'\)\|\|control/);
assert.match(runtime, /function normalizeLegacyBox\(node,isControl\)/);
assert.match(runtime, /style\.setProperty\('border','0','important'\)/);
assert.match(runtime, /\.talent-work-type-filter > summary/);
assert.match(runtime, /label\.textContent='Work type'/);
assert.match(runtime, /v134_appraisal_filter:'Sort appraisals'/);
assert.match(runtime, /if\(frame!==shell\)normalizeLegacyBox\(frame,false\)/);
assert.doesNotMatch(runtime, /document\.createElement\('label'\);[\s\S]{0,180}shell\.appendChild\(frame\)/, 'interactive frames must not be nested in generated labels');

assert.match(css, /--atsrs-field-height:44px/);
assert.match(css, /--atsrs-field-radius:10px/);
assert.match(css, /align-self:start!important/);
assert.match(css, /padding:12px var\(--atsrs-field-inline-padding\) 4px!important/);
assert.match(css, /\.atsrs-field-shell:not\(\.atsrs-field-textarea\)[\s\S]*height:var\(--atsrs-field-height\)!important/);
assert.match(css, /html\[data-theme="dark"\][\s\S]*--atsrs-field-accent:var\(--atsrs-brand-green,#22c55e\)/);
assert.match(css, /html\[data-theme="light"\][\s\S]*--atsrs-field-accent:var\(--atsrs-light-blue,#2563eb\)/);
assert.match(css, /#jobsPage \.atsrs-field-shell \.jobs-search-control > i\{[\s\S]*right:12px!important;[\s\S]*left:auto!important;[\s\S]*pointer-events:none!important/);
assert.match(css, /#jobsPage \.atsrs-field-shell \.jobs-search-control > input\{[\s\S]*padding-left:var\(--atsrs-field-inline-padding\)!important;[\s\S]*padding-right:40px!important/);
assert.match(css, /\.atsrs-field-shell:focus-within\{[\s\S]*border-color:var\(--atsrs-field-accent\)!important;[\s\S]*box-shadow:0 0 0 3px var\(--atsrs-field-accent-ring\),0 8px 20px var\(--atsrs-field-accent-shadow\)!important/);
assert.match(css, /transform:translateY\(-50%\)!important/);
assert.match(css, /background:var\(--atsrs-field-label-surface\)!important/);
assert.match(css, /\.atsrs-field-shell:focus-within/);
assert.match(css, /input:-webkit-autofill/);
assert.match(css, /@media\(max-width:620px\)/);
assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
assert.match(css, /grid-template:minmax\(0,1fr\)\/minmax\(0,1fr\)!important/);
assert.match(css, /html body #app \.atsrs-field-shell[\s\S]*\.jobs-select-toggle/);
assert.match(css, /0 8px 20px var\(--atsrs-field-accent-shadow\)/);
assert.match(css, /html\[data-theme\] body #app\.app \.atsrs-field-shell:focus-within/);

for (const id of ['jobsRoleFilter', 'jobsLocationFilter', 'crewSearch', 'crewCompanyFilter', 'crewPositionFilter', 'crewStatusFilter']) {
  assert.match(index, new RegExp(`id="${id}"`), `missing representative workspace control ${id}`);
}

console.log('V5831 Jobs search focus and icon alignment contracts passed');
