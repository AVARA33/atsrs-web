const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'css','jobsearch-hero-v6002.css'),'utf8');

test('JobSearch uses the international catalogue hero without release-only copy',()=>{
  const jobs=index.slice(index.indexOf('<section id="jobsPage"'),index.indexOf('<section id="employersPage"'));
  assert.match(index,/css\/jobsearch-hero-v6002\.css\?v=6005/);
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
  assert.match(css,/html\[data-theme="light"\][\s\S]*?#jobsPage \.jobs-snapshot strong\{color:#17345e\}/);
});

test('JobSearch hero keeps live results controls and responsive map treatment',()=>{
  assert.match(index,/id="jobsVisibleCount" aria-live="polite"/);
  assert.doesNotMatch(index,/Server-backed vacancies/);
  assert.match(index,/data-jobs-view="cards"/);
  assert.match(index,/data-jobs-view="list"/);
  assert.match(index,/class="jobs-secondary-actions"[\s\S]*class="talent-view-switch jobs-view-switch"/);
  assert.match(css,/#jobsPage \.jobs-hero > \.jobs-region-nav\{[\s\S]*?position:absolute[\s\S]*?bottom:18px/);
  assert.match(css,/#jobsPage \.jobs-hero > \.jobs-snapshot\{[\s\S]*?right:30px[\s\S]*?bottom:9px[\s\S]*?height:34px[\s\S]*?background:rgba\(5,10,7,\.6\)/);
  assert.match(css,/#jobsPage \.jobs-hero > \.jobs-region-nav button\{[\s\S]*?background:rgba\(5,10,7,\.62\)!important/);
  assert.match(css,/#jobsPage \.jobs-secondary-actions \.jobs-view-switch\{[\s\S]*?border:0!important[\s\S]*?background:transparent!important/);
  assert.match(css,/international-job-map-v1\.png/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/@media\(max-width:520px\)/);
});
