const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const runtime = fs.readFileSync('js/jobs-prototype.js', 'utf8');

test('JobSearch never reuses an anonymous limited-feed cache after session restore', () => {
  assert.match(runtime, /authScope='anonymous'/);
  assert.match(runtime, /function queryKey\(target,state\)\{return authScope\+'\|'\+JSON\.stringify/);
  assert.match(runtime, /nextScope=user&&user\.id\?'user:'\+user\.id:'anonymous'/);
  assert.match(runtime, /if\(authScope!==nextScope\)\{authScope=nextScope;queryCache\.clear\(\);queryRequests\.clear\(\)\}/);
});

test('resume rechecks the authenticated tier and refreshes full facets when scope changes', () => {
  assert.match(runtime, /async function refreshAfterSession\(\)\{var previousScope=authScope;isAdmin=await adminCheck\(\);if\(previousScope!==authScope\)await loadOptions\(true\);return load\(page,\{force:true\}\)\}/);
  assert.match(runtime, /addEventListener\('atsrs:resume',refreshAfterSession\)/);
});
