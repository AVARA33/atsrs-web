const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'jobs-prototype.js'), 'utf8');

assert.match(runtime, /client\.rpc\('atsrs_jobs_facets'\)/);
assert.match(runtime, /client\.rpc\('atsrs_jobs_feed',feedParams\(target,state\)\)/);
assert.match(runtime, /p_search_terms:searchTerms\(state\.search\)/);
assert.match(runtime, /p_worksites:Array\.from\(new Set\(worksite\)\)/);
assert.doesNotMatch(runtime, /client\.from\('atsrs_jobs'\)\.select\('\*',\{count:'exact'\}\)/);
assert.match(runtime, /db\(\)\.from\('atsrs_jobs'\)\.select\('\*'\).*loadAdmin/si);

console.log('Jobs entitlement-aware feed contracts passed');


