const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'css', 'sage-ledger.css'), 'utf8');
const release = styles.slice(styles.indexOf('/* V447:'));

assert.match(index, /css\/sage-ledger\.css\?v=450/, 'Current sage styles must bypass the production cache');
assert.match(release, /#app\.app:not\(\.hidden\) #atsrsGlobalControls>:is\(#atsrsThemeToggle,#sageNotificationButton\)/, 'borderless styling must remain inside the open app');
assert.match(release, /background-color:transparent!important/, 'idle header controls must have no visible fill');
assert.match(release, /border-color:transparent!important/, 'idle header controls must have no visible box border');
assert.match(release, /border-radius:50%!important/, 'interaction feedback must be circular rather than square');
assert.match(release, /\.atsrs-theme-track>:is\(\.ph-sun,\.ph-moon\)\{[\s\S]*?visibility:visible!important;[\s\S]*?opacity:1!important/, 'sun and moon icons must remain equally visible');
assert.match(release, /:is\(:hover,:focus-visible\)\{[\s\S]*?color-mix\(in srgb,var\(--sage-accent\) 9%,transparent\)/, 'hover and focus must retain subtle sage feedback');
assert.match(release, /:focus-visible\{[\s\S]*?outline:2px solid var\(--sage-accent\)!important/, 'keyboard focus must remain visible');
assert.match(styles, /flex:0 0 44px!important;[\s\S]*?width:44px!important;[\s\S]*?height:44px!important/, 'the invisible containers must preserve 44px touch targets');

console.log('Borderless app header control contracts passed');
