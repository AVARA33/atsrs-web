const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'share-profile.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.match(runtime, /age<12\*60\*60\*1000/, 'NEW UPDATE must expire after 12 hours');
assert.match(runtime, /age>=0/, 'future timestamps must not be labelled as new uploads');
assert.match(runtime, /label:'NO EXPIRY'/, 'documents without an expiry must use NO EXPIRY');
assert.match(runtime, /return\{label:'VALID',className:''\}/, 'valid dated documents must use VALID');
assert.match(index, /js\/share-profile\.js\?v=431/, 'the browser must receive the refreshed sharing runtime');

console.log('Shared profile update window contracts passed');
