const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'css','theme-palette-v508.css'),'utf8');

assert.match(index,/css\/theme-palette-v508\.css\?v=58169/,
  'the canonical control palette must bypass the previous cache');
assert.match(css,/Canonical, non-shifting control and keyboard-focus system/);
assert.match(css,/html\[data-theme="dark"\] body\{[\s\S]*?--atsrs-control-focus-border:var\(--atsrs-ref-lime\)/,
  'dark controls must use the ATSRS green focus token');
assert.match(css,/html\[data-theme="light"\] body\{[\s\S]*?--atsrs-control-focus-border:var\(--atsrs-ref-blue\)/,
  'light controls must use the ATSRS blue focus token');
assert.match(css,/:focus-visible\{[\s\S]*?outline:2px solid var\(--atsrs-control-focus-border\)!important;[\s\S]*?box-shadow:none!important/,
  'keyboard focus must be theme-aware without changing control geometry');
assert.match(css,/body #app\.app:not\(\.hidden\)[\s\S]*?:focus-visible,[\s\S]*?body #auth[\s\S]*?outline:2px solid var\(--atsrs-control-focus-border\)!important/,
  'canonical tokens must override legacy route-specific cyan focus rules');

console.log('theme-aware select focus tests passed');
