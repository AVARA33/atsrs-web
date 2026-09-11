const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'js', 'share-profile.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'share-profile.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.match(js, /function selectPublicDocumentCard\(id,options\)/);
assert.match(js, /\.shared-document-card\.is-summary-target/);
assert.match(js, /classList\.remove\('is-summary-target'\)/);
assert.match(js, /card\.classList\.add\('is-summary-target'\)/);
assert.match(js, /scrollIntoView\(\{behavior:options\.behavior\|\|'auto',block:'center',inline:'nearest'\}\)/);
assert.match(js, /event\.preventDefault\(\);selectPublicDocumentCard\(item\.id,\{updateHash:true,behavior:'smooth'\}\)/);
assert.match(js, /location\.hash\.indexOf\('#shared-document-'\)===0/);

assert.match(css, /data-theme="dark"[^\{]*\.shared-document-card\.is-summary-target\{[^}]*border-color:#22c55e!important/s);
assert.match(css, /data-theme="light"[^\{]*\.shared-document-card\.is-summary-target\{[^}]*border-color:#2684d8!important/s);
assert.doesNotMatch(css, /summary-focus/);
assert.match(html, /css\/share-profile\.css\?v=6098/);
assert.match(html, /js\/share-profile\.js\?v=442/);

console.log('share summary target selection contract: ok');
