const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'workspace-control-standard-v523.css'), 'utf8');

assert.match(index, /data-atsrs-build="V525"/);
assert.match(index, /workspace-control-standard-v523\.css\?v=523/);
assert.match(css, /#adminOverviewPanel\.admin-overview-panel/);
assert.match(css, /background:var\(--atsrs-v523-surface\)!important/);
assert.match(css, /\.admin-overview-stat/);
assert.match(css, /\.admin-overview-refresh:hover/);
assert.match(css, /\.phone-field > input:not\(\[type="hidden"\]\)/);
assert.match(css, /background:transparent!important/);
assert.match(css, /\.phone-code-display/);
assert.doesNotMatch(css, /html\[data-theme="light"\]/);

console.log('V523 Dark Profile completion contracts passed');
