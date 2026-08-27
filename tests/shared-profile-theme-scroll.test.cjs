const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'share-profile.css'), 'utf8');

assert.match(index, /css\/share-profile\.css\?v=499/);
assert.match(css, /html\.atsrs-public-share-mode body[\s\S]*?overflow-y:auto!important/);
assert.match(css, /\.shared-profile-page\{[\s\S]*?height:100dvh;[\s\S]*?overflow-y:auto/);
assert.match(css, /@media\(max-width:1100px\)[\s\S]*?\.shared-document-summary-list\{grid-template-columns:1fr\}/);
assert.match(css, /html\[data-theme="dark"\]\.atsrs-public-share-mode \.shared-profile-page[\s\S]*?background:#050606!important/);
assert.match(css, /html\[data-theme="light"\]\.atsrs-public-share-mode \.shared-profile-page[\s\S]*?background:#f6f8fb!important/);
assert.match(css, /html\[data-theme="light"\]\.atsrs-public-share-mode :is\([\s\S]*?\.shared-profile-head-actions button[\s\S]*?background:#ffffff!important/);

console.log('shared profile theme and scroll assertions passed');
