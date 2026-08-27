const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const index = read('index.html');
const storage = read('js/storage.js');

assert.match(index, /data-atsrs-build="V5901"/);
assert.match(index, /js\/storage\.js\?v=600/);
assert.match(storage, /requestedPage==="dashboard"\|\|requestedPage==="developer"/);
assert.match(storage, /page==="developer"&&window\.__atsrsDeveloperAccess!==true/);
assert.match(storage, /searchParams\.set\("route",requestedPage\)/);
assert.match(storage, /\["tab","request","share_id","intent"\]/);
assert.match(storage, /route==='profile'\|\|route==='dashboard'/);
assert.match(storage, /developerRequested\?'dashboard'/);
assert.match(storage, /window\.__atsrsRequestedDeveloperRoute=developerRequested/);
assert.match(storage, /if\(developerRequested\)\{let routeUrl=new URL\(location\.href\)/);

console.log('Dashboard refresh routing tests passed');
