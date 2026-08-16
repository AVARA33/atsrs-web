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
  assert.match(index,/jobs-prototype\.css\?v=5801/);
  assert.doesNotMatch(index,/<script src="js\/jobs-prototype\.js\?v=580"><\/script>/);
  assert.match(routeLoader,/loadScript\('js\/jobs-prototype\.js\?v=580'\)/);
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
  assert.doesNotMatch(runtime,/jobsManageButton|jobs-manage-button/);
  assert.doesNotMatch(runtime,/No candidate commission|job-fee-note/);
  assert.equal((index.match(/No candidate commission\./g)||[]).length,1);
  assert.match(index,/class="jobs-notice"[\s\S]*No candidate commission\./);
  assert.doesNotMatch(css,/job-fee-note/);
  assert.doesNotMatch(runtime,/ryan\.webster|ellie\.malim|cheryl\.nicolson/);
  assert.match(runtime,/Recruiter email/);
  assert.match(runtime,/Recruiter phone/);
  assert.doesNotMatch(runtime,/<details>|<summary>/);
  assert.match(runtime,/contact\(contacts,'Recruiter email',validEmail\(job\.recruiter_email\),'email',mailtoHref\(job\)\)/);
  assert.doesNotMatch(runtime,/Send email/);
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
  assert.doesNotMatch(css,/\.jobs-list \.job-contact-(?:org|source)\{display:none/);
  assert.doesNotMatch(css,/\.job-contact-phone\{display:none/);
  assert.match(runtime,/contact\(contacts,'Listing source'/);
  assert.match(runtime,/contact\(contacts,'Application'/);
  assert.doesNotMatch(runtime,/function action\(/);
  assert.match(css,/\.jobs-grid\.jobs-cards\{grid-auto-rows:1fr;align-items:stretch\}/);
  assert.match(css,/\.jobs-cards \.job-card\{height:100%;grid-template-rows:auto 1fr auto\}/);
});

test('Jobs renders only verified source and closing dates with card/list parity',()=>{
  assert.match(runtime,/job\.source_posted_at\|\|job&&job\.display_posted_date/);
  assert.match(runtime,/value\?'Posted '\+value:''/);
  assert.match(runtime,/fact\(dl,'Closing date',verifiedDate\(job\.closing_date\)\)/);
  assert.doesNotMatch(runtime,/prefix='Received '|Received /);
  assert.doesNotMatch(runtime,/dateLabel\([^)]*published_at/);
  assert.match(runtime,/Intl\.DateTimeFormat\('en-GB'/);
});

test('Jobs detail overlay is shared, accessible and safely rendered',()=>{
  assert.match(runtime,/function detailContent\(job\)/);
  assert.match(runtime,/function openDetails\(job,opener\)/);
  assert.match(runtime,/dialog\.showModal\(\)/);
  assert.match(runtime,/e\.key!=='Tab'/);
  assert.match(runtime,/dialog\.addEventListener\('close'/);
  assert.match(runtime,/opener&&opener\.isConnected/);
  assert.match(runtime,/document\.body\.classList\.add\('jobs-detail-open'\)/);
  assert.doesNotMatch(runtime,/innerHTML|insertAdjacentHTML|document\.write/);
  assert.match(css,/\.job-detail-open,\.job-detail-close\{[^}]*width:44px[^}]*height:44px/);
  assert.match(css,/@media\(max-width:600px\)[^{]*\{[\s\S]*?\.job-detail-dialog\{width:100vw;height:100dvh/);
  assert.match(css,/html\[data-theme="light"\] body #app\.app:not\(\.hidden\) #jobsPage \.jobs-view-switch\{border-color:transparent!important/);
});

test('Jobs dark view controls and notice use the neutral palette',()=>{
  assert.match(css,/#jobsPage \.jobs-notice\{background:#070908!important;border-color:#242a27!important\}/);
  assert.match(css,/#jobsPage \.jobs-view-switch\{[^}]*border-color:transparent!important[^}]*background:#050706!important/);
  assert.match(css,/#jobsPage \.jobs-view-switch button\{[^}]*min-height:44px!important[^}]*border:0!important/);
  assert.match(css,/#jobsPage \.jobs-view-switch button\[aria-pressed="true"\]::after/);
  assert.match(css,/html\[data-theme="light"\][^{]*#jobsPage \.jobs-view-switch button\[aria-pressed="true"\]/);
});
