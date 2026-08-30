const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'css','jobsearch-hero-v6002.css'),'utf8');

test('JobSearch uses the international catalogue hero without release-only copy',()=>{
  const jobs=index.slice(index.indexOf('<section id="jobsPage"'),index.indexOf('<section id="employersPage"'));
  assert.match(index,/css\/jobsearch-hero-v6002\.css\?v=6004/);
  assert.match(jobs,/class="jobs-hero-icon"[\s\S]*ph-globe-hemisphere-west/);
  assert.match(jobs,/Global opportunity catalogue/);
  assert.match(jobs,/<h3 id="jobsHeading">International JobSearch<\/h3>/);
  assert.match(jobs,/class="jobs-hero-map" aria-hidden="true"/);
  assert.doesNotMatch(jobs,/Latest release|Released on/);
});

test('JobSearch hero uses a dedicated light surface instead of the dark banner',()=>{
  assert.match(css,/html\[data-theme="light"\] #jobsPage \.jobs-hero\{/);
  assert.match(css,/linear-gradient\(135deg,#ffffff 0%,#f5f9ff 55%,#f2faF3 100%\)/i);
  assert.match(css,/html\[data-theme="light"\][\s\S]*?\.jobs-hero h3\{color:#132b56!important/);
  assert.match(css,/html\[data-theme="light"\][\s\S]*?\.jobs-hero-actions\{[\s\S]*?background:rgba\(255,255,255,\.88\)/);
});

test('JobSearch hero keeps live results controls and responsive map treatment',()=>{
  assert.match(index,/id="jobsVisibleCount" aria-live="polite"/);
  assert.match(index,/data-jobs-view="cards"/);
  assert.match(index,/data-jobs-view="list"/);
  assert.match(css,/international-job-map-v1\.png/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/@media\(max-width:520px\)/);
});
