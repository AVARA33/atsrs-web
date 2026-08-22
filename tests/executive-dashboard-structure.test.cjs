const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'js/executive-dashboard-v5854.js'),'utf8');
const css=fs.readFileSync(path.join(root,'css/executive-dashboard-v5854.css'),'utf8');
const harness=fs.readFileSync(path.join(root,'tests/fixtures/executive-dashboard-harness.html'),'utf8');
const responsiveHarness=fs.readFileSync(path.join(root,'tests/fixtures/executive-dashboard-responsive-frame.html'),'utf8');

assert.match(html,/css\/executive-dashboard-v5854\.css\?v=5857/);
assert.match(html,/js\/executive-dashboard-v5854\.js\?v=5857/);

assert.match(js,/atsrsExpiryStatus\.summarize/,'Personal current documents must use the shared expiry contract.');
assert.match(js,/atsrsCorporateReporting\.getCompliance/,'Corporate dashboard must reuse the existing compliance source.');
assert.match(js,/atsrs:corporate-compliance/,'Corporate updates must follow the existing reporting event.');
assert.match(js,/if\(!corporate\(\)\)[\s\S]*?ensurePersonalToolsGrid\(stats\)[\s\S]*?loadPersonalStorage/,'Personal Dashboard must place the requested tools directly below the KPI cards.');
assert.match(js,/atsrs_my_personal_entitlements/,'Storage capacity must come from the authenticated plan entitlement.');
assert.match(js,/from\('atsrs_files'\)\.select\('size_bytes'\)/,'Storage usage must sum real authenticated file metadata.');
assert.match(js,/MutationObserver[\s\S]*?dashboardVisible\(\)[\s\S]*?sync/,'Dashboard tools must initialize when authenticated routing reveals the page.');
assert.match(js,/uploadedAt/,'Personal recent activity must use real upload timestamps.');
assert.match(js,/uploaded_at/,'Corporate recent activity must use real upload timestamps.');
assert.doesNotMatch(js,/Math\.random|faker|mock data|12\.4|20 GB/i,'Dashboard must not fabricate production data.');
assert.doesNotMatch(js,/fetch\(/,'Dashboard enhancement must use the authenticated Supabase client rather than direct network requests.');

assert.match(css,/#dashboardPage \.dashboard-executive-grid/,'New layout must remain scoped to Dashboard.');
assert.match(css,/dashboard-personal-tools\{[\s\S]*?grid-template-columns:minmax\(0,3fr\) minmax\(300px,1fr\)/,'Quick Actions and Storage Usage must share one desktop row.');
assert.match(css,/dashboard-personal-actions\{[\s\S]*?grid-template-columns:repeat\(6,minmax\(106px,1fr\)\)/,'All six quick actions must stay in one row.');
assert.match(css,/@media\(max-width:560px\)/,'Mobile layout must be explicit.');
assert.match(css,/var\(--atsrs-ref-light-surface\)/,'Light mode must reuse ATSRS tokens.');
assert.match(css,/var\(--atsrs-workspace-surface/,'Dark mode must reuse ATSRS workspace tokens.');
assert.doesNotMatch(css,/(^|\n)\s*(button|input|select|h1|\*)\s*\{/,'No unscoped global control or typography override is allowed.');
assert.match(harness,/mode=company|params\.get\('mode'\)/,'Harness must support Corporate visual QA.');
assert.match(harness,/theme.*light/,'Harness must support light-mode visual QA.');
assert.match(responsiveHarness,/iframe/,'Responsive QA must use a real nested viewport.');
assert.match(responsiveHarness,/Math\.max\(320/,'Responsive QA must cover mobile viewport widths.');

console.log('executive-dashboard-structure: PASS');
