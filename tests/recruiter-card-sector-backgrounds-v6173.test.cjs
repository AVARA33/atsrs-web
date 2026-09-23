const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css', 'recruiter-directory-v6029.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'js', 'recruiters.js'), 'utf8');
const loader = fs.readFileSync(path.join(root, 'js', 'route-feature-loader.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('recruiter cards receive a deterministic sector visual', () => {
  assert.match(js, /function recruiterVisual\(recruiter\)/);
  assert.match(js, /article\.dataset\.recruiterVisual = recruiterVisual\(recruiter\)/);
  for (const company of ['airswift', 'halliburton', 'orion group', 'slb', 'siemens energy', 'assystem', 'aecom', 'worley', 'eurofins', 'accor']) {
    assert.match(js, new RegExp(company.replace(/\s+/g, '\\s+'), 'i'));
  }
  assert.match(js, /return "network"/);
  assert.doesNotMatch(js, /Math\.random/);
});

test('recruiter artwork matches JobSearch strength without changing card dimensions', () => {
  assert.match(css, /#recruitersPage \.employer-card::after \{[\s\S]*?opacity:\.64;/);
  assert.match(css, /rgba\(var\(--recruiter-card-tone-rgb\),\.28\).*rgba\(var\(--recruiter-card-tone-rgb\),\.46\)/);
  assert.match(css, /#recruitersPage \.employer-card > \* \{ position:relative; z-index:1; \}/);
  assert.match(css, /#recruitersPage \.employer-card::before \{\s*z-index:2;/);
  assert.match(css, /min-height:108px/);
});

test('card interiors follow the existing green cyan purple and red accent rhythm', () => {
  for (const surface of ['#06160d', '#06151b', '#130b20', '#1b0c0a']) assert.match(css, new RegExp(surface));
  for (const tone of ['37,223,105', '40,215,215', '168,85,247', '239,90,80']) assert.match(css, new RegExp(tone));
  assert.match(css, /background:var\(--recruiter-card-surface,#08100c\)/);
  assert.doesNotMatch(css, /f472b6|244,114,182/i);
});

test('all sector mappings use deterministic optimized artwork and preserve light mode', () => {
  for (const visual of ['offshore', 'vessel', 'energy', 'infrastructure', 'science', 'hospitality', 'logistics', 'network']) {
    assert.match(css, new RegExp(`data-recruiter-visual="${visual}"`));
  }
  for (const asset of ['global-network.webp', 'offshore-platform.webp', 'energy-refinery.webp', 'offshore-vessel.webp']) {
    const assetPath = path.join(root, 'assets', 'recruiter-card-backgrounds', asset);
    assert.ok(fs.existsSync(assetPath), `${asset} should exist`);
    assert.ok(fs.statSync(assetPath).size < 100_000, `${asset} should stay optimized`);
    assert.match(css, new RegExp(asset.replace('.', '\\.')));
  }
  assert.match(css, /html\[data-theme="light"\] #recruitersPage \.employer-card::after/);
  assert.match(css, /opacity:\.38/);
});

test('light mode keeps full-card artwork and tinted card surfaces visible', () => {
  assert.match(css, /html\[data-theme="light"\] #recruitersPage \.employer-card \{[^}]*background:var\(--recruiter-card-light-surface,#fff\)/);
  assert.match(css, /html\[data-theme="light"\] #recruitersPage \.employer-card::after \{[\s\S]*?opacity:\.38;/);
  assert.match(css, /background-size:cover,cover,cover/);
});

test('V6180 preserves recruiter card CSS and runtime', () => {
  assert.match(index, /data-atsrs-build="V6180"/);
  assert.match(index, /recruiter-directory-v6029\.css\?v=6179/);
  assert.match(index, /route-feature-loader\.js\?v=6180/);
  assert.match(loader, /recruiters\.js\?v=6179/);
});
