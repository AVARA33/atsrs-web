const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'js', 'avatar.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const instrumented = source.replace(
  "  window.atsrsProfilePhoto={render:render,hydrate:hydrateIdentityPhoto,currentUrl:function(){return resolvedUrl(readProfile())}",
  "  window.__profilePhotoUrlTest={allowedUrl:allowedUrl,resolvedUrl:resolvedUrl};\n  window.atsrsProfilePhoto={render:render,hydrate:hydrateIdentityPhoto,currentUrl:function(){return resolvedUrl(readProfile())}",
);

const window = {
  currentUser: { id: 'owner', user_metadata: {} },
  addEventListener() {},
};
window.window = window;
const context = {
  window,
  document: { readyState: 'loading', addEventListener() {}, getElementById() { return null; } },
  localStorage: { getItem() { return null; }, setItem() {} },
  location: { origin: 'https://atsrs.com' },
  URL,
  console,
};
vm.runInNewContext(instrumented, context, { filename: sourcePath });

const api = window.__profilePhotoUrlTest;
assert.equal(api.allowedUrl(''), '', 'an empty avatar must not resolve to the ATSRS homepage');
assert.equal(api.allowedUrl(null), '', 'a null avatar must remain empty');
assert.equal(api.allowedUrl('javascript:alert(1)'), '', 'unsafe avatar schemes must be rejected');
assert.equal(api.allowedUrl('https://cdn.example.test/avatar.webp'), 'https://cdn.example.test/avatar.webp');
assert.equal(api.resolvedUrl({ avatarUrl: '', avatarPath: '', avatarSource: '' }), '',
  'an owner without a photo must not publish the site origin as avatar_url');
assert.match(index, /data-atsrs-build="V5878"/);
assert.match(index, /js\/avatar\.js\?v=376/);

console.log('Profile photo empty URL regression tests passed');
