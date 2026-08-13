const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'css','shell-polish.css'),'utf8');

assert.match(index,/css\/shell-polish\.css\?v=517/,
  'the neutral select focus stylesheet must bypass the previous cache');
assert.match(css,/Select fields keep a visible keyboard focus without the green route accent/);
assert.match(css,/Select fields keep[\s\S]*?#app\.app:not\(\.hidden\) select:focus-visible,[\s\S]*?outline:0!important;[\s\S]*?border-color:#4e7187!important;[\s\S]*?rgba\(56,189,248,\.12\)/,
  'dark selects must use a quiet blue focus state instead of the green route accent');
assert.match(fs.readFileSync(path.join(root,'css','theme-palette-v508.css'),'utf8'),/:where\(input,select,textarea\):focus[\s\S]*?border-color:rgba\(20,185,255,\.72\)!important;[\s\S]*?rgba\(0,170,255,\.11\)/,
  'Glass selects must use the shared cyan focus state');
assert.match(css,/body\.personal-mode #app\.app:not\(\.hidden\) > \.main > :is\([\s\S]*?#profilePage[\s\S]*?\) select:focus-visible\{[\s\S]*?outline:0!important;/,
  'Personal route focus specificity must override the older green workspace outline');

console.log('neutral select focus tests passed');
