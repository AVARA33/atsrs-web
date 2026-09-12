const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/ios-responsive-v1.css'), 'utf8');

test('iOS layer loads after the shared Android/mobile layer', () => {
  const shared = 'css/android-responsive-v1.css?v=1';
  const ios = 'css/ios-responsive-v1.css?v=1';
  assert.ok(index.includes(shared));
  assert.ok(index.includes(ios));
  assert.ok(index.indexOf(ios) > index.indexOf(shared));
});

test('Home Screen metadata and edge-to-edge viewport are declared', () => {
  assert.match(index, /viewport-fit=cover/);
  assert.match(index, /apple-mobile-web-app-capable" content="yes"/);
  assert.match(index, /apple-mobile-web-app-status-bar-style" content="black-translucent"/);
});

test('iOS rules are WebKit and touch scoped', () => {
  assert.match(css, /@supports \(-webkit-touch-callout:none\)/);
  assert.match(css, /hover:none/);
  assert.match(css, /pointer:coarse/);
});

test('Safari focus zoom and safe areas are controlled', () => {
  assert.match(css, /font-size:max\(16px,1em\)!important/);
  assert.match(css, /safe-area-inset-left/);
  assert.match(css, /safe-area-inset-right/);
  assert.match(css, /safe-area-inset-bottom/);
});

test('iPhone and iPad ranges have independent layout safeguards', () => {
  assert.match(css, /max-width:720px/);
  assert.match(css, /min-width:721px\) and \(max-width:1024px/);
  assert.match(css, /max-width:min\(190px,30vw\)!important/);
  assert.match(css, /display-mode:standalone/);
});
