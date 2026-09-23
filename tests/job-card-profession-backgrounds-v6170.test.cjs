const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'js', 'jobs-prototype.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'jobs-prototype.css'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('V6170 assigns every job card a profession-aware visual category', () => {
  assert.match(js, /function jobVisualCategory\(job\)/);
  assert.match(js, /a\.dataset\.jobVisual=jobVisualCategory\(job\)/);
  for (const category of ['marine', 'technology', 'construction', 'healthcare', 'marketing', 'logistics', 'office']) {
    assert.match(css, new RegExp(`data-job-visual="${category}"`));
  }
});

test('profession artwork remains decorative and text-safe', () => {
  assert.match(css, /\.job-card::after\{[^}]*pointer-events:none/);
  assert.match(css, /linear-gradient\(90deg/);
  assert.match(css, /\.job-card>\*\{position:relative;z-index:1\}/);
  assert.match(js, /dialog\.dataset\.jobVisual=jobVisualCategory\(job\)/);
  assert.match(css, /\.job-detail-panel::before\{[^}]*pointer-events:none/);
});

test('all generated artwork files exist and stay lightweight', () => {
  for (const file of ['marine-rov.webp', 'technology-data.webp', 'construction-architecture.webp', 'healthcare-laboratory.webp', 'marketing-business.webp', 'logistics-transport.webp', 'education-office.webp']) {
    const full = path.join(root, 'assets', 'job-card-backgrounds', file);
    assert.ok(fs.existsSync(full), `${file} is missing`);
    assert.ok(fs.statSync(full).size < 100_000, `${file} should stay below 100 KB`);
  }
});

test('V6170 cache-busts the JobSearch assets', () => {
  assert.match(index, /data-atsrs-build="V6170"/);
  assert.match(index, /css\/jobs-prototype\.css\?v=6170/);
  const loader = fs.readFileSync(path.join(root, 'js', 'route-feature-loader.js'), 'utf8');
  assert.match(loader, /js\/jobs-prototype\.js\?v=6170/);
});
