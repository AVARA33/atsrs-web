const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'..','js','jobs-prototype.js'),'utf8');
const start=source.indexOf('function clean(');
const end=source.indexOf('function db(',start);
assert.ok(start>=0&&end>start,'email helpers must remain extractable');

const context={URL,encodeURIComponent};
vm.createContext(context);
vm.runInContext(source.slice(start,end),context);

const valid={
  title:'ROV Pilot & Technician',
  company:'Ocean Co',
  recruiter_email:'recruiter@example.com',
  source_url:'https://example.com/jobs/42?from=atsrs'
};
const href=context.mailtoHref(valid);
assert.match(href,/^mailto:recruiter@example\.com\?/);
assert.ok(href.includes('subject='+encodeURIComponent('ATSRS application — ROV Pilot & Technician')));
assert.ok(href.includes('body='));
assert.equal(decodeURIComponent(href.split('&body=')[1]).includes('ROV Pilot & Technician'),true);
assert.equal(decodeURIComponent(href.split('&body=')[1]).includes('Ocean Co'),true);
assert.equal(context.mailtoHref({...valid,recruiter_email:''}),'');
assert.equal(context.mailtoHref({...valid,recruiter_email:'not-an-email'}),'');
assert.equal(context.mailtoHref({...valid,recruiter_email:'a@b'}),'');
assert.doesNotMatch(source,/['"]tel:/);
assert.match(source,/var applicationHref=httpUrl\(job\.application_url\)/);

console.log('Jobs email action tests passed');
