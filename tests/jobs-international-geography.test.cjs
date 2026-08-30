const fs=require('node:fs');
const assert=require('node:assert/strict');

const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('css/jobs-prototype.css','utf8');
const runtime=fs.readFileSync('js/jobs-prototype.js','utf8');
const loader=fs.readFileSync('js/route-feature-loader.js','utf8');
const migration=fs.readFileSync('supabase/migrations/20260830233000_international_job_geography.sql','utf8');

assert.match(html,/Explore opportunities worldwide/);
assert.match(html,/across industries, countries and work arrangements/);
for(const id of ['jobsRegionNav','jobsRegionFilter','jobsCountryFilter','jobsLocationFilter','jobsGeographyTrail'])assert.match(html,new RegExp(`id="${id}"`));
assert.match(html,/data-jobs-region="europe-central-asia"/);
assert.match(html,/data-jobs-region="remote-worldwide"/);
assert.match(css,/grid-template-areas:"search role region country location clear"/);

assert.match(runtime,/rpc\('atsrs_jobs_feed_v2'/);
assert.match(runtime,/rpc\('atsrs_jobs_facets_v2'/);
assert.match(runtime,/p_region:state\.region/);
assert.match(runtime,/p_country:state\.country/);
assert.match(runtime,/url\.searchParams\.set\('route','jobs'\)/);
assert.match(runtime,/\['region','country','location'\]/);
assert.doesNotMatch(runtime,/ROV \/ equipment/);
assert.match(loader,/jobs-prototype\.js\?v=5996/);

assert.match(migration,/create or replace function public\.atsrs_job_region/);
assert.match(migration,/create or replace function public\.atsrs_jobs_feed_v2/);
assert.match(migration,/create or replace function public\.atsrs_jobs_facets_v2/);
assert.match(migration,/public\.atsrs_job_region\(job\.country, job\.location\) = p_region/);
assert.match(migration,/grant execute on function public\.atsrs_jobs_feed_v2/);

console.log('international JobSearch geography: PASS');
