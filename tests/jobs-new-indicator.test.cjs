const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'js','jobs-prototype.js'),'utf8');
const css=fs.readFileSync(path.join(root,'css','jobs-prototype.css'),'utf8');
const start=source.indexOf('var JOB_NEW_WINDOW_MS=');
const end=source.indexOf('function card(',start);
assert.ok(start>=0&&end>start,'NEW indicator helpers must remain extractable');

const context={Number,Date};
vm.createContext(context);
vm.runInContext(source.slice(start,end),context);

const published='2026-08-16T12:00:00.000Z';
const at=(milliseconds)=>Date.parse(published)+milliseconds;
const job={published_at:published};
assert.equal(context.isNewPublishedJob(job,at(5*60*60*1000+59*60*1000+59*1000)),true,'5:59:59 remains NEW');
assert.equal(context.isNewPublishedJob(job,at(6*60*60*1000)),false,'6:00:00 expires');
assert.equal(context.isNewPublishedJob({published_at:''},at(1)),false);
assert.equal(context.isNewPublishedJob({published_at:'not-a-date'},at(1)),false);
assert.equal(context.isNewPublishedJob({published_at:'2026-08-16T13:00:00.000Z'},Date.parse(published)),false,'future timestamps are never NEW');
assert.equal(context.isNewPublishedJob({created_at:published},at(1)),false,'created/import time is not publish time');
assert.match(source,/setTimeout\(render,Math\.max\(1,nearestExpiry-nowMs\+1\)\)/);
assert.doesNotMatch(source,/setInterval\(/);
const indicatorHelpers=source.slice(source.indexOf('function publishedAtMs'),source.indexOf('function card('));
assert.doesNotMatch(indicatorHelpers,/localStorage|created_at/);
assert.match(source,/aria-label="New vacancy published within the last 6 hours"/);
assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.job-new-badge i\{animation:none\}\}/);

console.log('Jobs NEW indicator boundary tests passed');
