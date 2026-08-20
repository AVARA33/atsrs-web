const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'js', 'talent-directory.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'talent-directory.css'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const instrumented = source.replace(
  "  if(document.readyState==='loading')",
  "  window.__candidateAvatarTest={avatarMarkup:avatarMarkup,hydrateAvatarFallbacks:hydrateAvatarFallbacks};\n  if(document.readyState==='loading')"
);

const documentStub = {
  readyState: 'loading',
  addEventListener() {},
  getElementById() { return null; }
};
const context = {
  window: {},
  document: documentStub,
  localStorage: { getItem() { return null; } },
  location: { origin: 'https://atsrs.test' },
  URL,
  console,
  setTimeout() { return 0; },
  setInterval() { return 0; },
  clearTimeout() {},
  clearInterval() {}
};
context.window.window = context.window;
context.window.addEventListener = () => {};
vm.runInNewContext(instrumented, context, { filename: sourcePath });

const api = context.window.__candidateAvatarTest;

const valid = api.avatarMarkup({
  name: 'Rustam',
  surname: 'Bayramov',
  avatar_url: 'https://cdn.example.test/avatar.png'
});
assert.match(valid, /talent-avatar-initials">RB</);
assert.match(valid, /data-avatar-src="https:\/\/cdn\.example\.test\/avatar\.png"/);
assert.match(valid, /loading="lazy"/);
assert.match(valid, /referrerpolicy="no-referrer"/);
assert.doesNotMatch(valid, /\ssrc=/, 'image URL must not render before load/error listeners are attached');

const empty = api.avatarMarkup({ name: 'Elvin', surname: 'Balayev', avatar_url: '' });
assert.match(empty, /talent-avatar-initials">EB</);
assert.doesNotMatch(empty, /<img/);

const unsafe = api.avatarMarkup({ name: '<script', surname: '"handler', avatar_url: 'javascript:alert(1)' });
assert.match(unsafe, /talent-avatar-initials">&lt;&quot;</);
assert.doesNotMatch(unsafe, /<img/);
assert.doesNotMatch(unsafe, /javascript:/);

function imageFixture(url) {
  const listeners = new Map();
  const classes = new Set();
  const parent = {
    classList: {
      add(value) { classes.add(value); },
      remove(value) { classes.delete(value); }
    }
  };
  const image = {
    parentElement: parent,
    removed: false,
    attributes: new Map([['data-avatar-src', url]]),
    getAttribute(name) { return this.attributes.get(name) || null; },
    removeAttribute(name) { this.attributes.delete(name); },
    addEventListener(name, callback) { listeners.set(name, callback); },
    remove() { this.removed = true; },
    src: ''
  };
  return { image, listeners, classes };
}

const loaded = imageFixture('https://cdn.example.test/avatar.png');
api.hydrateAvatarFallbacks({ querySelectorAll() { return [loaded.image]; } });
assert.equal(loaded.image.src, 'https://cdn.example.test/avatar.png');
assert.equal(loaded.image.attributes.has('data-avatar-src'), false);
assert.equal(loaded.classes.has('is-image-ready'), false);
loaded.listeners.get('load')();
assert.equal(loaded.classes.has('is-image-ready'), true);
assert.equal(loaded.image.removed, false);

const failed = imageFixture('https://cdn.example.test/missing.png');
api.hydrateAvatarFallbacks({ querySelectorAll() { return [failed.image]; } });
failed.listeners.get('error')();
assert.equal(failed.image.removed, true);
assert.equal(failed.classes.has('is-image-ready'), false);

assert.match(css, /\.talent-avatar img\{[^}]*opacity:0/);
assert.match(css, /\.talent-avatar\.is-image-ready img\{opacity:1\}/);
assert.match(css, /\.talent-avatar\.is-image-ready \.talent-avatar-initials\{visibility:hidden\}/);

assert.equal((source.match(/hydrateAvatarFallbacks\(grid\)/g) || []).length, 2, 'Cards and List must hydrate the shared avatar renderer');
assert.equal((source.match(/hydrateAvatarFallbacks\(list\)/g) || []).length, 1, 'Personnel must hydrate the shared avatar renderer');
assert.equal((source.match(/hydrateAvatarFallbacks\(modal\)/g) || []).length, 1, 'Candidate modal must hydrate the shared avatar renderer');
assert.match(index, /css\/talent-directory\.css\?v=573/);
assert.match(index, /js\/talent-directory\.js\?v=574/);

console.log('Candidate avatar fallback regression tests passed');
