const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css', 'jobs-prototype.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('JobSearch dark theme uses scoped warm black and copper tokens', () => {
  assert.match(css, /body:has\(#jobsPage:not\(\.hidden\)\)/);
  assert.match(css, /--jobs-copper:#ac613b/);
  assert.match(css, /--jobs-copper-hover:#c06d45/);
  assert.match(css, /--jobs-copper-soft:#271e1a/);
  assert.doesNotMatch(css, /html\[data-theme="dark"\]\s+body\s*\{\s*--jobs-copper/);
  assert.match(html, /data-atsrs-build="V6217"/);
  assert.match(html, /jobs-prototype\.css\?v=6217/);
  assert.match(css, /complete the reference palette across every visible JobSearch surface/);
  assert.match(css, /\.job-card\[data-job-visual\] \.job-card-company\{color:#f4f4f2!important/);
  assert.match(css, /\.job-card\[data-job-visual\] \.job-new-badge\{border-color:#b8653b!important;background:#b8653b!important/);
});

test('existing three-column grid and responsive behavior remain intact', () => {
  assert.match(css, /\.jobs-grid\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:1250px\).*?\.jobs-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/s);
  assert.match(css, /@media\(max-width:900px\).*?\.jobs-grid\{grid-template-columns:1fr/s);
});

test('real profession artwork mapping and light theme rules are preserved', () => {
  for (const asset of [
    'marine-rov.webp',
    'technology-data.webp',
    'construction-architecture.webp',
    'healthcare-laboratory.webp',
    'marketing-business.webp',
    'logistics-transport.webp',
    'education-office.webp'
  ]) assert.match(css, new RegExp(asset.replace('.', '\\.')));
  assert.match(css, /html\[data-theme="light"\]/);
});

test('mockup demo vacancies were not copied into production markup', () => {
  for (const demo of ['Oceaneering', 'TechnipFMC', 'Saipem', 'James Doyle']) {
    assert.equal(html.includes(demo), false, `${demo} must not be added to production markup`);
  }
});
