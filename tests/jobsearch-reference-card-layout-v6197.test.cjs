const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const css = fs.readFileSync('css/jobs-prototype.css', 'utf8');
const runtime = fs.readFileSync('js/jobs-prototype.js', 'utf8');

test('JobSearch cards use the approved dark editorial layout', () => {
  assert.match(css, /V6194: reference-led editorial job cards/);
  assert.match(css, /--jobs-copper:#ac613b/);
  assert.match(css, /--jobs-page:#0c0d0e/);
  assert.match(css, /min-height:344px/);
  assert.match(css, /linear-gradient\(180deg,rgba\(0,0,0,\.12\).*rgba\(0,0,0,\.94\)/s);
  assert.match(css, /\.job-card-brand\{position:absolute;top:18px/);
  assert.match(css, /\.job-card-tags/);
  assert.match(css, /\.job-fact-location.*\.job-fact-posted.*\.job-fact-duration.*\.job-fact-work-type/s);
});

test('compact cards preserve complete detail access and deterministic tags', () => {
  assert.match(runtime, /job-fact-'\+key/);
  assert.match(runtime, /icons=\{region:'ph-map-pin'.*'work-type':'ph-briefcase'/s);
  assert.match(runtime, /job-card-brand/);
  assert.match(runtime, /jobCompanyLogo/);
  assert.match(runtime, /job-card-view-cta/);
  assert.match(runtime, /job-card-recruiter-copy/);
  assert.match(runtime, /job-card-tags/);
  assert.match(runtime, /Recruiter LinkedIn.*recruiterLinkedInUrl/s);
  assert.match(runtime, /openDetails\(job,details,preview\)/);
});

test('JobSearch artwork keeps natural colour beneath the specified black overlay', () => {
  assert.match(css, /background:#0B0C0D!important/);
  assert.match(css, /border-color:#34383C!important/);
  assert.match(css, /border-top-color:#AC613B!important/);
  assert.match(css, /rgba\(0,0,0,\.58\)/);
  assert.match(css, /rgba\(0,0,0,\.82\)/);
  assert.match(css, /background-blend-mode:normal,normal!important/);
  assert.match(css, /filter:none!important/);
  assert.match(css, /background:#C06D45!important/);
});
