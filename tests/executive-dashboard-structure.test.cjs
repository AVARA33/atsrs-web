const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'js/executive-dashboard-v5854.js'),'utf8');
const css=fs.readFileSync(path.join(root,'css/executive-dashboard-v5854.css'),'utf8');
const harness=fs.readFileSync(path.join(root,'tests/fixtures/executive-dashboard-harness.html'),'utf8');
const responsiveHarness=fs.readFileSync(path.join(root,'tests/fixtures/executive-dashboard-responsive-frame.html'),'utf8');

assert.match(html,/css\/executive-dashboard-v5854\.css\?v=5855/);
assert.match(html,/js\/executive-dashboard-v5854\.js\?v=5855/);
assert.match(html,/id="dashboardPrimaryGrid"/,'Primary status and alert hierarchy must be static and semantic.');
assert.match(html,/id="dashboardOperationalGrid"/,'Operational document sections must be present.');
assert.match(html,/id="dashboardActivityGrid"/,'Existing notification and request panels need a stable activity region.');
assert.match(html,/Historical trend unavailable/,'Unavailable historical data must be disclosed instead of fabricated.');
assert.match(html,/Storage total unavailable/,'Unavailable storage totals must be disclosed instead of fabricated.');

assert.match(js,/window\.atsrsExpiryStatus/,'Personal document health must use the shared expiry contract.');
assert.match(js,/window\.atsrsCorporateReporting/,'Corporate dashboard must reuse the existing compliance source.');
assert.match(js,/atsrs:corporate-compliance/,'Corporate updates must follow the existing reporting event.');
assert.match(js,/profileCompletion/,'Personal profile completeness must derive from the existing profile record.');
assert.match(js,/Public\/shared profile state/,'Corporate visibility must be represented honestly when the service does not expose it.');
assert.match(js,/uploadedAt/,'Personal recent activity must use real upload timestamps.');
assert.match(js,/uploaded_at/,'Corporate recent activity must use real upload timestamps.');
assert.doesNotMatch(js,/Math\.random|faker|mock data|12\.4|20 GB/i,'Dashboard must not fabricate production data.');
assert.doesNotMatch(js,/fetch\(|supabaseClient|\.from\(/,'Dashboard enhancement must not add backend queries.');

assert.match(css,/#dashboardPage \.dashboard-executive-grid/,'New layout must remain scoped to Dashboard.');
assert.match(css,/@media\(max-width:560px\)/,'Mobile layout must be explicit.');
assert.match(css,/var\(--atsrs-workspace-line/,'Dashboard separators must reuse ATSRS workspace tokens.');
assert.doesNotMatch(css,/#[0-9a-f]{3,8}\b/i,'Dashboard CSS must not introduce hard-coded colors.');
assert.doesNotMatch(css,/(^|\n)\s*(button|input|select|h1|\*)\s*\{/,'No unscoped global control or typography override is allowed.');
assert.match(harness,/mode=company|params\.get\('mode'\)/,'Harness must support Corporate visual QA.');
assert.match(harness,/theme.*light/,'Harness must support light-mode visual QA.');
assert.match(responsiveHarness,/iframe/,'Responsive QA must use a real nested viewport.');
assert.match(responsiveHarness,/Math\.max\(320/,'Responsive QA must cover mobile viewport widths.');

console.log('executive-dashboard-structure: PASS');
