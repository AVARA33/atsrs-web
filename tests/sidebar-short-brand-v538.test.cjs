const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'shell-polish.css'), 'utf8');

assert.match(index, /data-atsrs-build="V548"/);
assert.match(index, /css\/shell-polish\.css\?v=548/);
assert.match(index, /class="brand atsrs-sidebar-mark" role="img" aria-label="ATSRS"><\/div>/);
assert.doesNotMatch(index, /class="brand atsrs-animated-wordmark"/);

assert.match(css, /\.atsrs-sidebar-mark[\s\S]*width:60px!important;[\s\S]*height:64px!important;/);
assert.match(css, /atsrs-lockup-green-transparent\.png\?v=538/);
assert.match(css, /html\[data-theme="light"\][\s\S]*atsrs-lockup-light-transparent\.png\?v=538/);
assert.match(css, /background-size:auto 58px!important;/);
assert.match(css, /animation:none!important;/);
assert.match(css, /transition:none!important;/);
assert.match(css, /transform:none!important;/);
assert.match(css, /@media\(min-width:801px\) and \(max-height:820px\)[\s\S]*?height:calc\(100dvh - 72px\)!important;[\s\S]*?overflow-y:auto!important;[\s\S]*?flex-basis:48px!important;/);
assert.match(css, /@media\(min-width:801px\) and \(max-height:620px\)[\s\S]*?height:calc\(100dvh - 66px\)!important;[\s\S]*?flex-basis:44px!important;[\s\S]*?min-height:44px!important;/);

console.log('V538 fixed-size authenticated sidebar short brand contracts passed');
