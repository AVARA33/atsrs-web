const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('css/product-updates-atlas-v6010.css','utf8');

assert.match(html,/product-updates-atlas-v6010\.css\?v=6035/);
assert.match(css,/V6034 — atlas endpoint labels stay unboxed/);
assert.match(css,/#introPage \.updates-atlas \.atlas-marker\{[^}]*padding:0!important;[^}]*border:0!important;[^}]*background:transparent!important/);
assert.match(css,/#introPage \.updates-atlas \.atlas-marker\.is-selected\{[^}]*background:transparent!important;[^}]*box-shadow:none!important/);
assert.match(css,/html\[data-theme="light"\] #introPage \.updates-atlas \.atlas-marker\{[^}]*background:transparent!important/);
console.log('product updates unboxed labels v6034 tests passed');
