const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const css=fs.readFileSync(path.join(root,'css','shell-polish.css'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const dashboard=fs.readFileSync(path.join(root,'js','dashboard.js'),'utf8');

assert.match(index,/css\/shell-polish\.css\?v=484/);
assert.match(index,/js\/dashboard\.js\?v=419/);
assert.match(css,/Personal contact numbers: one professional field/);
assert.match(css,/grid-template-columns:minmax\(136px,28%\) minmax\(0,1fr\)!important/);
assert.match(css,/height:48px!important/);
assert.match(css,/border-radius:14px!important/);
assert.match(css,/\.phone-code-display\{[\s\S]*border-right:1px solid #2a4053!important/);
assert.match(css,/\.phone-field > input:not\(\[type="hidden"\]\)\{/);
assert.match(css,/html\[data-theme="light"\][\s\S]*\.phone-code-picker\{[\s\S]*background:#f7f9fc!important/);
assert.match(css,/@media\(max-width:520px\)/);
assert.match(dashboard,/ph ph-caret-down phone-code-arrow/);

console.log('phone field unified styling checks passed');
