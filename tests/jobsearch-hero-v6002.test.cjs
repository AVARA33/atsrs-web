const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'css','jobsearch-hero-v6002.css'),'utf8');
const bannerCss=fs.readFileSync(path.join(root,'css','jobsearch-banner-copper-v6245.css'),'utf8');
const jobsCss=fs.readFileSync(path.join(root,'css','jobs-prototype.css'),'utf8');

test('JobSearch restores the banner around the existing live heading',()=>{
  const jobs=index.slice(index.indexOf('<section id="jobsPage"'),index.indexOf('<section id="employersPage"'));
  assert.match(index,/css\/jobsearch-hero-v6002\.css\?v=6120/);
  assert.match(jobs,/<h3 id="jobsHeading">JobSearch<\/h3>/);
  assert.match(jobs,/Discover your next opportunity offshore/);
  assert.match(jobs,/class="jobs-hero-map" aria-hidden="true"/);
  assert.doesNotMatch(jobs,/Latest release|Released on/);
  assert.match(index,/css\/jobs-prototype\.css\?v=6241/);
  assert.match(index,/css\/jobsearch-banner-copper-v6245\.css\?v=6245/);
  assert.match(jobsCss,/body:has\(#jobsPage:not\(\.hidden\)\) #app\.app:not\(\.hidden\)>\.main>#pageTitle\{display:none!important\}/);
});

test('JobSearch banner follows the permanent dark graphite and copper theme',()=>{
  assert.match(bannerCss,/#jobsPage \.jobs-hero\{[\s\S]*?min-height:236px[\s\S]*?background:#0B0C0D/);
  assert.match(bannerCss,/border-top-color:#AC613B/);
  assert.match(bannerCss,/border-right-color:#34383C/);
  assert.match(bannerCss,/\.jobs-hero-eyebrow\{[\s\S]*?color:#C06D45/);
  assert.doesNotMatch(bannerCss,/html\[data-theme="light"\]/);
});

test('JobSearch banner keeps live results and restores its decorative map and region navigation',()=>{
  assert.match(index,/id="jobsVisibleCount" aria-live="polite"/);
  assert.doesNotMatch(index,/Server-backed vacancies/);
  assert.doesNotMatch(index,/data-jobs-view=|aria-label="Jobs view"/);
  assert.match(bannerCss,/#jobsPage \.jobs-hero-map\{[\s\S]*?display:block/);
  assert.match(bannerCss,/#jobsPage \.jobs-hero > \.jobs-region-nav\{[\s\S]*?display:flex/);
  assert.match(bannerCss,/#jobsPage \.jobs-hero > \.jobs-snapshot\{[\s\S]*?position:absolute/);
  assert.match(bannerCss,/@media\(max-width:860px\)/);
  assert.match(bannerCss,/@media\(max-width:600px\)/);
  assert.match(css,/@media\(max-width:600px\)\{[\s\S]*?#jobsPage \.jobs-secondary-primary\{grid-template-columns:1fr\}/);
});
