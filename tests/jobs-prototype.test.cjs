const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const root=path.join(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const runtime=fs.readFileSync(path.join(root,'js','jobs-prototype.js'),'utf8');
const css=fs.readFileSync(path.join(root,'css','jobs-prototype.css'),'utf8');
const storage=fs.readFileSync(path.join(root,'js','storage.js'),'utf8');
const shellCss=fs.readFileSync(path.join(root,'css','shell-polish.css'),'utf8');
const shellRuntime=fs.readFileSync(path.join(root,'js','shell-polish.js'),'utf8');
const routeLoader=fs.readFileSync(path.join(root,'js','route-feature-loader.js'),'utf8');

test('Jobs prototype is isolated, navigable and visibly in development',()=>{
  assert.match(index,/id="navJobs"[^>]*showPage\('jobs'/);
  assert.match(index,/section id="jobsPage"[\s\S]*?IN DEVELOPMENT/);
  assert.match(index,/jobs-prototype\.css\?v=573/);
  assert.doesNotMatch(index,/<script src="js\/jobs-prototype\.js\?v=573"><\/script>/);
  assert.match(routeLoader,/loadScript\('js\/jobs-prototype\.js\?v=573'\)/);
  assert.match(routeLoader,/String\(page\|\|''\)==='jobs'/);
  assert.equal((storage.match(/jobs:navJobs/g)||[]).length,2);
  assert.match(shellCss,/#navJobs/);
  assert.ok(index.indexOf('id="navJobs"')<index.indexOf('id="navCandidates"'),'Jobs must appear above Candidates in both workspace sidebars');
  assert.match(shellRuntime,/navJobs:'briefcase-metal'/);
  assert.match(index,/shell-polish\.js\?v=567/);
  assert.match(index,/shell-polish\.css\?v=568/);
});

test('Jobs data is read only and shows supplied recruiter contact',()=>{
  assert.doesNotMatch(runtime,/@gmail|@outlook|@hotmail|https?:\/\//i);
  assert.doesNotMatch(runtime,/fetch\(|supabase|insert\(|update\(|delete\(/i);
  assert.match(runtime,/Recruiter email/);
  assert.match(runtime,/Recruiter organisation/);
  assert.match(runtime,/No candidate commission/);
  assert.equal((runtime.match(/recruiterEmail:/g)||[]).length,10);
  assert.match(runtime,/recruiterFact\('Recruiter email',job\.recruiterEmail,'email'\)/);
  assert.equal((runtime.match(/recruiterPhone:/g)||[]).length,8);
  assert.match(runtime,/recruiterFact\('Recruiter phone',job\.recruiterPhone/);
  assert.doesNotMatch(runtime,/<details>|<summary>/);
  assert.doesNotMatch(index,/Recruiters use ATSRS through subscription plans/);
  assert.doesNotMatch(runtime,/Recruiters use ATSRS through subscription plans/);
});

test('Jobs supports filtering and responsive zero-overflow layout',()=>{
  assert.match(runtime,/jobsSearch/);
  assert.match(runtime,/jobsRoleFilter/);
  assert.match(runtime,/jobsLocationFilter/);
  assert.match(css,/@media\(max-width:600px\)/);
  assert.match(css,/min-width:0/);
});

test('Jobs supports persistent accessible card and list views',()=>{
  assert.match(index,/data-jobs-view="cards"/);
  assert.match(index,/data-jobs-view="list"/);
  assert.match(runtime,/atsrs_jobs_view/);
  assert.match(runtime,/aria-pressed/);
  assert.match(runtime,/jobs-list/);
  assert.match(css,/\.jobs-grid\.jobs-list/);
  assert.match(shellCss,/#projectsPage,#jobsPage/);
});
