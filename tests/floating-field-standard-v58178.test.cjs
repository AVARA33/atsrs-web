const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'floating-field-standard-v58178.css'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'js', 'floating-fields.js'), 'utf8');
const jobs = fs.readFileSync(path.join(root, 'css', 'jobs-prototype.css'), 'utf8');

assert.match(index, /data-atsrs-build="V5827"/);
assert.match(index, /floating-field-standard-v58178\.css\?v=58188/);
assert.match(index, /floating-fields\.js\?v=58187/);
assert.ok(index.indexOf('floating-fields.js?v=58187') > index.indexOf('select-open-position.js'));

for (const token of ['--field-bg','--field-border','--field-shadow','--field-label','--field-focus','--field-text','--field-placeholder','--field-icon','--field-radius','--field-height']) {
  assert.ok(css.includes(token), `missing semantic token ${token}`);
}
assert.match(css, /html\[data-theme="dark"\][\s\S]*--field-label:var\(--atsrs-brand-green,#22c55e\)/);
assert.match(css, /html\[data-theme="light"\][\s\S]*--field-label:var\(--atsrs-light-blue,#2563eb\)/);
assert.match(css, /box-shadow:var\(--field-shadow\)/);
assert.match(css, /box-shadow:var\(--field-focus-shadow\)/);
assert.match(css, /background:var\(--atsrs-field-label-surface,var\(--field-bg\)\)/);
assert.match(css, /height:var\(--field-height\)/);
assert.match(css, /border-radius:var\(--field-radius\)/);
assert.match(css, /\.atsrs-field-search-icon[\s\S]*right:12px/);
assert.match(css, /--field-search-suffix:54px/);
assert.match(css, /search-cancel-button\{margin-right:24px\}/);
assert.doesNotMatch(css, /!important/, 'canonical field CSS must resolve cascade without !important');

assert.match(runtime, /function ensureSearchSuffix\(shell,control\)/);
assert.match(runtime, /iconHost\.appendChild\(icon\)/);
assert.match(runtime, /shell\.classList\.add\('atsrs-search-field'\)/);
assert.match(runtime, /attributeFilter:\['class','disabled','aria-label','aria-labelledby','aria-expanded','open'\]/);
assert.match(runtime, /getComputedStyle\(node\)\.backgroundColor/);
assert.match(runtime, /--atsrs-field-label-surface/);
assert.doesNotMatch(runtime, /normalizeLegacyBox/);
assert.doesNotMatch(runtime, /style\.setProperty\([^\n]+important/);
assert.doesNotMatch(jobs, /jobs-search-control i\{position:absolute;left:/);

for (const id of ['jobsRoleFilter','jobsLocationFilter','crewSearch','crewCompanyFilter','crewPositionFilter','crewStatusFilter']) {
  assert.match(index, new RegExp(`id="${id}"`), `missing representative workspace control ${id}`);
}

assert.match(css, /grid-template-columns:minmax\(84px,112px\) minmax\(0,1fr\)/);

console.log('V5827 canonical soft field contracts passed');
