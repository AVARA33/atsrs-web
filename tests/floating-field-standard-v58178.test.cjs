const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'floating-field-standard-v58178.css'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'js', 'floating-fields.js'), 'utf8');

assert.match(index, /floating-field-standard-v58178\.css\?v=/);
assert.match(index, /floating-fields\.js\?v=/);
assert.ok(index.indexOf('floating-fields.js') > index.indexOf('select-open-position.js'));

assert.match(css, /--atsrs-field-height:44px/);
assert.match(css, /--atsrs-field-radius:10px/);
assert.match(css, /--atsrs-field-label-surface:var\(--atsrs-field-surface\)/);
assert.match(css, /html\[data-theme="dark"\][\s\S]*--atsrs-field-accent:var\(--atsrs-brand-green,#22c55e\)/);
assert.match(css, /html\[data-theme="light"\][\s\S]*--atsrs-field-accent:var\(--atsrs-light-blue,#2563eb\)/);
assert.match(css, /--atsrs-field-focus-block-line:var\(--atsrs-field-line\)/);
assert.match(css, /--atsrs-field-focus-inline-line:var\(--atsrs-field-accent\)/);
assert.match(css, /--atsrs-field-focus-shadow:-3px 0 0 var\(--atsrs-field-accent-ring\),3px 0 0 var\(--atsrs-field-accent-ring\),0 8px 20px var\(--atsrs-field-accent-shadow\)/);
assert.match(css, /border-color:var\(--atsrs-field-focus-block-line\) var\(--atsrs-field-focus-inline-line\)!important/);
assert.match(css, /box-shadow:var\(--atsrs-field-focus-shadow\)!important/);
assert.match(css, /\.atsrs-field-search-icon/);
assert.match(css, /\.atsrs-field-chevron/);
assert.match(css, /\.atsrs-field-shell :where\(input,select,textarea,button,summary\):focus-visible/);
assert.doesNotMatch(css, /:is\(#profilePage,#certificatesPage,#jobsPage,#candidatesPage\)/);
assert.doesNotMatch(css, /#jobsPage \.atsrs-field-shell/);

assert.match(runtime, /function isSearch\(control\)/);
assert.match(runtime, /ph ph-magnifying-glass atsrs-field-search-icon/);
assert.match(runtime, /ph ph-caret-down atsrs-field-chevron/);
assert.match(runtime, /control\.readOnly/);
assert.doesNotMatch(runtime, /getComputedStyle\(node\)\.backgroundColor/);
assert.doesNotMatch(runtime, /function localSurface/);
assert.doesNotMatch(runtime, /function normalizeLegacyBox/);
assert.doesNotMatch(runtime, /style\.setProperty\([^\n]+important/);

console.log('ATSRS shared field tokens, states, adornments and semantic label masking passed');
