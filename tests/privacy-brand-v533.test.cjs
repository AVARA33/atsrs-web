const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'css','privacy-brand-v533.css'),'utf8');
const lightLogo=path.join(root,'assets','branding','atsrs-lockup-light-v533.png');

assert.match(index,/data-atsrs-build="V533"/);
assert.match(index,/css\/privacy-brand-v533\.css\?v=533/);
assert.ok(fs.statSync(lightLogo).size>1000000,'approved Light logo source must be shipped unchanged');
assert.match(css,/#accountSharingTab\.active[\s\S]*?background:var\(--atsrs-ref-dark-bg,#050606\)!important/);
assert.match(css,/#accountSharingTab #shareProfilePanel[\s\S]*?background:var\(--atsrs-workspace-surface,#0b0d0d\)!important/);
assert.match(css,/\.share-analytics > div[\s\S]*?background:var\(--atsrs-workspace-surface-soft,#111414\)!important/);
assert.match(css,/atsrs-lockup-light-v533\.png/);
assert.match(css,/background-size:115% auto!important/);
assert.match(css,/mix-blend-mode:multiply/);
assert.match(css,/box-shadow:none!important/);
assert.match(css,/filter:none!important/);
assert.doesNotMatch(css,/drop-shadow/);
assert.match(css,/\.roadmap-news,/);
assert.match(css,/\.status-available/);
assert.match(css,/color:var\(--atsrs-ref-lime,#b8ff19\)!important/);
assert.doesNotMatch(css,/\.roadmap-card\s*>\s*h3[^}]*atsrs-ref-lime/s);

console.log('V533 Dark sharing cards and Light logo contracts passed');
