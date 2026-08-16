const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const theme=fs.readFileSync(path.join(root,'js','theme.js'),'utf8');
const green=path.join(root,'assets','branding','atsrs-favicon-green-v576.png');
const blue=path.join(root,'assets','branding','atsrs-favicon-blue-v576.png');

assert.match(index,/id="atsrsFavicon"[^>]+atsrs-favicon-green-v576\.png\?v=576/);
assert.match(index,/theme==='light'[\s\S]*atsrs-favicon-blue-v576\.png\?v=576[\s\S]*atsrs-favicon-green-v576\.png\?v=576/);
assert.match(index,/savedTheme==='light'\|\|savedTheme==='dark'/);
assert.match(index,/prefers-color-scheme: light/);
assert.match(index,/MutationObserver/);
assert.match(theme,/atsrsSyncFavicon/);
assert.match(theme,/addEventListener\('change',handleSystemTheme\)/);
assert.match(theme,/if\(!savedTheme\(\)\)applyTheme\(systemTheme\(\),false\)/);
assert.ok(fs.statSync(green).size>500,'green favicon asset must exist');
assert.ok(fs.statSync(blue).size>500,'blue favicon asset must exist');
assert.equal(fs.readFileSync(green).subarray(1,4).toString(),'PNG');
assert.equal(fs.readFileSync(blue).subarray(1,4).toString(),'PNG');

console.log('Theme favicon tests passed');
