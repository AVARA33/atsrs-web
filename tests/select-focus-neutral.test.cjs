const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'css','shell-polish.css'),'utf8');

assert.match(index,/css\/shell-polish\.css\?v=503/,
  'the neutral select focus stylesheet must bypass the previous cache');
assert.match(css,/Select fields keep a visible keyboard focus without the green route accent/);
assert.match(css,/Select fields keep[\s\S]*?#app\.app:not\(\.hidden\) select:focus-visible,[\s\S]*?outline:0!important;[\s\S]*?border-color:#4e7187!important;[\s\S]*?rgba\(56,189,248,\.12\)/,
  'dark selects must use a quiet blue focus state instead of the green route accent');
assert.match(css,/html\[data-theme="light"\][\s\S]*?#app\.app:not\(\.hidden\) select:focus-visible,[\s\S]*?border-color:#6f91ad!important;[\s\S]*?rgba\(47,111,178,\.12\)/,
  'light selects must use the matching quiet blue focus state');
assert.match(css,/body\.personal-mode #app\.app:not\(\.hidden\) > \.main > :is\([\s\S]*?#profilePage[\s\S]*?\) select:focus-visible\{[\s\S]*?outline:0!important;/,
  'Personal route focus specificity must override the older green workspace outline');

console.log('neutral select focus tests passed');
