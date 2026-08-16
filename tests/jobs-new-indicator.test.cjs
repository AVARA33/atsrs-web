const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'js','jobs-prototype.js'),'utf8');
const css=fs.readFileSync(path.join(root,'css','jobs-prototype.css'),'utf8');
const start=source.indexOf('function publishedMs(');
const end=source.indexOf('function badge(',start);
assert.ok(start>=0&&end>start,'NEW indicator helpers must remain extractable');

const context={Number,Date};
vm.createContext(context);
vm.runInContext('var NEW_MS=21600000;'+source.slice(start,end),context);

const published='2026-08-16T12:00:00.000Z';
const at=(milliseconds)=>Date.parse(published)+milliseconds;
const job={status:'published',published_at:published};
assert.equal(context.isNew(job,at(5*60*60*1000+59*60*1000+59*1000)),true,'5:59:59 remains NEW');
assert.equal(context.isNew(job,at(6*60*60*1000)),false,'6:00:00 expires');
assert.equal(context.isNew({status:'published',published_at:''},at(1)),false);
assert.equal(context.isNew({status:'published',published_at:'not-a-date'},at(1)),false);
assert.equal(context.isNew({status:'published',published_at:'2026-08-16T13:00:00.000Z'},Date.parse(published)),false,'future timestamps are never NEW');
assert.equal(context.isNew({status:'draft',published_at:published},at(1)),false,'drafts are never NEW');
assert.equal(context.isNew({status:'published',created_at:published},at(1)),false,'created/import time is not publish time');
assert.match(source,/timer=setTimeout\(render,Math\.max\(1,nearest-now\+1\)\)/);
assert.doesNotMatch(source,/setInterval\(/);
const indicatorHelpers=source.slice(source.indexOf('function publishedMs'),source.indexOf('function badge('));
assert.doesNotMatch(indicatorHelpers,/localStorage|created_at/);
assert.match(source,/setAttribute\('aria-label','New vacancy published within the last 6 hours'\)/);
assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.job-new-badge i\{animation:none\}\}/);

console.log('Jobs NEW indicator boundary tests passed');
