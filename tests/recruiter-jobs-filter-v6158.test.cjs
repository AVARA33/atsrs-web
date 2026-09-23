const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const recruiters = fs.readFileSync('js/recruiters.js', 'utf8');
const jobs = fs.readFileSync('js/jobs-prototype.js', 'utf8');
const loader = fs.readFileSync('js/route-feature-loader.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

test('recruiter vacancy action carries the selected recruiter into JobSearch', () => {
  assert.match(recruiters, /__atsrsPendingJobsRecruiter = name/);
  assert.match(recruiters, /atsrsOpenJobsDirectory\("jobs", byId\("navJobs"\)\)/);
});

test('JobSearch applies the requested recruiter after options load', () => {
  assert.match(jobs, /async function applyRequestedRecruiter\(\)/);
  assert.match(jobs, /await loadOptions\(\)/);
  assert.match(jobs, /select\.value=option\.value/);
  assert.match(jobs, /refreshJobsSelect\('jobsRecruiterFilter'\)/);
  assert.match(jobs, /return load\(filtered\?1:page\)/);
});

test('runtime cache versions expose the recruiter filter handoff', () => {
  assert.match(loader, /jobs-prototype\.js\?v=6164/);
  assert.match(loader, /recruiters\.js\?v=6158/);
  assert.match(html, /route-feature-loader\.js\?v=6164/);
});
