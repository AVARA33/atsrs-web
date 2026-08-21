const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css', 'floating-field-standard-v58178.css'), 'utf8');
const fixture = fs.readFileSync(path.join(root, 'tests', 'fixtures', 'documents-dark-field-parity-harness.html'), 'utf8');

assert.match(css, /\.atsrs-field-shell\{[\s\S]*border:var\(--atsrs-field-border-width\) solid var\(--atsrs-field-line\)!important/);
assert.match(css, /\.atsrs-field-shell:focus-within/);
assert.doesNotMatch(css, /#certificatesPage \.atsrs-field-shell:focus-within/);
for (const id of ['personalType','personalProvider','personalIssue','personalExpiry','personalFilter','corporatePerson','corporateType','corporateIssue','corporateExpiry','corporateFilter']) assert.match(fixture,new RegExp(`id="${id}"`));

console.log('Personal and Corporate Documents share one field system');
