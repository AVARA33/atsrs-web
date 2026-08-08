const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'css', 'sage-ledger.css'), 'utf8');
const release = styles.slice(styles.indexOf('/* V445:'));

assert.match(index, /css\/sage-ledger\.css\?v=448/, 'V448 sidebar colors must bypass the production cache');
assert.match(release, /button\.active :is\(\.sage-nav-icon,\.sage-nav-label\)/, 'active sidebar icons and labels must share one foreground rule');
assert.match(release, /color:var\(--sage-accent-strong\)!important/, 'active sidebar foreground must use the sage accent token');
assert.match(release, /-webkit-text-fill-color:var\(--sage-accent-strong\)!important/, 'Chromium text fill must not retain the legacy blue color');
assert.match(styles, /button\.active\{[\s\S]*?box-shadow:inset 4px 0 var\(--sage-accent\)!important/, 'active sidebar indicator must remain sage');
assert.doesNotMatch(release.split('/* V444:')[0], /#1d4ed8|#2563eb|#eaf2ff|#cfe0ff/i, 'V445 must not reintroduce the legacy blue palette');

console.log('Sidebar active sage contracts passed');
