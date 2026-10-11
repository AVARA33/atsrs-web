const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'jobsearch-banner-copper-v6245.css'), 'utf8');

test('V6250 keeps the restored JobSearch banner after the site-wide copper theme', () => {
  assert.match(html, /data-atsrs-build="V6250"/);
  assert.match(html, /css\/app-copper-theme-v6243\.css\?v=6244[\s\S]*css\/jobsearch-banner-copper-v6245\.css\?v=6245/);
  assert.match(html, /class="jobs-hero"[\s\S]*class="jobs-hero-map"[\s\S]*id="jobsRegionNav"[\s\S]*class="jobs-snapshot"/);
});

test('banner uses the accepted black graphite and copper card palette', () => {
  assert.match(css, /#jobsPage \.jobs-hero\{[\s\S]*min-height:236px[\s\S]*border-top-color:#AC613B[\s\S]*border-right-color:#34383C[\s\S]*background:#0B0C0D/);
  assert.match(css, /\.jobs-hero-map\{[\s\S]*international-job-map-v1\.png[\s\S]*display:block/);
  assert.match(css, /\.jobs-hero-icon\{[\s\S]*color:#C06D45/);
  assert.match(css, /\.jobs-hero > \.jobs-region-nav\{[\s\S]*display:flex/);
  assert.match(css, /\.jobs-hero > \.jobs-snapshot\{[\s\S]*position:absolute/);
});

test('banner remains compact and functional on narrow screens', () => {
  assert.match(css, /@media\(max-width:600px\)[\s\S]*#jobsPage \.jobs-hero\{[\s\S]*padding:20px 18px 64px/);
  assert.match(css, /@media\(max-width:600px\)[\s\S]*#jobsPage \.jobs-hero-content\{padding-top:34px\}/);
  assert.match(css, /@media\(max-width:600px\)[\s\S]*#jobsPage \.jobs-hero > \.jobs-region-nav\{right:18px;bottom:14px;left:18px\}/);
});
