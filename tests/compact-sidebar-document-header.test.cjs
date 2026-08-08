const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'css', 'sage-ledger.css'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'js', 'sage-ledger.js'), 'utf8');
const harness = fs.readFileSync(path.join(root, 'tests', 'fixtures', 'compact-sidebar-document-header-harness.html'), 'utf8');

assert.match(index, /css\/sage-ledger\.css\?v=450/, 'V450 compact navigation and table styles must bypass the production cache');
assert.match(runtime, /setNav\(byId\('navIntro'\),'Product Updates','sparkle'\)/, 'Product Updates must retain its Phosphor icon');
assert.match(styles, /\.nav>#navIntro\{[\s\S]*?gap:4px!important;[\s\S]*?padding-block:4px!important;/, 'Product Updates content must fit inside its compact row');
assert.match(styles, /\.nav>#navIntro \.sage-nav-label\{[\s\S]*?white-space:nowrap!important;[\s\S]*?font-size:10px!important;/, 'Product Updates label must stay on one line');
assert.match(styles, /\.atsrs-document-register thead th\{[\s\S]*?padding:6px 12px!important;[\s\S]*?white-space:nowrap!important;/, 'Document register headings must be compact and single-line');
assert.match(styles, /\.atsrs-document-register thead \.atsrs-document-sort>span:not\(\.atsrs-sort-arrows\)\{\s*white-space:nowrap!important;/, 'Sortable document labels must not wrap');
assert.match(harness, /ph ph-sparkle sage-nav-icon/, 'Visual harness must exercise the real Product Updates icon');
assert.match(harness, /css\/sage-ledger\.css\?v=450/, 'Visual harness must load the current production styles');

console.log('Compact sidebar icon and document header contracts passed');
