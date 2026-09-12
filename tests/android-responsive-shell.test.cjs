const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/android-responsive-v1.css'), 'utf8');

test('Android responsive layer is loaded after legacy shell styles', () => {
  const marker = 'css/android-responsive-v1.css?v=1';
  assert.ok(index.includes(marker));
  assert.ok(index.indexOf(marker) > index.indexOf('css/modal-interaction-guard.css'));
});

test('phone layout gives the main workspace the full viewport width', () => {
  assert.match(css, /@media \(max-width:720px\),/);
  assert.match(css, /grid-column:1!important/);
  assert.match(css, /width:100%!important/);
  assert.match(css, /sidebar\.v76-mobile-closed > \.nav[\s\S]*display:none!important/);
});

test('header controls use compact fixed targets without account text', () => {
  assert.match(css, /max-width:calc\(100vw - 124px\)!important/);
  assert.match(css, /workspace-switcher-copy,.workspace-switcher-chevron/);
  assert.match(css, /#workspaceSwitcherMenu[\s\S]*width:min\(280px,calc\(100vw - 16px\)\)!important/);
});

test('browser and installed app modes account for dynamic viewport and safe areas', () => {
  assert.match(css, /100dvh!important/);
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /@media \(display-mode:standalone\)/);
});

test('wide content remains locally scrollable instead of widening the page', () => {
  assert.match(css, /overflow-x:clip!important/);
  assert.match(css, /\.table-wrap[\s\S]*overflow-x:auto!important/);
  assert.match(css, /-webkit-overflow-scrolling:touch/);
});
