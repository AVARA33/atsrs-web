const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'js/public-share-protection.js'), 'utf8');
const style = fs.readFileSync(path.join(root, 'css/public-share-protection.css'), 'utf8');

test('public share protection assets are versioned in the application shell', () => {
  assert.match(index, /css\/public-share-protection\.css\?v=1/);
  assert.match(index, /js\/public-share-protection\.js\?v=1/);
});

test('protection is scoped to public share URLs', () => {
  assert.match(script, /params\.has\('share'\)/);
  assert.match(script, /if \(!isPublicShare\(\)\) return/);
  assert.match(style, /html\.atsrs-public-share-mode/);
});

test('copy, save, print, context menu and dragging are intercepted', () => {
  for (const eventName of ['contextmenu', 'copy', 'cut', 'dragstart', 'selectstart', 'beforeprint']) {
    assert.match(script, new RegExp("['\"]" + eventName + "['\"]"));
  }
  assert.match(script, /key === 's'.*key === 'p'.*key === 'c'.*key === 'x'.*key === 'a'/s);
  assert.match(script, /key === 'printscreen'/);
});

test('dynamically rendered preview images and canvases are hardened', () => {
  assert.match(script, /MutationObserver/);
  assert.match(script, /#atsrsFilePreviewModal img, #atsrsFilePreviewModal canvas/);
  assert.match(script, /draggable = false/);
});

test('printing hides public share content', () => {
  assert.match(style, /@media print/);
  assert.match(style, /display: none !important/);
});
