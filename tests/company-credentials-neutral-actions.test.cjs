const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css', 'corporate-information-architecture.css'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const selectedStart = css.indexOf('.company-credentials-tabs button[aria-selected="true"]{');
const uploadStart = css.indexOf('/* Corporate Company Credentials: reference uploads use the neutral action palette. */');
assert.notEqual(selectedStart, -1, 'The selected tab contract must exist');
assert.notEqual(uploadStart, -1, 'The page-scoped neutral upload contract must exist');

assert.match(css, /\.company-credentials-tabs button\[aria-selected="true"\][\s\S]*?font-weight:900!important;[\s\S]*?box-shadow:inset 0 -2px 0 #94a3b8!important;/);
assert.match(css, /html\[data-theme="light"\] body\.company-mode #app\.app \.main \.company-credentials-tabs button\[aria-selected="true"\][\s\S]*?box-shadow:inset 0 -2px 0 #475569!important;/);
assert.match(css, /body\.company-mode #app\.app \.main #refsPage \.atsrs-v134-upload/);
assert.match(css, /html\[data-theme="light"\] body\.company-mode #app\.app \.main #refsPage \.atsrs-v134-upload/);

assert.doesNotMatch(
  css,
  /linear-gradient|radial-gradient|#0f766e|#22c55e|#e7efff|#8fb0ff|#1649c8|#93c5fd|#bfdbfe|#2563eb|#0891b2/i,
  'Company Credentials ordinary actions must not use the previous green/blue fills, borders or text'
);
assert.doesNotMatch(css.slice(uploadStart), /(?:background|border-color|color):[^;]*(?:#ef4444|#dc2626|#f87171)/i);
assert.match(index, /data-atsrs-build="V429"/);
assert.match(index, /href="css\/corporate-information-architecture\.css\?v=421"/);

console.log('Company Credentials neutral action contracts passed');
