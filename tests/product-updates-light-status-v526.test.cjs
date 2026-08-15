const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'product-updates-light-status-v526.css'), 'utf8');

assert.match(index, /data-atsrs-build="V545"/);
assert.match(index, /product-updates-light-status-v526\.css\?v=526/);
assert.equal((index.match(/class="roadmap-status status-available"/g) || []).length, 18);
assert.equal((index.match(/class="roadmap-news(?: roadmap-premium)?"/g) || []).length, 4);
assert.match(css, /html\[data-theme="light"\][\s\S]*?\.roadmap-news\{[\s\S]*?--atsrs-light-blue/);
assert.match(css, /html\[data-theme="light"\][\s\S]*?\.status-available\{[\s\S]*?border-color:#cfe0ff!important;[\s\S]*?--atsrs-light-blue[\s\S]*?--atsrs-light-blue-soft/);
assert.doesNotMatch(css, /html\[data-theme="dark"\]/);
assert.doesNotMatch(css, /status-development|status-planned/);

console.log('V526 Light Product Updates blue live-status contracts passed');
