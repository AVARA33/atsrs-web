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
  for (const visual of ['offshore', 'energy', 'industrial', 'technology', 'development', 'infrastructure', 'science', 'hospitality', 'logistics', 'network']) {
    assert.match(css, new RegExp(`data-company-visual="${visual}"`));
  }
  for (const asset of ['energy-refinery.webp', 'telecom-towers.webp', 'coastal-development.webp', 'infrastructure-bridge.webp', 'hospitality-hotel.webp', 'science-laboratory.webp', 'offshore-energy.webp', 'logistics-port.webp', 'corporate-network.webp']) {
    const assetPath = path.join(root, 'assets', 'company-card-backgrounds', asset);
    assert.ok(fs.existsSync(assetPath), `${asset} should exist`);
    assert.ok(fs.statSync(assetPath).size < 100_000, `${asset} should stay optimized`);
    assert.match(css, new RegExp(asset.replace('.', '\\.')));
  }
  assert.doesNotMatch(css, /assets\/job-card-backgrounds|assets\/recruiter-card-backgrounds/);
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

test('V6181 cache-busts icon-only company actions', () => {
  assert.match(index, /data-atsrs-build="V6181"/);
  assert.match(index, /employers\.css\?v=6181/);
  assert.match(index, /route-feature-loader\.js\?v=6181/);
  assert.match(loader, /employers\.js\?v=6181/);
  assert.match(css, /grid-template-columns: repeat\(5, 40px\)/);
  assert.match(css, /#employersPage \.employer-actions :is\(a, button\) > span \{[\s\S]*?clip-path: inset\(50%\)/);
  assert.match(js, /link\.setAttribute\("aria-label", label\)/);
  assert.match(js, /button\.setAttribute\("aria-label", label\)/);
});
