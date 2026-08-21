const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'floating-field-standard-v58178.css'), 'utf8');
const fixture = fs.readFileSync(path.join(root, 'tests', 'fixtures', 'documents-dark-field-parity-harness.html'), 'utf8');

assert.match(index, /data-atsrs-build="V5846"/);
assert.match(index, /floating-field-standard-v58178\.css\?v=58204/);
assert.match(css, /body :where\(#app,#auth,\.share-public-page,dialog,\.modal\) \.atsrs-field-shell\{[\s\S]*border:var\(--atsrs-field-border-width\) solid var\(--atsrs-field-line\)!important;[\s\S]*background:var\(--atsrs-field-surface\)!important;[\s\S]*box-shadow:none!important/);
assert.match(css, /\.atsrs-field-shell:focus-within\{[\s\S]*border-color:var\(--atsrs-field-focus-block-line\) var\(--atsrs-field-focus-inline-line\)!important;[\s\S]*box-shadow:var\(--atsrs-field-focus-shadow\)!important/);
assert.match(css, /:is\(#profilePage,#certificatesPage,#jobsPage\) \.atsrs-field-shell :is\([\s\S]*input\.atsrs-field-control[\s\S]*\):focus-visible\{[\s\S]*outline:0!important;[\s\S]*outline-offset:0!important;[\s\S]*box-shadow:none!important/);
assert.doesNotMatch(css, /#certificatesPage \.atsrs-field-shell:focus-within/);
assert.match(fixture, /data-account-mode="personal"/);
assert.match(fixture, /data-account-mode="corporate"/);
for (const id of ['personalType','personalProvider','personalIssue','personalExpiry','personalFilter','corporatePerson','corporateType','corporateIssue','corporateExpiry','corporateFilter']) {
  assert.match(fixture, new RegExp(`id="${id}"`));
}

console.log('V5846 Personal and Corporate Documents shared field-system contracts passed');
