const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const storage = fs.readFileSync('js/storage.js', 'utf8');
const recruiters = fs.readFileSync('js/recruiters.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

test('internal page changes create browser history entries', () => {
  assert.match(storage, /previousRoute=routeUrl\.searchParams\.get\("route"\)/);
  assert.match(storage, /replace\?history\.replaceState:history\.pushState/);
  assert.match(storage, /previousRoute===requestedPage/);
});

test('initial restoration and browser traversal do not create loops', () => {
  assert.match(storage, /showPage\(page,map\[page\],options\|\|\{replace:true\}\)/);
  assert.match(storage, /addEventListener\('popstate',function\(\)\{restoreCurrentPage\(\{replace:true\}\)/);
  assert.match(storage, /route'\)==='jobs'\)window\.dispatchEvent\(new CustomEvent\('atsrs:jobs-nav'\)\)/);
});

test('recruiter-to-jobs navigation leaves route history to showPage', () => {
  assert.match(recruiters, /__atsrsPendingJobsRecruiter = name/);
  assert.doesNotMatch(recruiters, /searchParams\.set\("route", "jobs"\)/);
  assert.match(html, /data-atsrs-build="V6166"/);
  assert.match(html, /js\/storage\.js\?v=612/);
});
