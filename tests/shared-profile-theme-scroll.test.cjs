const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'share-profile.css'), 'utf8');

assert.match(index, /css\/share-profile\.css\?v=507/);
assert.match(css, /html\.atsrs-public-share-mode body[\s\S]*?overflow-y:auto!important/);
assert.match(css, /\.shared-profile-page\{[\s\S]*?height:100dvh;[\s\S]*?overflow-y:auto/);
assert.match(css, /\.shared-document-summary\{[\s\S]*?padding:15px 18px 5px/);
assert.match(css, /\.shared-document-summary-list\{display:grid;grid-template-columns:1fr;max-height:384px[\s\S]*?overflow-y:auto/);
assert.match(css, /html\[data-theme="dark"\]\.atsrs-public-share-mode \.shared-profile-page[\s\S]*?background:#050606!important/);
assert.match(css, /html\[data-theme="light"\]\.atsrs-public-share-mode \.shared-profile-page[\s\S]*?background:#f6f8fb!important/);
assert.match(css, /html\[data-theme="light"\]\.atsrs-public-share-mode :is\([\s\S]*?\.shared-profile-head-actions button[\s\S]*?background:#ffffff!important/);
assert.match(css, /html\[data-theme="light"\]\.atsrs-public-share-mode \.shared-profile-meta span[\s\S]*?background:#f4f7f9!important/);
assert.match(css, /html\[data-theme="light"\]\.atsrs-public-share-mode \.shared-document-summary-tools select[\s\S]*?background-color:#ffffff!important/);
assert.match(css, /html\[data-theme="light"\]\.atsrs-public-share-mode body \.atsrs-select-menu[\s\S]*?background:#ffffff!important/);
assert.match(css, /html\[data-theme="light"\]\.atsrs-public-share-mode \.shared-document-summary-list[\s\S]*?scrollbar-color:#2563eb #edf3f6/);
assert.match(css, /html\[data-theme="light"\]\.atsrs-public-share-mode :is\([\s\S]*?\.shared-document-summary-status[\s\S]*?color:#2563eb!important/);
assert.match(css, /html\[data-theme="light"\]\.atsrs-public-share-mode \.shared-profile-note[\s\S]*?border-left-color:#2563eb!important/);
assert.match(css, /html\[data-theme="light"\]\.atsrs-public-share-mode body\.atsrs-public-share-view #sharedProfileSummaryFilter[\s\S]*?background:#ffffff!important/);

console.log('shared profile theme and scroll assertions passed');
