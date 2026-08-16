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

test('Jobs is isolated, navigable and visibly live',()=>{
  assert.match(index,/id="navJobs"[^>]*showPage\('jobs'/);
  assert.match(index,/section id="jobsPage"[\s\S]*?LIVE JOBS/);
  assert.match(index,/jobs-prototype\.css\?v=576/);
  assert.doesNotMatch(index,/<script src="js\/jobs-prototype\.js\?v=576"><\/script>/);
  assert.match(routeLoader,/loadScript\('js\/jobs-prototype\.js\?v=576'\)/);
  assert.match(routeLoader,/String\(page\|\|''\)==='jobs'/);
  assert.equal((storage.match(/jobs:navJobs/g)||[]).length,2);
  assert.match(shellCss,/#navJobs/);
  assert.ok(index.indexOf('id="navJobs"')<index.indexOf('id="navCandidates"'),'Jobs must appear above Candidates in both workspace sidebars');
  assert.match(shellRuntime,/navJobs:'briefcase-metal'/);
  assert.match(index,/shell-polish\.js\?v=567/);
  assert.match(index,/shell-polish\.css\?v=568/);
});

test('Jobs uses server data, safe DOM rendering and owner write controls',()=>{
  assert.match(runtime,/from\('atsrs_jobs'\)/);
  assert.match(runtime,/atsrs_jobs_admin_status/);
  assert.match(runtime,/\.insert\(p\)|\.update\(p\)/);
  assert.doesNotMatch(runtime,/service_role|innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
  assert.match(runtime,/textContent=String\(text\)/);
  assert.match(runtime,/replaceChildren/);
  assert.match(runtime,/Recruiter email/);
  assert.match(runtime,/Recruiter organisation/);
  assert.doesNotMatch(runtime,/No candidate commission|job-fee-note/);
  assert.equal((index.match(/No candidate commission\./g)||[]).length,1);
  assert.match(index,/class="jobs-notice"[\s\S]*No candidate commission\./);
  assert.doesNotMatch(css,/job-fee-note/);
  assert.doesNotMatch(runtime,/ryan\.webster|ellie\.malim|cheryl\.nicolson/);
  assert.match(runtime,/Recruiter email/);
  assert.match(runtime,/Recruiter phone/);
  assert.doesNotMatch(runtime,/<details>|<summary>/);
  assert.match(runtime,/action\(actions,'Send email',mailtoHref\(job\),'email'\)/);
  assert.doesNotMatch(runtime,/['"]tel:/);
  assert.doesNotMatch(index,/Recruiters use ATSRS through subscription plans/);
  assert.doesNotMatch(runtime,/Recruiters use ATSRS through subscription plans/);
});

test('Jobs supports filtering and responsive zero-overflow layout',()=>{
  assert.match(runtime,/jobsSearch/);
  assert.match(runtime,/jobsRoleFilter/);
  assert.match(runtime,/jobsLocationFilter/);
  assert.match(runtime,/jobsLoadMore/);
  assert.match(runtime,/PAGE=30/);
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

test('Jobs dark view controls and notice use the neutral palette',()=>{
  assert.match(css,/#jobsPage \.jobs-notice\{background:#070908!important;border-color:#242a27!important\}/);
  assert.match(css,/#jobsPage \.jobs-view-switch\{[^}]*border-color:transparent!important[^}]*background:transparent!important/);
  assert.match(css,/#jobsPage \.jobs-view-switch button\{[^}]*min-height:44px!important[^}]*border:0!important/);
  assert.match(css,/#jobsPage \.jobs-view-switch button\[aria-pressed="true"\]::after/);
  assert.match(css,/html\[data-theme="light"\] \.jobs-view-switch button\[aria-pressed="true"\]/);
});
