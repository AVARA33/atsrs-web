const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'workspace-heading-standard-v520.css'), 'utf8');

assert.match(index, /data-atsrs-build="V5820"/);
assert.match(index, /workspace-heading-standard-v520\.css\?v=58156/);
assert.match(css, /html\[data-theme="dark"\] body:where\(\.personal-mode,\.company-mode\)/);
assert.match(css, /--atsrs-workspace-heading:var\(--atsrs-brand-green,#22c55e\)/);
assert.match(css, /:where\(h1,h2,h3,h4,h5,h6\)/);
assert.doesNotMatch(css, /html\[data-theme="light"\]/);
assert.match(css, /\.badge,[\s\S]*\.request-count,[\s\S]*\.roadmap-status/);

console.log('V520 Dark workspace heading contracts passed');
