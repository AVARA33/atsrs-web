const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'product-updates-v6001.css'), 'utf8');
const updates = index.match(/<section id="introPage"[\s\S]*?<\/section>\s*<\/div>\s*<\/section>/)?.[0] || '';

test('Product Updates exposes a release-led information hierarchy', () => {
  assert.match(index, /product-updates-v6001\.css\?v=6001/);
  assert.match(updates, /LATEST RELEASES/);
  assert.match(updates, /DOCUMENTS &amp; CAREER PROFILE/);
  assert.match(updates, /CORPORATE &amp; ROADMAP/);
  assert.equal((updates.match(/class="roadmap-card/g) || []).length, 21);
});

test('status summary matches the capability card inventory', () => {
  assert.equal((updates.match(/status-available/g) || []).length, 18);
  assert.equal((updates.match(/status-development/g) || []).length, 1);
  assert.equal((updates.match(/status-planned/g) || []).length, 2);
  assert.match(updates, /<strong>18<\/strong><span>Available now<\/span>/);
});

test('new live directories and geography search are described precisely', () => {
  for (const label of ['International JobSearch', 'Recruiter Directory', 'Company Directory', 'In-account Plans, FAQ &amp; Contact']) {
    assert.match(updates, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(updates, /region, country and city/);
  assert.match(updates, /without leaving your account or losing the signed-in workspace/);
});

test('new Product Updates surface defines theme and responsive contracts', () => {
  assert.match(css, /data-theme="light"/);
  assert.match(css, /updates-status-board/);
  assert.match(css, /updates-featured-grid/);
  assert.match(css, /@media\(max-width:720px\)/);
});
