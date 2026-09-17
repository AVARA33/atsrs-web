const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'js', 'jobs-prototype.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'jobs-prototype.css'), 'utf8');
const loader = fs.readFileSync(path.join(root, 'js', 'route-feature-loader.js'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20260917112828_job_posted_date_range_filter.sql'), 'utf8');

assert.match(index, /id="jobsDateFilter"[^>]+aria-haspopup="dialog"/);
assert.match(index, /id="jobsDateFrom" type="date"/);
assert.match(index, /id="jobsDateTo" type="date"/);
assert.match(index, /css\/jobs-prototype\.css\?v=6102/);
assert.match(loader, /js\/jobs-prototype\.js\?v=6103/);
assert.match(runtime, /document\.addEventListener\('pointerdown'/);
assert.match(runtime, /client\.rpc\('atsrs_jobs_feed_v3',params\)/);
assert.match(runtime, /p_date_from:state\.dateFrom\|\|null/);
assert.match(runtime, /p_date_to:state\.dateTo\|\|null/);
assert.match(runtime, /if\(from&&to&&from>to\)/);
assert.match(css, /\.jobs-date-range-panel/);
assert.match(css, /@media\(max-width:600px\)\{\.jobs-date-range-panel/);
assert.match(migration, /create or replace function public\.atsrs_jobs_feed_v3/);
assert.match(migration, /p_date_from date default null/);
assert.match(migration, /p_date_to date default null/);
assert.match(migration, />= p_date_from/);
assert.match(migration, /<= p_date_to/);

console.log('Jobs posted-date range filter contracts passed');
