const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const loader = fs.readFileSync(path.join(root, 'js', 'route-feature-loader.js'), 'utf8');
const jobs = fs.readFileSync(path.join(root, 'js', 'jobs-prototype.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'jobs-prototype.css'), 'utf8');

assert.match(index, /data-atsrs-build="V5921"/);
assert.match(index, /href="css\/jobs-prototype\.css\?v=5921"/);
assert.match(index, /src="js\/route-feature-loader\.js\?v=5917"/);
assert.match(loader, /loadScript\('js\/jobs-prototype\.js\?v=5917'\)/);
assert.match(jobs, /p\.classList\.add\('job-contact-static'\)/);
assert.match(css, /\.jobs-cards \.job-recruiter-info\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
assert.match(css, /\.jobs-cards \.job-card-summary\{font-size:14px;line-height:1\.45\}/);
assert.match(css, /html\[data-theme\] #jobsPage \.job-contact-clickable\{/);
assert.match(css, /border-color:var\(--atsrs-field-focus-block-line\) var\(--atsrs-field-focus-inline-line\)/);
assert.match(css, /html\[data-theme\] #jobsPage \.job-contact-clickable\{[\s\S]*?background:var\(--atsrs-field-surface\)/);
assert.match(css, /\.job-contact-clickable:focus-within\{[\s\S]*?box-shadow:var\(--atsrs-field-focus-shadow\)/);
assert.match(css, /\.jobs-cards \.job-card-body\{grid-template-rows:auto minmax\(min-content,1fr\)\}/);
assert.match(css, /\.jobs-cards \.job-contact-info\{align-content:end\}/);

console.log('V5921 JobSearch contact layout and readability release is cache-busted');
