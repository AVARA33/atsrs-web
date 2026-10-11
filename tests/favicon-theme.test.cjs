const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const theme=fs.readFileSync(path.join(root,'js','theme.js'),'utf8');
const copper=path.join(root,'assets','branding','atsrs-favicon-copper-v6255.png');

assert.match(index,/id="atsrsFavicon"[^>]+atsrs-favicon-copper-v6255\.png\?v=6255/);
assert.match(index,/var href='assets\/branding\/atsrs-favicon-copper-v6255\.png\?v=6255'/);
assert.match(index,/MutationObserver/);
assert.match(theme,/atsrsSyncFavicon/);
assert.match(index,/var initialTheme='dark'/);
assert.match(index,/document\.documentElement\.dataset\.theme=initialTheme/);
assert.ok(fs.statSync(copper).size>500,'copper favicon asset must exist');
assert.equal(fs.readFileSync(copper).subarray(1,4).toString(),'PNG');

console.log('Theme favicon tests passed');
