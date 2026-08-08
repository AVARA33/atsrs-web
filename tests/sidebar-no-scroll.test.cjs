const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'css', 'sage-ledger.css'), 'utf8');
const release = styles.slice(styles.indexOf('/* V444:'));

assert.match(index, /css\/sage-ledger\.css\?v=445/, 'V445 sidebar styles must bypass the production cache');
assert.match(release, /@media\(min-width:801px\)[\s\S]*?overflow:hidden!important/, 'desktop sidebar must not expose an internal scrollbar');
assert.match(release, />\.sidebar \.nav\{[\s\S]*?flex:1 1 auto!important[\s\S]*?min-height:0!important/, 'desktop navigation must consume the remaining sidebar height');
assert.match(release, /\.nav-utility-divider\{[\s\S]*?margin:auto 14px 0!important/, 'utility navigation must settle at the bottom without scrolling');
assert.match(release, /max-height:580px[\s\S]*?min-height:44px!important/, 'short desktop viewports must preserve a 44px minimum control height');
assert.doesNotMatch(release, /overflow-y:auto/, 'V444 desktop lock must not restore sidebar scrolling');

console.log('Desktop sidebar no-scroll contracts passed');
