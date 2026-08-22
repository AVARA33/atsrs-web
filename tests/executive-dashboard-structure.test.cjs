const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'js/executive-dashboard-v5854.js'),'utf8');
const css=fs.readFileSync(path.join(root,'css/executive-dashboard-v5854.css'),'utf8');
const harness=fs.readFileSync(path.join(root,'tests/fixtures/executive-dashboard-harness.html'),'utf8');
const responsiveHarness=fs.readFileSync(path.join(root,'tests/fixtures/executive-dashboard-responsive-frame.html'),'utf8');

assert.match(html,/css\/executive-dashboard-v5854\.css\?v=5854/);
assert.match(html,/js\/executive-dashboard-v5854\.js\?v=5855/);

assert.match(js,/atsrsExpiryStatus\.summarize/,'Personal current documents must use the shared expiry contract.');
assert.match(js,/atsrsCorporateReporting\.getCompliance/,'Corporate dashboard must reuse the existing compliance source.');
assert.match(js,/atsrs:corporate-compliance/,'Corporate updates must follow the existing reporting event.');
assert.match(js,/if\(!corporate\(\)\)[\s\S]*?personalGrid\.remove\(\)[\s\S]*?return/,'Personal Dashboard must keep the area below the KPI cards empty.');
assert.match(js,/uploadedAt/,'Personal recent activity must use real upload timestamps.');
assert.match(js,/uploaded_at/,'Corporate recent activity must use real upload timestamps.');
assert.doesNotMatch(js,/Math\.random|faker|mock data|12\.4|20 GB/i,'Dashboard must not fabricate production data.');
assert.doesNotMatch(js,/fetch\(|supabaseClient|\.from\(/,'Dashboard enhancement must not add backend queries.');

assert.match(css,/#dashboardPage \.dashboard-executive-grid/,'New layout must remain scoped to Dashboard.');
assert.match(css,/@media\(max-width:560px\)/,'Mobile layout must be explicit.');
assert.match(css,/var\(--atsrs-ref-light-surface\)/,'Light mode must reuse ATSRS tokens.');
assert.match(css,/var\(--atsrs-workspace-surface/,'Dark mode must reuse ATSRS workspace tokens.');
assert.doesNotMatch(css,/(^|\n)\s*(button|input|select|h1|\*)\s*\{/,'No unscoped global control or typography override is allowed.');
assert.match(harness,/mode=company|params\.get\('mode'\)/,'Harness must support Corporate visual QA.');
assert.match(harness,/theme.*light/,'Harness must support light-mode visual QA.');
assert.match(responsiveHarness,/iframe/,'Responsive QA must use a real nested viewport.');
assert.match(responsiveHarness,/Math\.max\(320/,'Responsive QA must cover mobile viewport widths.');

console.log('executive-dashboard-structure: PASS');
