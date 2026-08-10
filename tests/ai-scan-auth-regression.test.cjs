const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
const edge = fs.readFileSync(path.join(root, 'supabase', 'functions', 'scan-document', 'index.ts'), 'utf8');

assert.match(app, /async function aiScanAuthorizationHeaders\(\)/);
assert.match(app, /atsrsGetSessionSingleFlight/);
assert.match(app, /client\.auth\.refreshSession\(\)/);
assert.match(app, /return \{Authorization:'Bearer '\+session\.access_token\}/);
assert.match(app, /functions\.invoke\('scan-document',\{body:body,headers:headers\}\)/);
assert.match(app, /monthly limit\|allowance\|processing notice/);
assert.match(app, /file\.size>10\*1024\*1024/);
assert.match(edge, /MAX_FILE_BYTES = 10 \* 1024 \* 1024/);

console.log('AI scan authenticated invocation regression tests passed');
