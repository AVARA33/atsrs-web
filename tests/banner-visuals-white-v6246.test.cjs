const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('css/banner-visuals-white-v6246.css', 'utf8');

test('V6259 keeps the shared white banner artwork treatment before page-specific copper overrides', () => {
  assert.match(html, /data-atsrs-build="V6259"/);
  assert.match(html, /jobsearch-banner-copper-v6245\.css\?v=6245[\s\S]*banner-visuals-white-v6246\.css\?v=6246/);
});

test('JobSearch map becomes neutral white without changing its real asset', () => {
  assert.match(css, /#jobsPage \.jobs-hero-map/);
  assert.match(css, /grayscale\(1\) saturate\(0\) brightness\(2\.05\)/);
  assert.doesNotMatch(css, /background\s*:/);
});

test('Recruiters and Companies share the same neutral banner-art direction', () => {
  assert.match(css, /#recruitersPage \.recruiters-hero-visual/);
  assert.match(css, /#employersPage \.company-hero-backdrop/);
  assert.match(css, /#employersPage \.company-network-reference/);
  assert.match(css, /grayscale\(1\) saturate\(0\)/);
});
