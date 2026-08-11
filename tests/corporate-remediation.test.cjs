const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'corporate-remediation.css'), 'utf8');
const shellCss = fs.readFileSync(path.join(root, 'css', 'shell-polish.css'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'js', 'corporate-remediation.js'), 'utf8');
assert.match(runtime, /window\.localStorage&&window\.localStorage\.getItem\('atsrs_current_page'\)/);
assert.match(runtime, /page==='privacy'\?'Privacy Notice':page==='dataRights'\?'Data Rights'/);
const app = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
const talent = fs.readFileSync(path.join(root, 'js', 'talent-directory.js'), 'utf8');
const serverData = fs.readFileSync(path.join(root, 'js', 'server-data.js'), 'utf8');

assert.match(html, /id="corporateAccountContext"[\s\S]*Workspace details/);
assert.match(runtime, /document\.querySelector\('#app \.nav button\.active'\)/);
assert.match(runtime, /active\.id==='navProfile'[\s\S]*label='Corporate Account'/);
assert.match(runtime, /if\(label\)setText\('pageTitle',label\)/);
assert.match(runtime, /if\(document\.body&&window\.MutationObserver\)/);
assert.match(css, /body\.company-mode #profilePage>\.panel>#accountTitle/);
assert.match(css, /body\.company-mode #profilePage #accountGeneralTab>\.profile-grid[\s\S]*display:none!important/);
assert.match(css, /\.corporate-account-context\{[\s\S]*?padding:0;[\s\S]*?border:0;[\s\S]*?border-radius:0;[\s\S]*?background:transparent;/);
assert.match(css, /html\[data-theme="light"\] \.corporate-account-context\{background:transparent;border-color:transparent\}/);
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
assert.match(runtime, /setText\('compliancePageSub','This view checks uploaded document expiry dates only\. It does not certify role or project eligibility\.'\)/);
assert.match(runtime, /setText\('reportsSub','This report checks uploaded document expiry dates only\. It does not certify role or project eligibility\.'\)/);
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
assert.match(css, /\.corporate-compliance-metrics\{grid-template-columns:repeat\(6/);
assert.match(css, /@media\(max-width:720px\)/);
assert.match(css, /#app button:focus-visible/);
assert.match(shellCss, /#candidatesPage,#personnelPage[^}]*\.talent-view-switch\{[\s\S]*?background:#fff!important/);
assert.match(shellCss, /\.talent-view-switch button\[aria-pressed="true"\][\s\S]*?border-color:#2f6fb2!important/);
assert.match(shellCss, /html\[data-theme="dark"\][\s\S]*?\.talent-view-switch button\[aria-pressed="true"\][\s\S]*?border-color:#4f8b7d!important/);

function runTitleHarness(activeId, activeText) {
  const elements = {
    pageTitle: { textContent: '' },
    cabinetText: { textContent: '' },
    accountTitle: { textContent: '' },
    profilePage: { classList: { contains() { return activeId !== 'navProfile'; } } },
    userEmail: { textContent: '' }
  };
  const active = { id: activeId, textContent: activeText };
  const body = {
    classList: { contains(value) { return value === 'company-mode'; } }
  };
  const context = {
    window: { addEventListener() {} },
    document: {
      readyState: 'complete',
      body,
      getElementById(id) { return elements[id] || null; },
      querySelector(selector) {
        if (selector === '#app .nav button.active') return active;
        return null;
      }
    },
    MutationObserver: class { observe() {} },
    console
  };
  vm.runInNewContext(runtime, context, { filename: 'corporate-remediation.js' });
  return { title: elements.pageTitle.textContent, sidebar: elements.cabinetText.textContent };
}

assert.deepEqual(runTitleHarness('navDashboard', 'Dashboard'), {
  title: 'Dashboard',
  sidebar: 'Corporate Workspace'
});
assert.equal(runTitleHarness('navProfile', 'Account').title, 'Corporate Account');

console.log('Corporate correctness and presentation contract tests passed');
