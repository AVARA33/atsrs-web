const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const index=read('index.html');
const css=read('css/product-updates-alignment-v531.css');
const harness=read('tests/fixtures/product-updates-alignment-v531-harness.html');

assert.match(index,/data-atsrs-build="V547"/);
assert.match(index,/product-updates-alignment-v531\.css\?v=531/);
assert.match(harness,/product-updates-alignment-v531\.css\?v=531/);

assert.match(css,/grid-template-rows:20px 42px auto 1fr!important/);
assert.match(css,/\.roadmap-card > \.roadmap-news[\s\S]*?grid-row:1!important/);
assert.match(css,/\.roadmap-card > \.roadmap-icon[\s\S]*?grid-row:2!important[\s\S]*?margin:0!important/);
assert.match(css,/\.roadmap-card > h3[\s\S]*?grid-row:3!important[\s\S]*?margin:0!important/);
assert.match(css,/\.roadmap-card > p[\s\S]*?grid-row:4!important/);

assert.match(css,/data-theme="dark"[\s\S]*?\.updates-hero > h3[\s\S]*?\.roadmap-heading h3[\s\S]*?\.roadmap-card > h3[\s\S]*?color:#f4f7fb!important/);
assert.match(css,/data-theme="dark"[\s\S]*?#pageTitle[\s\S]*?color:#f4f7fb!important/);
assert.match(css,/data-theme="dark"[\s\S]*?\.roadmap-icon[\s\S]*?background:rgba\(37,99,235,\.14\)!important[\s\S]*?color:#bfdbfe!important/);
assert.doesNotMatch(css,/#dashboardPage|#profilePage|#refsPage|#auth|#atsrsBootScreen/);

console.log('V531 Product Updates alignment and neutral Dark hierarchy contracts passed');
