const assert=require('node:assert/strict');
const fs=require('node:fs');
const test=require('node:test');

const runtime=fs.readFileSync('js/jobs-prototype.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('css/jobs-prototype.css','utf8');
const migration=fs.readFileSync('supabase/migrations/20260913090000_job_role_multi_filter.sql','utf8');

test('role filter supports several checked exact titles',()=>{
  assert.match(html,/id="jobsRoleFilter" multiple/);
  assert.match(runtime,/function selectedValues\(selectId\)/);
  assert.match(runtime,/params\.p_roles=Array\.isArray\(state\.roles\)/);
  assert.match(runtime,/client\.rpc\('atsrs_jobs_feed_v3',feedParamsV3\(target,state\)\)/);
  assert.match(migration,/job\.title = any\(p_roles\)/);
  assert.match(css,/\.jobs-select-check-option/);
});

test('search remains broad while role choices follow matching titles',()=>{
  assert.match(migration,/job\.title not ilike '%' \|\| btrim\(requested\.term\) \|\| '%'/);
  assert.match(runtime,/roleRows=terms\.length\?countryRows\.filter/);
  assert.match(runtime,/title\.indexOf\(term\)>=0/);
  assert.doesNotMatch(migration,/requested\.term.*rov|word in \('wrov'/i);
});
