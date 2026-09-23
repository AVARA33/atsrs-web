const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const recruiters = fs.readFileSync('css/recruiter-directory-v6029.css', 'utf8');
const companies = fs.readFileSync('css/employers.css', 'utf8');
const jobs = fs.readFileSync('css/jobs-prototype.css', 'utf8');

test('company and JobSearch cards inherit the recruiter card surface', () => {
  assert.match(recruiters, /#recruitersPage \.employer-card \{[\s\S]*?background:#08100c;/);
  assert.match(companies, /#employersPage \.employer-card \{[\s\S]*?background: #08100c;/);
  assert.match(jobs, /html\[data-theme="dark"\] #jobsPage \.job-card\{background:#08100c;/);
});

test('company cards keep recruiter typography and JobSearch remains readable', () => {
  assert.match(recruiters, /#recruitersPage \.employer-card-copy h4 \{[\s\S]*?font-size:16px;/);
  assert.match(companies, /#employersPage \.employer-card-copy h4 \{[\s\S]*?font-size: 16px;/);
  assert.match(jobs, /\.jobs-cards \.job-card-head h2\{font-size:18px;/);
  assert.match(companies, /#employersPage \.employer-card-copy p \{[\s\S]*?font-size: 12px;/);
  assert.match(jobs, /\.jobs-cards \.job-card-summary\{font-size:14px;/);
});

test('the shared card styles remain cache-busted in V6164', () => {
  assert.match(html, /data-atsrs-build="V6164"/);
  assert.match(html, /css\/jobs-prototype\.css\?v=6164/);
  assert.match(html, /css\/employers\.css\?v=6162/);
});
