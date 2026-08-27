const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const index = read('index.html');
const storage = read('js/storage.js');

assert.match(index, /data-atsrs-build="V5895"/);
assert.match(index, /js\/storage\.js\?v=597/);
assert.match(storage, /requestedPage==="dashboard"/);
assert.match(storage, /searchParams\.set\("route","dashboard"\)/);
assert.match(storage, /\["tab","request","share_id","intent"\]/);
assert.match(storage, /route==='profile'\|\|route==='dashboard'/);

console.log('Dashboard refresh routing tests passed');
