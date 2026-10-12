const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('css/recruiters-copper-v6247.css', 'utf8');
const artworkCss = fs.readFileSync('css/recruiters-art-neutral-v6248.css', 'utf8');
const recruiterJs = fs.readFileSync('js/recruiters.js', 'utf8');
const routeLoader = fs.readFileSync('js/route-feature-loader.js', 'utf8');

test('V6263 loads recruiter copper overrides, neutral artwork, and shared copper edge standard before the Companies headline override', () => {
  assert.match(html, /data-atsrs-build="V6263"/);
  assert.match(html, /banner-visuals-white-v6246\.css\?v=6246[\s\S]*recruiters-copper-v6247\.css\?v=6263[\s\S]*recruiters-art-neutral-v6248\.css\?v=6248[\s\S]*copper-edge-standard-v6250\.css\?v=6250[\s\S]*company-banner-neutral-v6251\.css\?v=6251/);
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

test('recruiter card actions use a copper aura for hover and keyboard focus', () => {
  assert.match(css, /employer-actions > :is\(a, button\):not\(:disabled\):hover[\s\S]*?inset 0 0 0 1px #C06D45[\s\S]*?0 0 0 3px rgba\(172, 97, 59, \.18\)/);
  assert.match(css, /employer-actions > :is\(a, button\):focus-visible[\s\S]*?outline: 2px solid rgba\(192, 109, 69, \.72\)[\s\S]*?0 0 0 3px rgba\(172, 97, 59, \.18\)/);
  assert.match(css, /:hover > i \{[\s\S]*?color: #D58A63 !important/);
});

test('recruiter card action labels open as copper information panels', () => {
  assert.match(css, /employer-actions :is\(a, button\) > span \{[\s\S]*?bottom: calc\(100% \+ 10px\)[\s\S]*?border: 1px solid #AC613B[\s\S]*?background: #0B0C0D[\s\S]*?visibility: hidden/);
  assert.match(css, /:is\(a, button\):is\(:hover, :focus-visible\) > span \{[\s\S]*?opacity: 1 !important;[\s\S]*?visibility: visible !important/);
});

test('recruiter action metadata is accessible and LinkedIn never falls back to a vacancy source', () => {
  assert.match(routeLoader, /js\/recruiters\.js\?v=6263/);
  assert.match(recruiterJs, /function setActionInfo\(control, label\)/);
  assert.match(recruiterJs, /setAttribute\("aria-label", text\)/);
  assert.match(recruiterJs, /No verified personal LinkedIn profile is available/);
  assert.match(recruiterJs, /No active ATSRS offers/);
  assert.doesNotMatch(recruiterJs, /buttonLink\(recruiter\.profile_source_url/);
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
