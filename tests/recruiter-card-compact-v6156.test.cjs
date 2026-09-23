const assert=require('node:assert/strict');
const fs=require('node:fs');

const html=fs.readFileSync('index.html','utf8');
const loader=fs.readFileSync('js/route-feature-loader.js','utf8');
const js=fs.readFileSync('js/recruiters.js','utf8');
const css=fs.readFileSync('css/recruiter-directory-v6029.css','utf8');

assert.match(html,/data-atsrs-build="V6157"/);
assert.match(html,/js\/route-feature-loader\.js\?v=6157/);
assert.match(html,/css\/recruiter-directory-v6029\.css\?v=6156/);
assert.match(loader,/js\/recruiters\.js\?v=6156/);
assert.match(js,/ph ph-seal-check employer-verified-icon/);
assert.match(js,/location\.className = "employer-location"/);
assert.match(js,/"briefcase",[\s\S]*?goToJobs\(name\)/);
assert.match(css,/V6156: compact horizontal recruiter cards/);
assert.match(css,/#recruitersPage \.employer-card \{[\s\S]*?grid-template-columns:minmax\(0,1fr\) auto;[\s\S]*?min-height:108px;/);
assert.match(css,/#recruitersPage \.employer-card-copy h4 \{[\s\S]*?font-size:16px;/);
assert.match(css,/#recruitersPage \.employer-card-copy p \{[\s\S]*?font-size:12px;/);
assert.match(css,/#recruitersPage \.employer-actions a,[\s\S]*?width:44px !important;/);
assert.match(css,/@media\(max-width:620px\) \{[\s\S]*?#recruitersPage \.employer-card \{ grid-template-columns:minmax\(0,1fr\);/);

console.log('Compact recruiter card V6156 contracts passed');
