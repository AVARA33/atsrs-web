const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('js/employers.js', 'utf8');
const css = fs.readFileSync('css/employers.css', 'utf8');
const storage = fs.readFileSync('js/storage.js', 'utf8');

const jobs = html.indexOf('id="navJobs"');
const employers = html.indexOf('id="navEmployers"');
const documents = html.indexOf('id="navCertificates"');
assert.ok(jobs >= 0 && employers > jobs && documents > employers, 'Employers must sit between JobSearch and Documents in Personal navigation');
assert.match(html, /id="employersPage"/);
assert.match(html, /css\/employers\.css\?v=1/);
assert.match(html, /js\/employers\.js\?v=1/);
assert.match(html, /js\/storage\.js\?v=590/);
assert.match(html, /js\/shell-polish\.js\?v=569/);
assert.match(js, /https:\/\/careers\.subsea7\.com/);
assert.match(js, /https:\/\/www\.oceaneering\.com\/careers\//);
assert.match(js, /https:\/\/www\.dof\.com\/vacancies/);
assert.match(js, /https:\/\/www\.fugro\.com\/careers/);
assert.doesNotMatch(js, /mailto:/, 'The directory must not send unsolicited email');
assert.match(js, /showPage\('profile'/);
assert.match(js, /profileTabSharingBtn/);
assert.match(storage, /employers:navEmployers/g);
assert.match(css, /\.employers-grid/);

console.log('Employers directory contracts passed');
