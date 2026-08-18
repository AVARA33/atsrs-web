const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'shell-polish.css'), 'utf8');

assert.match(index, /css\/shell-polish\.css\?v=572/);
assert.match(css, /\.atsrs-document-col-uploaded\{width:124px\}/);
assert.match(css, /\.atsrs-document-col-status\{width:144px\}/);
assert.match(css, /tbody td:is\(:nth-child\(4\),:nth-child\(5\)\)\{[\s\S]*?overflow:hidden!important/);
assert.match(css, /tbody td:nth-child\(6\)\{[\s\S]*?overflow:hidden!important[\s\S]*?overflow-wrap:anywhere[\s\S]*?white-space:normal!important/);
assert.doesNotMatch(css, /tbody td:is\(:nth-child\(4\),:nth-child\(5\),:nth-child\(6\)\)\{[\s\S]*?overflow:visible!important/);

console.log('Document register status layout contracts passed');
