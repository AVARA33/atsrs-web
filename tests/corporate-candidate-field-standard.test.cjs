const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'floating-field-standard-v58178.css'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'js', 'floating-fields.js'), 'utf8');
const fixture = fs.readFileSync(path.join(root, 'tests', 'fixtures', 'corporate-candidate-fields-harness.html'), 'utf8');

for (const id of ['talentSearch','talentPositionFilter','talentCountryFilter','talentAvailabilityFilter','talentWorkPreferenceFilter']) {
  assert.match(index, new RegExp(`id="${id}"`));
}
assert.match(runtime, /\.talent-work-type-filter > summary/);
assert.match(css, /\.atsrs-field-shell:focus-within/);
assert.doesNotMatch(css, /#candidatesPage[^\{]*\{[^\}]*#[0-9a-f]{3,8}/i);
for (const label of ['Search by name','Profession','Country','Availability','Work type']) assert.match(fixture,new RegExp(`>${label}<`));

console.log('Corporate Candidates uses the shared ATSRS field system');
