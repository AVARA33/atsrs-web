const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'corporate-information-architecture.css'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'js', 'corporate-information-architecture.js'), 'utf8');
const talent = fs.readFileSync(path.join(root, 'js', 'talent-directory.js'), 'utf8');

const ids = [...html.matchAll(/<button id="(nav(?:Dashboard|Candidates|Personnel|Credentials|Compliance|Reports|Profile))"/g)].map((match) => match[1]);
assert.deepEqual(ids, [
  'navDashboard',
  'navCandidates',
  'navPersonnel',
  'navCredentials',
  'navCompliance',
  'navReports',
  'navProfile'
], 'Corporate primary navigation order must match the approved IA');

assert.match(html, /id="navCredentials" class="company-only"[^>]*>Company Credentials</);
assert.match(html, /id="navIntro" class="nav-utility active"[^>]*>Product Updates</);
assert.match(html, /id="navPrivacy" class="nav-utility nav-legal-link" type="button" onclick="showPage\('privacy',this\)">Privacy<\/button>/);
assert.doesNotMatch(html, /id="navDataRights"/);
assert.ok(html.indexOf('id="navIntro"') < html.indexOf('id="navPrivacy"'));
assert.match(html, /src="js\/talent-directory\.js\?v=447"/);
assert.match(html, /src="js\/corporate-information-architecture\.js\?v=444"/);
assert.match(html, /href="css\/corporate-information-architecture\.css\?v=421"/);
assert.equal((html.match(/data-company-credentials-tab="documents"/g) || []).length, 2);
assert.equal((html.match(/data-company-credentials-tab="references"/g) || []).length, 2);

assert.match(css, /body\.company-mode #navCertificates,\s*body\.company-mode #navRefs/);
assert.match(css, /body\.personal-mode #navCredentials/);
assert.match(css, /body\.company-mode #dashboardPage \.cv-status-card/);
assert.match(css, /#candidatesPage\),?\s*#personnelPage|#candidatesPage[\s\S]*#personnelPage/);
assert.match(css, /--atsrs-content-width:1560px/);
assert.match(css, /@media\(max-width:800px\)/);
assert.match(css, /#app #navIntro\{\s*order:100;/);
assert.match(css, /#app #navPrivacy\{\s*order:101;/);
assert.doesNotMatch(css, /#navDataRights/);
assert.doesNotMatch(css, /body\.(?:company|personal)-mode #nav(?:Privacy|DataRights)/);

assert.match(runtime, /credentialPage\(section\)/);
assert.match(runtime, /localStorage\.getItem\('atsrs_current_page'\)/);
assert.match(runtime, /page==='certificates'\|\|page==='refs'/);
assert.match(runtime, /pageTitle'\)[\s\S]*Company Credentials/);
assert.match(runtime, /\[byId\('navCertificates'\),byId\('navRefs'\)\][\s\S]*classList\.remove\('active'\)/);
assert.match(runtime, /if\(document\.body&&window\.MutationObserver\)/);

assert.match(talent, /action:'summary',target_user_id:profile\.user_id/);
assert.match(talent, /action:'cv',target_user_id:profile\.user_id/);
assert.match(talent, /CV on file/);

console.log('Corporate information architecture contract tests passed');
