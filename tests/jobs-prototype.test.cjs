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

test('Jobs prototype is isolated, navigable and visibly in development',()=>{
  assert.match(index,/id="navJobs"[^>]*showPage\('jobs'/);
  assert.match(index,/section id="jobsPage"[\s\S]*?IN DEVELOPMENT/);
  assert.match(index,/jobs-prototype\.css\?v=563/);
  assert.match(index,/jobs-prototype\.js\?v=563/);
  assert.equal((storage.match(/jobs:navJobs/g)||[]).length,2);
  assert.match(shellCss,/#navJobs/);
  assert.ok(index.indexOf('id="navJobs"')<index.indexOf('id="navCandidates"'),'Jobs must appear above Candidates in both workspace sidebars');
  assert.match(shellRuntime,/navJobs:'briefcase-metal'/);
  assert.match(index,/shell-polish\.js\?v=567/);
});

test('Jobs data is privacy-filtered and read only',()=>{
  assert.doesNotMatch(runtime,/@gmail|@outlook|@hotmail|https?:\/\//i);
  assert.doesNotMatch(runtime,/fetch\(|supabase|insert\(|update\(|delete\(/i);
  assert.match(runtime,/personal contact details removed/);
  assert.match(runtime,/Recruiter email/);
});

test('Jobs supports filtering and responsive zero-overflow layout',()=>{
  assert.match(runtime,/jobsSearch/);
  assert.match(runtime,/jobsRoleFilter/);
  assert.match(runtime,/jobsLocationFilter/);
  assert.match(css,/@media\(max-width:600px\)/);
  assert.match(css,/min-width:0/);
});
