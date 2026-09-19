const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const loader = fs.readFileSync(path.join(root, 'js', 'route-feature-loader.js'), 'utf8');
const jobs = fs.readFileSync(path.join(root, 'js', 'jobs-prototype.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'jobs-prototype.css'), 'utf8');

assert.match(index, /data-atsrs-build="V6110"/);
assert.match(index, /href="css\/jobs-prototype\.css\?v=6109"/);
assert.match(index, /src="js\/route-feature-loader\.js\?v=6109"/);
assert.match(loader, /loadScript\('js\/jobs-prototype\.js\?v=6109'\)/);
assert.match(jobs, /p\.classList\.add\('job-contact-static'\)/);
assert.match(jobs, /ph ph-hand-tap job-contact-link-icon/);
assert.doesNotMatch(jobs, /ph ph-arrow-up-right job-contact-link-icon/);
assert.match(css, /\.jobs-cards \.job-recruiter-info\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
assert.match(css, /\.jobs-cards \.job-card-summary\{font-size:14px;line-height:1\.45\}/);
assert.match(css, /html\[data-theme\] #jobsPage \.job-contact-clickable\{/);
assert.match(css, /border-color:var\(--atsrs-field-focus-block-line\) var\(--atsrs-field-focus-inline-line\)/);
assert.match(css, /html\[data-theme\] #jobsPage \.job-contact-clickable\{[\s\S]*?background:var\(--atsrs-field-surface\)/);
assert.match(css, /\.job-contact-clickable:focus-within\{[\s\S]*?box-shadow:var\(--atsrs-field-focus-shadow\)/);
assert.match(css, /\.jobs-cards \.job-card-body\{grid-template-rows:minmax\(0,1fr\)\}/);
assert.match(css, /\.jobs-cards \.job-contact-info\{align-content:end\}/);
assert.match(jobs, /el\('footer','job-contact-info'\)/);
assert.match(jobs, /body\.append\(project\);a\.append\(head\);if\(favorite\)a\.append\(favorite\);a\.append\(details,body,c\)/);
assert.match(css, /@keyframes jobs-contact-hand-tap/);
assert.match(css, /\.job-contact-link-icon\.ph-hand-tap\{font-size:16px/);
assert.match(css, /animation:jobs-contact-hand-tap 3s ease-out infinite/);
assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);

console.log('V6110 JobSearch saved jobs release is cache-busted');
