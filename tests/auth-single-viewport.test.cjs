const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'css', 'sage-ledger.css'), 'utf8');
const release = styles.slice(styles.indexOf('/* V448:'));

assert.match(index, /css\/sage-ledger\.css\?v=448/, 'V448 auth viewport guard must bypass the production cache');
assert.match(release, /#app\.app\.hidden\{[\s\S]*?display:none!important/, 'hidden app content must never render below auth');
assert.match(release, /body:is\(\.auth-open,\.atsrs-booting,\.atsrs-session-pending\)\{[\s\S]*?position:fixed!important;[\s\S]*?overflow:hidden!important/, 'auth and loading states must lock document scrolling');
assert.match(release, /body\.auth-open #auth\.auth:not\(\.hidden\)\{[\s\S]*?height:100dvh!important;[\s\S]*?max-height:100dvh!important;[\s\S]*?overflow:hidden!important/, 'login must remain one dynamic viewport tall');
assert.match(release, /#auth\.auth:not\(\.hidden\)>\.auth-card\{[\s\S]*?max-height:calc\(100dvh - 32px\)!important/, 'small screens must contain auth content inside the viewport');
assert.match(release, /#atsrsBootScreen\{[\s\S]*?height:100dvh!important;[\s\S]*?overflow:hidden!important/, 'loading must remain one dynamic viewport tall');

console.log('Auth and loading single-viewport contracts passed');
