const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'public-landing.css'), 'utf8');

assert.match(index, /href="contact\.html">Contact<\/a>[\s\S]*?public-android-entry public-android-entry-desktop[\s\S]*?<\/nav>/);
assert.match(index, /public-header-actions[\s\S]*?public-android-entry public-android-entry-mobile[\s\S]*?data-public-theme-toggle/);
assert.equal((index.match(/role="status" aria-label="ATSRS for Android — coming soon"/g) || []).length, 2);
assert.match(index, /class="ph ph-android-logo"/);
assert.match(index, /<strong>Android<\/strong><small>Coming soon<\/small>/);
assert.match(css, /\.public-android-entry\{[\s\S]*?var\(--public-accent\)[\s\S]*?var\(--public-surface\)/);
assert.match(css, /html\[data-theme="dark"\] \.public-android-entry/);
assert.match(css, /\.public-cta-small\{[^}]*flex:0 0 auto[^}]*white-space:nowrap/);
assert.match(css, /\.public-android-entry-mobile\{display:none\}/);
assert.match(css, /@media\(max-width:1350px\) and \(min-width:721px\)[\s\S]*?\.public-nav\{display:none\}[\s\S]*?\.public-home-mobile,\.public-android-entry-mobile\{display:inline-flex\}/);
assert.match(css, /@media\(max-width:900px\) and \(min-width:721px\)\{\.public-header-actions>\.public-cta\{display:none\}\}/);
assert.match(css, /@media\(max-width:1500px\) and \(min-width:1051px\)[\s\S]*?\.public-android-copy small\{display:none\}/);
assert.match(css, /@media\(max-width:720px\)[\s\S]*?\.public-android-entry-mobile\{width:44px;min-width:44px/);
assert.match(css, /@media\(max-width:420px\)\{\.public-home-mobile\{display:none\}/);
assert.doesNotMatch(index, /\.apk(?:["?#]|$)/i);

console.log('Public Android header entry contracts passed');
