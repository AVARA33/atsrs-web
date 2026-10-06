const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'css','jobsearch-hero-v6002.css'),'utf8');
const jobsCss=fs.readFileSync(path.join(root,'css','jobs-prototype.css'),'utf8');

test('JobSearch uses the compact reference heading without the former banner',()=>{
  const jobs=index.slice(index.indexOf('<section id="jobsPage"'),index.indexOf('<section id="employersPage"'));
  assert.match(index,/css\/jobsearch-hero-v6002\.css\?v=6120/);
  assert.match(jobs,/<h3 id="jobsHeading">JobSearch<\/h3>/);
  assert.match(jobs,/Discover your next opportunity offshore/);
  assert.match(jobs,/class="jobs-hero-map" aria-hidden="true"/);
  assert.doesNotMatch(jobs,/Latest release|Released on/);
  assert.match(index,/css\/jobs-prototype\.css\?v=6219/);
  assert.match(jobsCss,/body:has\(#jobsPage:not\(\.hidden\)\) #app\.app:not\(\.hidden\)>\.main>#pageTitle\{display:none!important\}/);
});

test('JobSearch heading remains compact and dark in both themes',()=>{
  assert.match(css,/html\[data-theme="light"\] #jobsPage \.jobs-hero\{/);
  assert.match(css,/#jobsPage \.jobs-hero\{[\s\S]*?min-height:0;[\s\S]*?background:transparent;/);
  assert.match(css,/html\[data-theme="light"\][\s\S]*?\.jobs-hero h3\{color:#f4f4f2!important/);
  assert.match(css,/html\[data-theme="light"\][\s\S]*?#jobsPage \.jobs-snapshot strong\{color:#17345e\}/);
  assert.match(css,/html\[data-theme="light"\] #jobsPage \.jobs-hero-map\{opacity:\.58;filter:invert\(1\) hue-rotate\(306deg\) saturate\(1\.45\) contrast\(\.94\)\}/);
  assert.match(css,/html\[data-theme="light"\] #jobsPage \.jobs-hero > \.jobs-snapshot\{[\s\S]*?background:transparent;[\s\S]*?box-shadow:none;/);
  assert.match(jobsCss,/html\[data-theme="light"\][\s\S]*?\.jobs-hero #jobsHeading\{[\s\S]*?color:#16191d!important/);
});

test('JobSearch heading keeps live results while decorative banner elements stay hidden',()=>{
  assert.match(index,/id="jobsVisibleCount" aria-live="polite"/);
  assert.doesNotMatch(index,/Server-backed vacancies/);
  assert.doesNotMatch(index,/data-jobs-view=|aria-label="Jobs view"/);
  assert.match(css,/#jobsPage \.jobs-hero-map\{[\s\S]*?display:none/);
  assert.match(css,/#jobsPage \.jobs-hero > \.jobs-region-nav\{[\s\S]*?display:none/);
  assert.match(css,/#jobsPage \.jobs-hero > \.jobs-snapshot\{[\s\S]*?position:static[\s\S]*?background:transparent;[\s\S]*?box-shadow:none;/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/@media\(max-width:520px\)/);
  assert.match(css,/@media\(max-width:1050px\)\{[\s\S]*?\.jobs-region-nav\{display:none/);
  assert.match(css,/@media\(max-width:600px\)\{[\s\S]*?#jobsPage \.jobs-secondary-primary\{grid-template-columns:1fr\}/);
});
