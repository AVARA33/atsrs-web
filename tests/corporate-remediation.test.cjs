const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'corporate-remediation.css'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'js', 'corporate-remediation.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
const talent = fs.readFileSync(path.join(root, 'js', 'talent-directory.js'), 'utf8');
const serverData = fs.readFileSync(path.join(root, 'js', 'server-data.js'), 'utf8');

assert.match(html, /id="corporateAccountContext"[\s\S]*Workspace details/);
assert.match(runtime, /setText\('pageTitle','Corporate Account'\)/);
assert.match(css, /body\.company-mode #profilePage>\.panel>#accountTitle/);
assert.match(css, /body\.company-mode #profilePage #accountGeneralTab>\.profile-grid[\s\S]*display:none!important/);
assert.match(css, /body\.company-mode #refsPage \.cv-card[\s\S]*display:none!important/);
assert.match(css, /data-atsrs-v134-kind="coverLetter"/);
assert.match(runtime, /Legacy materials \(internal\)/);
assert.match(runtime, /Client References/);
assert.match(runtime, /Testimonials & Recommendation Letters/);
assert.match(serverData, /\.eq\('user_id',valueUser\.id\)[\s\S]*\.eq\('account_type',accountType\(\)\)/);

assert.doesNotMatch(html, /<h3[^>]*>Company credentials<\/h3>/i);
assert.doesNotMatch(html, /id="compliancePageTitle"/);
assert.doesNotMatch(html, /id="reportsTitle"/);
assert.match(html, /does not certify role or project eligibility/);
assert.match(app, /No company documents uploaded yet/);
assert.match(app, /No documents match this filter/);

assert.match(talent, /toLocaleDateString\('en-GB'/);
assert.match(talent, /toLocaleString\('en-GB'\)/);
assert.doesNotMatch(talent, /toLocaleString\(\)/);
assert.doesNotMatch(talent, /Every Personal user appears here automatically/);
assert.match(html, /Only eligible Personal profiles that chose to appear/);
assert.doesNotMatch(html, /future Excel exports/);
assert.match(html, /role="group" aria-labelledby="talentWorkTypeLabel"/);
assert.match(talent, /atsrs_candidate_view_explicit/);
assert.match(talent, /atsrs_personnel_view_explicit/);
assert.match(talent, /matchMedia\('\(max-width: 720px\)'\)/);

assert.match(css, /--atsrs-control-height:40px/);
assert.match(css, /--atsrs-touch-height:44px/);
assert.match(css, /\.corporate-compliance-metrics\{grid-template-columns:repeat\(5/);
assert.match(css, /@media\(max-width:720px\)/);
assert.match(css, /#app button:focus-visible/);

console.log('Corporate correctness and presentation contract tests passed');
