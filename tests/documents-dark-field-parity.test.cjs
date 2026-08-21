const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'floating-field-standard-v58178.css'), 'utf8');
const fixture = fs.readFileSync(path.join(root, 'tests', 'fixtures', 'documents-dark-field-parity-harness.html'), 'utf8');

assert.match(index, /data-atsrs-build="V5841"/);
assert.match(index, /floating-field-standard-v58178\.css\?v=58200/);
assert.match(css, /html\[data-theme="dark"\] body #app\.app #certificatesPage \.atsrs-field-shell\{[\s\S]*border:var\(--atsrs-field-border-width\) solid var\(--atsrs-field-line\)!important;[\s\S]*background:var\(--atsrs-field-surface\)!important;[\s\S]*box-shadow:none!important/);
assert.match(css, /#certificatesPage \.atsrs-field-shell :where\([\s\S]*input:not\(\[type="hidden"\]\)[\s\S]*select,[\s\S]*textarea,[\s\S]*\.atsrs-field-control,[\s\S]*\.atsrs-select-trigger[\s\S]*border:0!important;[\s\S]*background:transparent!important;[\s\S]*box-shadow:none!important/);
assert.match(css, /#certificatesPage \.atsrs-field-shell:focus-within\{[\s\S]*border-color:var\(--atsrs-field-accent\)!important;[\s\S]*box-shadow:0 0 0 3px var\(--atsrs-field-accent-ring\),0 8px 20px var\(--atsrs-field-accent-shadow\)!important/);
assert.match(fixture, /data-account-mode="personal"/);
assert.match(fixture, /data-account-mode="corporate"/);
for (const id of ['personalType','personalProvider','personalIssue','personalExpiry','personalFilter','corporatePerson','corporateType','corporateIssue','corporateExpiry','corporateFilter']) {
  assert.match(fixture, new RegExp(`id="${id}"`));
}

console.log('V5841 Personal and Corporate Documents dark field parity contracts passed');
