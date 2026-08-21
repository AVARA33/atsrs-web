const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'floating-field-standard-v58178.css'), 'utf8');
const fixture = fs.readFileSync(path.join(root, 'tests', 'fixtures', 'profile-work-availability-alignment-harness.html'), 'utf8');

assert.match(index, /data-atsrs-build="V5847"/);
assert.match(index, /floating-field-standard-v58178\.css\?v=58205/);
assert.match(css, /body\.personal-mode #app\.app #profilePage \.work-availability-grid>\.atsrs-field-shell\{\s*margin-top:0!important/);
for (const id of ['profileAvailabilityStatus', 'profileAvailableFromWrap', 'profileAvailableFrom', 'profileWorkPreferences', 'profileWorkPreferencesToggle']) {
  assert.match(fixture, new RegExp(`id="${id}"`));
}

console.log('V5847 Profile work-availability alignment contracts passed');
