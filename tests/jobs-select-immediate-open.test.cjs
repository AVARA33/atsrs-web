const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'jobs-prototype.js'), 'utf8');
const loader = fs.readFileSync(path.join(root, 'js', 'route-feature-loader.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('JobSearch dropdowns open immediately while facet data hydrates', () => {
  assert.match(runtime, /button\.onclick=function\(\)\{if\(menu\.classList\.contains\('hidden'\)\)\{openJobsSelect\(control,false\);hydrateOptions\(\)\}/);
  assert.match(runtime, /function hydrateOptions\(\)\{if\(facetsLoaded\)return;button\.setAttribute\('aria-busy','true'\);loadOptions\(\)\.catch/);
  assert.doesNotMatch(runtime, /button\.disabled=true;await loadOptions\(\);button\.disabled=false/);
  assert.match(loader, /loadScript\('js\/jobs-prototype\.js\?v=6095'\)/);
  assert.match(index, /js\/route-feature-loader\.js\?v=6095/);
});

test('keyboard opens the same menu before remote options finish loading', () => {
  assert.match(runtime, /moveJobsSelect\(control,e\.key==='ArrowDown'\?1:-1\);hydrateOptions\(\)/);
  assert.match(runtime, /openJobsSelect\(control,true\);setJobsSelectActive[\s\S]*?hydrateOptions\(\)/);
});
