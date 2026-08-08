const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sage = fs.readFileSync(path.join(root, 'css', 'sage-ledger.css'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.match(index, /css\/sage-ledger\.css\?v=447/, 'V447 sage styles must bypass the production cache');
assert.match(sage, /solid sage controls always use a true white foreground in light mode/);
assert.match(sage, /\.workspace-switcher-avatar,[\s\S]*-webkit-text-fill-color:#fff!important/, 'The green account avatar needs a white Chromium text fill');
assert.match(sage, /:not\(\.sage-header-icon-button\):not\(\.atsrs-theme-toggle\)[^{]*\{[\s\S]*?-webkit-text-fill-color:#fff!important/, 'Green action controls need a white Chromium text fill without affecting ivory header controls');
assert.match(sage, /:is\(span,strong,b,i\)\{[\s\S]*?-webkit-text-fill-color:inherit!important/, 'Nested labels and icons must inherit the white foreground');
assert.match(sage, /#certificatesPage \.atsrs-document-sort,[\s\S]*?#certificatesPage \.atsrs-document-sort :is\(span,i\)\{[\s\S]*?-webkit-text-fill-color:#fff!important/, 'Document sort labels and arrows need a white Chromium text fill on sage');

console.log('Light green control contrast regression contracts passed');
