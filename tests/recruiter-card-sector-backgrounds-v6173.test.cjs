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
  for (const company of ['airswift', 'halliburton', 'orion group', 'slb', 'siemens energy', 'aecom', 'worley', 'eurofins', 'accor']) {
    assert.match(js, new RegExp(company.replace(/\s+/g, '\\s+'), 'i'));
  }
  assert.match(js, /return "network"/);
  assert.doesNotMatch(js, /Math\.random/);
});

test('recruiter artwork matches JobSearch strength without changing card dimensions', () => {
  assert.match(css, /#recruitersPage \.employer-card::after \{[\s\S]*?opacity:\.56;/);
  assert.match(css, /rgba\(8,16,12,\.99\).*rgba\(8,16,12,\.86\).*rgba\(8,16,12,\.30\)/);
  assert.match(css, /#recruitersPage \.employer-card > \* \{ position:relative; z-index:1; \}/);
  assert.match(css, /#recruitersPage \.employer-card::before \{\s*z-index:2;/);
  assert.match(css, /min-height:108px/);
});

test('all sector mappings reuse optimized JobSearch artwork and preserve light mode', () => {
  for (const visual of ['offshore', 'energy', 'infrastructure', 'science', 'hospitality', 'logistics', 'network']) {
    assert.match(css, new RegExp(`data-recruiter-visual="${visual}"`));
  }
  assert.match(css, /html\[data-theme="light"\] #recruitersPage \.employer-card::after/);
  assert.match(css, /opacity:\.22/);
});

test('V6174 cache-busts recruiter card CSS and runtime', () => {
  assert.match(index, /data-atsrs-build="V6174"/);
  assert.match(index, /recruiter-directory-v6029\.css\?v=6173/);
  assert.match(index, /route-feature-loader\.js\?v=6174/);
  assert.match(loader, /recruiters\.js\?v=6173/);
});
