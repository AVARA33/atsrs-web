const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'product-updates-theme-parity-v544.css'), 'utf8');

assert.match(index, /data-atsrs-build="V553"/);
assert.match(index, /href="css\/product-updates-theme-parity-v544\.css\?v=544"/);
assert.match(css, /\.roadmap-heading > p\{[\s\S]*?width:520px!important;[\s\S]*?font-size:16px!important;[\s\S]*?line-height:1\.5!important/);
assert.match(css, /\.roadmap-grid\{[\s\S]*?gap:14px!important/);
assert.match(css, /\.roadmap-card > \.roadmap-icon\{[\s\S]*?width:42px!important;[\s\S]*?height:42px!important;[\s\S]*?border-radius:12px!important/);
assert.match(css, /\.roadmap-card > h3\{[\s\S]*?font-size:18px!important;[\s\S]*?line-height:1\.35!important/);
assert.match(css, /\.roadmap-card > p\{[\s\S]*?font-size:16px!important;[\s\S]*?line-height:1\.55!important/);
assert.match(css, /\.roadmap-status\{[\s\S]*?padding:5px 8px!important;[\s\S]*?font-size:10px!important/);
assert.doesNotMatch(css, /data-theme="(?:light|dark)"/);

console.log('V544 Product Updates theme parity contracts passed');
