const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');

const root=path.join(__dirname,'..');
const runtime=fs.readFileSync(path.join(root,'js','jobs-prototype.js'),'utf8');
const css=fs.readFileSync(path.join(root,'css','jobs-prototype.css'),'utf8');
const migration=fs.readFileSync(path.join(root,'supabase','migrations','20260818054500_personal_plan_entitlements.sql'),'utf8');

test('Free job access is fail-closed and Bronze/full access is server-driven',()=>{
  assert.match(runtime,/jobsAccess='limited'/);
  assert.match(runtime,/jobsAccess=payload\.access==='full'\?'full':'limited'/);
  assert.match(runtime,/jobsAccess='limited';jobs=\[\]/);
  assert.match(runtime,/function hasFullJobAccess\(forceFull\)\{return!!forceFull\|\|isAdmin\|\|\(jobsAccess==='full'&&\(!window.atsrsAccess\|\|window.atsrsAccess.full\(\)\)\)\}/);
  assert.doesNotMatch(runtime,/localStorage[^\n]*jobsAccess|sessionStorage[^\n]*jobsAccess/);
});

test('Free cards and details replace premium contact tools with one accessible Bronze gate',()=>{
  assert.match(runtime,/function lockedJobAccess\(\)/);
  assert.match(runtime,/ph ph-key/);
  assert.doesNotMatch(runtime,/Available with Bronze|Unlock recruiter contacts and application tools\./);
  assert.match(runtime,/Recruiter details/);
  assert.match(runtime,/Contact information/);
  assert.match(runtime,/Direct Apply/);
  assert.match(runtime,/Original source link/);
  assert.match(runtime,/Press to unlock/);
  assert.match(runtime,/link\.href='\/pricing\.html#bronze'/);
  assert.match(runtime,/View Bronze plan to unlock recruiter contacts and application tools/);
  assert.match(runtime,/if\(!hasFullJobAccess\(forceFull\)\)contacts\.append\(lockedJobAccess\(\)\)/);
  assert.match(runtime,/if\(!full\)c\.append\(lockedJobAccess\(\)\)/);
  assert.match(runtime,/full\?'Recruiter':'Company'/);
});

test('The lock treatment is scoped, themed and keyboard visible',()=>{
  assert.match(css,/\.job-access-lock\{/);
  assert.match(css,/\.job-access-unlock:focus-visible\{outline:2px solid #86efac/);
  assert.match(css,/html\[data-theme="light"\] \.job-access-lock\{/);
  assert.match(css,/html\[data-theme="light"\] \.job-access-unlock:focus-visible\{outline-color:#1d4ed8\}/);
  assert.doesNotMatch(css,/(?:^|[},])\s*(?:input|select|textarea)\s*\{[^}]*job-access/s);
});

test('The database feed strips every premium value for limited access',()=>{
  assert.match(migration,/v_full boolean := false/);
  ['recruiter_name','recruiter_company','recruiter_phone','recruiter_email','source_url','application_url'].forEach((field)=>{
    assert.match(migration,new RegExp("- '"+field+"'"));
  });
  assert.match(migration,/'access', case when v_full then 'full' else 'limited' end/);
});
