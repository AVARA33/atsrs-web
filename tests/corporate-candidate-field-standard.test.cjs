const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'floating-field-standard-v58178.css'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'js', 'floating-fields.js'), 'utf8');
const fixture = fs.readFileSync(path.join(root, 'tests', 'fixtures', 'corporate-candidate-fields-harness.html'), 'utf8');

assert.match(index, /data-atsrs-build="V5848"/);
assert.match(index, /floating-field-standard-v58178\.css\?v=5853/);
for (const id of ['talentSearch', 'talentPositionFilter', 'talentCountryFilter', 'talentAvailabilityFilter', 'talentWorkPreferenceFilter']) {
  assert.match(index, new RegExp(`id="${id}"`), `missing Corporate Candidates filter ${id}`);
}

assert.match(runtime, /\.talent-work-type-filter > summary/);
assert.match(runtime, /label\.textContent='Work type'/);
assert.match(css, /html\[data-theme="dark"\][\s\S]*--atsrs-field-focus-block-line:var\(--atsrs-field-line\)[\s\S]*--atsrs-field-focus-inline-line:var\(--atsrs-field-accent\)/);
assert.match(css, /html\[data-theme="light"\][\s\S]*--atsrs-field-focus-block-line:var\(--atsrs-field-accent\)[\s\S]*--atsrs-field-focus-inline-line:var\(--atsrs-field-accent\)/);
assert.match(css, /:is\(#profilePage,#certificatesPage,#jobsPage,#candidatesPage,#personnelPage,#projectsPage\) \.atsrs-field-shell :is\([\s\S]*input\.atsrs-field-control[\s\S]*\.atsrs-select-trigger[\s\S]*\):focus-visible\{[\s\S]*border:0!important;[\s\S]*outline:0!important;[\s\S]*box-shadow:none!important/);
assert.doesNotMatch(css, /#candidatesPage[^\{]*\{[^\}]*#[0-9a-f]{3,8}/i, 'Candidates must not add a page-specific hard-coded field color');
for (const label of ['Search by name', 'Profession', 'Country', 'Availability', 'Work type']) {
  assert.match(fixture, new RegExp(`>${label}<`), `missing rendered QA control ${label}`);
}

console.log('V5848 Corporate Candidates shared field-system contracts passed');
