const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('css/recruiters-copper-v6247.css', 'utf8');
const artworkCss = fs.readFileSync('css/recruiters-art-neutral-v6248.css', 'utf8');

test('V6259 loads recruiter copper overrides, neutral artwork, and shared copper edge standard before the Companies headline override', () => {
  assert.match(html, /data-atsrs-build="V6259"/);
  assert.match(html, /banner-visuals-white-v6246\.css\?v=6246[\s\S]*recruiters-copper-v6247\.css\?v=6247[\s\S]*recruiters-art-neutral-v6248\.css\?v=6248[\s\S]*copper-edge-standard-v6250\.css\?v=6250[\s\S]*company-banner-neutral-v6251\.css\?v=6251/);
});

test('recruiter banner uses the neutral black and copper palette', () => {
  assert.match(css, /#recruitersPage \.recruiters-hero \{[\s\S]*background: #0B0C0D !important;[\s\S]*inset 3px 0 0 #AC613B/);
  assert.match(css, /recruiters-hero-eyebrow[\s\S]*color: #C06D45 !important/);
});

test('all recruiter card variants share one graphite and copper treatment', () => {
  assert.match(css, /--recruiter-card-surface: #0B0C0D/);
  assert.match(css, /--recruiter-card-tone-rgb: 172, 97, 59/);
  assert.match(css, /--recruiter-card-border: #34383C/);
  assert.match(css, /border-top-color: #AC613B !important/);
  assert.match(css, /border-left-color: #AC613B !important/);
  assert.match(css, /linear-gradient\(90deg, rgba\(0, 0, 0, \.98\)/);
});

test('recruiter initials and status accents no longer use the legacy green palette', () => {
  assert.match(css, /\.employer-mark[\s\S]*background: #271E1A !important;[\s\S]*color: #F0B08E !important/);
  assert.match(css, /\.employer-verified-icon[\s\S]*color: #C06D45 !important/);
});

test('embedded recruiter card artwork is neutral instead of green', () => {
  assert.match(artworkCss, /#recruitersPage \.employer-card::after \{[\s\S]*filter: grayscale\(1\) saturate\(0\) brightness\(\.72\) contrast\(1\.14\) !important/);
  assert.match(artworkCss, /\.employers-notice i[\s\S]*color: #C06D45 !important/);
});

test('all directory banners, fields and cards share the same two-pixel copper edge', () => {
  const borderCss = fs.readFileSync('css/copper-edge-standard-v6250.css', 'utf8');
  assert.match(borderCss, /#jobsPage \.jobs-hero,[\s\S]*#recruitersPage \.recruiters-hero,[\s\S]*#employersPage \.company-directory-hero[\s\S]*border-width: 2px 1px 1px 2px !important/);
  assert.match(borderCss, /#jobsPage \.jobs-filters,[\s\S]*#recruitersPage \.employers-toolbar,[\s\S]*#employersPage \.employers-toolbar[\s\S]*border-width: 2px 1px 1px 2px !important/);
  assert.match(borderCss, /#jobsPage \.job-card,[\s\S]*#recruitersPage \.employer-card,[\s\S]*#employersPage \.employer-card[\s\S]*border-width: 2px 1px 1px 2px !important/);
});
