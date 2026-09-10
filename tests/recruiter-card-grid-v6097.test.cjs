const assert=require('node:assert/strict');
const fs=require('node:fs');

const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('css/recruiter-directory-v6029.css','utf8');

assert.match(html,/css\/recruiter-directory-v6029\.css\?v=6097/);
assert.match(css,/#recruitersPage \.employers-grid \{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\);/);
assert.doesNotMatch(css,/#recruitersPage \.employers-grid \{[\s\S]*?grid-template-columns:repeat\(3,minmax\(0,1fr\)\);/);
assert.match(css,/@media\(max-width:760px\) \{[\s\S]*?#recruitersPage \.employers-grid \{ grid-template-columns:1fr; \}/);

console.log('recruiter-card-grid-v6097: PASS');
