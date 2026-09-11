const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'share-profile.css'), 'utf8');

assert.match(html, /class="shared-profile-topbar-actions"/);
assert.match(html, /class="shared-profile-home-link" href="https:\/\/atsrs\.com\/">Visit ATSRS\.com<\/a>/);
assert.match(html, /css\/share-profile\.css\?v=6098/);

assert.match(css, /data-theme="light"[^\{]*\.shared-profile-brand\{[^}]*color:#167bd3!important/s);
assert.match(css, /data-theme="dark"[^\{]*\.shared-profile-home-link\{[^}]*color:#eef2ef!important/s);
assert.match(css, /\.shared-document-summary-list\{[^}]*scrollbar-gutter:stable/s);
assert.match(css, /\.shared-document-summary-list\{[^}]*padding:0 10px 0 8px/s);
assert.match(css, /\.shared-document-summary-link\{[^}]*grid-template-columns:32px minmax\(0,1fr\) max-content/s);
assert.match(css, /@media\(max-width:520px\)[\s\S]*\.shared-document-summary-link\{[^}]*grid-template-columns:24px minmax\(0,1fr\) max-content/s);

console.log('shared profile header and summary spacing contract: ok');
