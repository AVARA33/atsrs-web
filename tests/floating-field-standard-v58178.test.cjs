const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'floating-field-standard-v58178.css'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'js', 'floating-fields.js'), 'utf8');

assert.match(index, /data-atsrs-build="V5846"/);
assert.match(index, /floating-field-standard-v58178\.css\?v=58204/);
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
assert.match(css, /--atsrs-field-focus-block-line:var\(--atsrs-field-line\)/);
assert.match(css, /--atsrs-field-focus-inline-line:var\(--atsrs-field-accent\)/);
assert.match(css, /--atsrs-field-hover-inline-line:var\(--atsrs-control-hover-border,#4b5d52\)/);
assert.match(css, /--atsrs-field-focus-shadow:-3px 0 0 var\(--atsrs-field-accent-ring\),3px 0 0 var\(--atsrs-field-accent-ring\),0 8px 20px var\(--atsrs-field-accent-shadow\)/);
assert.match(css, /html\[data-theme="light"\][\s\S]*--atsrs-field-focus-shadow:0 0 0 3px var\(--atsrs-field-accent-ring\),0 8px 20px var\(--atsrs-field-accent-shadow\)/);
assert.match(css, /#jobsPage \.atsrs-field-shell \.jobs-search-control > i\{[\s\S]*right:12px!important;[\s\S]*left:auto!important;[\s\S]*pointer-events:none!important/);
assert.match(css, /#jobsPage \.atsrs-field-shell \.jobs-search-control>input\{[\s\S]*height:calc\(var\(--atsrs-field-height\) - 2px\)!important;[\s\S]*min-height:calc\(var\(--atsrs-field-height\) - 2px\)!important;[\s\S]*padding-left:var\(--atsrs-field-inline-padding\)!important;[\s\S]*padding-right:40px!important;[\s\S]*border:0!important;[\s\S]*border-radius:calc\(var\(--atsrs-field-radius\) - 1px\)!important;[\s\S]*background:transparent!important/);
assert.match(css, /#jobsPage \.jobs-search\.atsrs-field-shell \.jobs-search-control>input:focus,[\s\S]*input:focus-visible\{[\s\S]*border:0!important;[\s\S]*outline:0!important;[\s\S]*outline-offset:0!important;[\s\S]*box-shadow:none!important/);
assert.match(css, /#jobsPage \.atsrs-field-shell \.jobs-select-toggle:focus,[\s\S]*\.jobs-select-toggle:focus-visible,[\s\S]*\.jobs-select-toggle\[aria-expanded="true"\]\{[\s\S]*border:0!important;[\s\S]*outline:0!important;[\s\S]*outline-offset:0!important;[\s\S]*box-shadow:none!important/);
assert.match(css, /\.atsrs-field-shell:focus-within\{[\s\S]*border-color:var\(--atsrs-field-focus-block-line\) var\(--atsrs-field-focus-inline-line\)!important;[\s\S]*box-shadow:var\(--atsrs-field-focus-shadow\)!important/);
assert.match(css, /@media\(hover:hover\)[\s\S]*\.atsrs-field-shell:hover:not\(:focus-within\)[\s\S]*border-right-color:var\(--atsrs-field-hover-inline-line\)!important;[\s\S]*border-left-color:var\(--atsrs-field-hover-inline-line\)!important/);
assert.match(css, /\.atsrs-field-shell:has\(:is\(\.talent-work-type-filter\[open\],\[aria-expanded="true"\]\)\)/);
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
assert.doesNotMatch(css, /#jobsPage \.atsrs-field-shell:focus-within/);
assert.doesNotMatch(css, /#certificatesPage \.atsrs-field-shell:focus-within/);

for (const id of ['jobsRoleFilter', 'jobsLocationFilter', 'crewSearch', 'crewCompanyFilter', 'crewPositionFilter', 'crewStatusFilter']) {
  assert.match(index, new RegExp(`id="${id}"`), `missing representative workspace control ${id}`);
}

console.log('V5846 shared ATSRS field-system and Jobs Search contracts passed');
