const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'public-landing.css'), 'utf8');

assert.match(index, /public-header-actions[\s\S]*?public-android-entry[\s\S]*?data-public-theme-toggle/);
assert.match(index, /role="status" aria-label="ATSRS for Android — coming soon"/);
assert.match(index, /class="ph ph-android-logo"/);
assert.match(index, /<strong>Android<\/strong><small>Coming soon<\/small>/);
assert.match(css, /\.public-android-entry\{[\s\S]*?var\(--public-accent\)[\s\S]*?var\(--public-surface\)/);
assert.match(css, /html\[data-theme="dark"\] \.public-android-entry/);
assert.match(css, /@media\(max-width:1500px\) and \(min-width:1051px\)[\s\S]*?\.public-android-copy small\{display:none\}/);
assert.match(css, /@media\(max-width:720px\)[\s\S]*?\.public-android-entry\{width:44px;min-width:44px/);
assert.match(css, /@media\(max-width:420px\)\{\.public-home-mobile\{display:none\}/);
assert.doesNotMatch(index, /\.apk(?:["?#]|$)/i);

console.log('Public Android header entry contracts passed');
