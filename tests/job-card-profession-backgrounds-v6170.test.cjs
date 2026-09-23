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

test('V6177 cache-busts the profession-aware JobSearch card styles', () => {
  assert.match(index, /data-atsrs-build="V6177"/);
  assert.match(index, /css\/jobs-prototype\.css\?v=6177/);
  const loader = fs.readFileSync(path.join(root, 'js', 'route-feature-loader.js'), 'utf8');
  assert.match(loader, /js\/jobs-prototype\.js\?v=6170/);
});

test('every profession category has a non-pink accent applied to its artwork layer', () => {
  for (const colour of ['#22d3ee', '#38bdf8', '#fb923c', '#34d399', '#14b8a6', '#f59e0b', '#22c55e']) {
    assert.match(css, new RegExp(colour));
  }
  assert.match(css, /\.job-card::after\{[^}]*rgba\(var\(--job-card-accent-rgb\),\.46\)[^}]*opacity:\.64/);
  assert.match(css, /\.job-card\[data-job-visual\]\{[^}]*--atsrs-jobs-green-text:var\(--job-card-accent\)/);
  assert.match(css, /html\[data-theme="dark"\] #jobsPage \.job-card\[data-job-visual\]\{background:var\(--job-card-surface\)\}/);
  assert.match(css, /html\[data-theme="light"\] #jobsPage \.job-card\[data-job-visual\]\{background:var\(--job-card-light-surface\)/);
  assert.match(css, /html\[data-theme="light"\] \.job-card::after\{[^}]*opacity:\.52/);
  assert.doesNotMatch(css, /#(?:f472b6|a78bfa)|(?:244,114,182|167,139,250)/i);
});
