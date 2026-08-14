const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'workspace-control-standard-v522.css'), 'utf8');

assert.match(index, /data-atsrs-build="V525"/);
assert.match(index, /workspace-control-standard-v522\.css\?v=522-2/);
assert.match(css, /--atsrs-control-surface:var\(--atsrs-ref-dark-surface,#0b0d0d\)/);
assert.match(css, /#profilePage \.account-tabs button\[aria-selected="true"\]/);
assert.match(css, /background:var\(--atsrs-control-accent\)!important/);
assert.match(css, /:not\(\.active\)[\s\S]*:hover/);
assert.match(css, /#accountGeneralTab \.profile-contact-row \.phone-field/);
assert.match(css, /#profilePage \.access-request-card/);
assert.match(css, /\.workspace-switcher-button/);
assert.doesNotMatch(css, /html\[data-theme="light"\]/);

console.log('V522 Dark selectable control and account field contracts passed');
