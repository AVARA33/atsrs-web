const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const runtime = fs.readFileSync(path.join(__dirname, '..', 'js', 'jobs-prototype.js'), 'utf8');

assert.match(runtime, /facetsLoaded=false,facetsPromise=null/);
assert.match(runtime, /button\.onclick=async function\(\)\{if\(!facetsLoaded\)/);
assert.match(runtime, /if\(urlParams\.get\('region'\)\|\|urlParams\.get\('country'\)\|\|urlParams\.get\('location'\)\)await loadOptions\(\)/);
assert.doesNotMatch(runtime, /isAdmin=await adminCheck\(\);await loadOptions\(\);applyUrlGeography\(\);await load\(1\)/);

console.log('JobSearch loads the current page first and defers the full filter catalogue until it is needed.');
