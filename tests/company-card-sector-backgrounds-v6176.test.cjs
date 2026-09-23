const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css', 'employers.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'js', 'employers.js'), 'utf8');
const loader = fs.readFileSync(path.join(root, 'js', 'route-feature-loader.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('company cards receive deterministic industry artwork and tones', () => {
  assert.match(js, /function companyVisual\(company, data\)/);
  assert.match(js, /article\.dataset\.companyVisual = visual\.art/);
  assert.match(js, /article\.dataset\.companyTone = visual\.tone/);
  for (const company of ['saudi aramco', 'sabic', 'stc', 'neom', 'aecom', 'halliburton']) {
    assert.match(js, new RegExp(company.replace(/\s+/g, '\\s+'), 'i'));
  }
  assert.match(js, /return \{ art: "network", tone: "green" \}/);
  assert.doesNotMatch(js, /Math\.random/);
});

test('every supported company industry has a full-card visual', () => {
  for (const visual of ['offshore', 'energy', 'industrial', 'technology', 'infrastructure', 'science', 'hospitality', 'logistics', 'network']) {
    assert.match(css, new RegExp(`data-company-visual="${visual}"`));
  }
  assert.match(css, /#employersPage \.employer-card::after \{[\s\S]*?opacity: \.56;/);
  assert.match(css, /background-size: cover, cover, cover/);
});

test('company card tone system includes reference colors without pink', () => {
  for (const tone of ['cyan', 'purple', 'red', 'amber']) {
    assert.match(css, new RegExp(`data-company-tone="${tone}"`));
  }
  assert.match(css, /--company-card-surface-rgb/);
  assert.match(css, /background: rgb\(var\(--company-card-surface-rgb\)\)/);
  assert.doesNotMatch(css, /f472b6|244,114,182/i);
});

test('light mode preserves visible artwork and readable pale surfaces', () => {
  assert.match(css, /html\[data-theme="light"\] #employersPage \.employer-card \{[\s\S]*?background: var\(--company-card-light-surface\)/);
  assert.match(css, /html\[data-theme="light"\] #employersPage \.employer-card::after \{[\s\S]*?opacity: \.48;/);
});

test('V6176 cache-busts company card CSS and runtime', () => {
  assert.match(index, /data-atsrs-build="V6176"/);
  assert.match(index, /employers\.css\?v=6176/);
  assert.match(index, /route-feature-loader\.js\?v=6176/);
  assert.match(loader, /employers\.js\?v=6176/);
});
