const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const videoCss = fs.readFileSync(path.join(root, 'css', 'home-videos.css'), 'utf8');

test('V6259 uses copper product screenshots on the permanent dark homepage', () => {
  assert.match(html, /data-atsrs-build="V6259"/);

  for (const asset of [
    'personal-dashboard-copper-v6259.png',
    'candidate-directory-copper-v6259.png',
    'corporate-personnel-copper-v6259.png',
  ]) {
    assert.match(html, new RegExp(`public-theme-preview-dark[^>]+${asset.replace(/\./g, '\\.')}`));
    assert.ok(fs.statSync(path.join(root, 'assets', 'landing', asset)).size > 0, `${asset} must exist`);
  }

  assert.doesNotMatch(html, /public-theme-preview-dark[^>]+(?:personal-dashboard|candidate-directory|corporate-personnel)-dark\.png/);
});

test('V6259 home video cards use copper instead of the legacy green treatment', () => {
  assert.match(html, /css\/home-videos\.css\?v=6259/);
  assert.match(videoCss, /border:1px solid #ac613b!important/);
  assert.match(videoCss, /background:#c06d45/);
  assert.doesNotMatch(videoCss, /#52734b|#a1f65c|#83c96c|#76ba57|rgba\(94,150,72/);
});
