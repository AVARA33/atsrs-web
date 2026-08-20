const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'workspace-control-standard-v523.css'), 'utf8');

assert.match(index, /data-atsrs-build="V5828"/);
assert.match(index, /workspace-control-standard-v523\.css\?v=58156/);
assert.match(css, /#adminOverviewPanel\.admin-overview-panel/);
assert.match(css, /background:var\(--atsrs-v523-surface\)!important/);
assert.match(css, /\.admin-overview-stat/);
assert.match(css, /\.admin-overview-refresh:hover/);
assert.match(css, /\.phone-code-display/);
assert.doesNotMatch(css, /\.phone-field > input:not\(\[type="hidden"\]\)/, 'canonical field standard owns phone inputs');
assert.doesNotMatch(css, /html\[data-theme="light"\]/);

console.log('V5828 V523 non-field surface contracts passed');
