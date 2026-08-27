const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'js', 'avatar.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const instrumented = source.replace(
  '  window.atsrsProfilePhoto={',
  '  window.__profilePhotoIdentityTest={ensure:ensureRequiredProfileIdentity};\n  window.atsrsProfilePhoto={'
);

const window = {
  currentUser: { id: 'owner', user_metadata: {} },
  addEventListener() {},
};
window.window = window;
vm.runInNewContext(instrumented, {
  window,
  document: {
    readyState: 'loading',
    addEventListener() {},
    getElementById() { return null; },
  },
  localStorage: { getItem() { return null; }, setItem() {} },
  location: { origin: 'https://atsrs.com' },
  URL,
  console,
}, { filename: sourcePath });

const ensure = window.__profilePhotoIdentityTest.ensure;

const googleProfile = ensure({}, {
  user_metadata: { full_name: 'Jeyhun Suleymanli' },
});
assert.equal(googleProfile.name, 'Jeyhun');
assert.equal(googleProfile.surname, 'Suleymanli');

const structuredProfile = ensure({}, {
  user_metadata: { given_name: 'Jeyhun', family_name: 'Suleymanli' },
});
assert.equal(structuredProfile.name, 'Jeyhun');
assert.equal(structuredProfile.surname, 'Suleymanli');

const existingProfile = ensure({ name: 'Custom', surname: 'Name' }, {
  user_metadata: { full_name: 'Ignored Identity' },
});
assert.equal(existingProfile.name, 'Custom');
assert.equal(existingProfile.surname, 'Name');

assert.match(source, /profile=ensureRequiredProfileIdentity\(readProfile\(\),user\)/);

console.log('Profile photo required identity regression tests passed');
