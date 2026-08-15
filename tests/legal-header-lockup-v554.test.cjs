const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sharedPages = ['data-protection.html', 'terms.html', 'security.html'];
const inlinePages = ['privacy.html', 'data-deletion.html'];

for (const page of sharedPages) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  assert.match(html, /css\/legal-public\.css\?v=554/);
  assert.match(html, /class="legal-brand"[^>]+aria-label="ATSRS — Applicant Tracking System &amp; Recruitment Solutions"><\/a>/);
  assert.doesNotMatch(html, /class="legal-brand"[^>]*>ATSRS<\/a>/);
}

for (const page of inlinePages) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  assert.match(html, /class="brand"[^>]+aria-label="ATSRS — Applicant Tracking System &amp; Recruitment Solutions"><\/a>/);
  assert.doesNotMatch(html, /class="brand"[^>]*>ATSRS<\/a>/);
  assert.match(html, /atsrs-lockup-green-transparent\.png/);
  assert.match(html, /atsrs-lockup-blue-transparent\.png/);
  assert.match(html, /aspect-ratio:1108 \/ 384/);
  assert.match(html, /@media\(max-width:600px\)[\s\S]*?\.brand\{width:168px\}/);
}

const css = fs.readFileSync(path.join(root, 'css', 'legal-public.css'), 'utf8');
assert.match(css, /\.legal-brand\s*\{[\s\S]*?width:clamp\(176px,17vw,218px\)/);
assert.match(css, /aspect-ratio:1108 \/ 384/);
assert.match(css, /atsrs-lockup-green-transparent\.png/);
assert.match(css, /html\[data-theme="light"\] \.legal-brand[\s\S]*?atsrs-lockup-blue-transparent\.png/);

console.log('V554 legal header lockup contracts passed');
