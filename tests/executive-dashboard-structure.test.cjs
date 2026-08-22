const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'js/executive-dashboard-v5854.js'),'utf8');
const css=fs.readFileSync(path.join(root,'css/executive-dashboard-v5854.css'),'utf8');
const harness=fs.readFileSync(path.join(root,'tests/fixtures/executive-dashboard-harness.html'),'utf8');
const responsiveHarness=fs.readFileSync(path.join(root,'tests/fixtures/executive-dashboard-responsive-frame.html'),'utf8');

assert.match(html,/css\/executive-dashboard-v5854\.css\?v=5858/);
assert.match(html,/js\/executive-dashboard-v5854\.js\?v=5858/);
assert.match(html,/id="personalReadinessCommand"/,'Selected Readiness Command Center must lead the Personal Dashboard.');
assert.match(html,/id="dashboardAttentionSummary"/,'The real attention summary must share the operational region with recent activity.');
assert.match(html,/id="dashboardTypesViewAll"/,'Document Types must retain a direct route to the real document register.');
assert.match(html,/class="dashboard-types-columns personal-only"[^>]*><span>Document Type<\/span><span>Count<\/span><span>% of Total<\/span>/,'Personal Document Types must expose the selected three-column command-center heading.');
assert.match(html,/id="dashboardPrimaryGrid" class="[^"]*company-only/,'Legacy status and alert hierarchy must be excluded from Personal Dashboard.');
assert.match(html,/id="dashboardOperationalGrid"/,'Operational document sections must be present.');
assert.match(html,/id="dashboardDocumentTypesTitle">Document Types/,'Document Types must be the first Personal operational section.');
assert.doesNotMatch(html,/id="snapshotTitle"|id="snapValid"|id="snapRisk"/,'Removed Personal snapshot content must not remain in the document.');
assert.match(html,/id="dashboardActivityGrid"/,'Existing notification and request panels need a stable activity region.');
assert.match(html,/Historical trend unavailable/,'Unavailable historical data must be disclosed instead of fabricated.');
assert.match(html,/Storage total unavailable/,'Unavailable storage totals must be disclosed instead of fabricated.');

assert.match(js,/window\.atsrsExpiryStatus/,'Personal document health must use the shared expiry contract.');
assert.match(js,/window\.atsrsCorporateReporting/,'Corporate dashboard must reuse the existing compliance source.');
assert.match(js,/atsrs:corporate-compliance/,'Corporate updates must follow the existing reporting event.');
assert.match(js,/profileCompletion/,'Personal profile completeness must derive from the existing profile record.');
assert.match(js,/Good morning/,'Dashboard heading must use the real profile greeting instead of the generic page title.');
assert.match(js,/Public\/shared profile state/,'Corporate visibility must be represented honestly when the service does not expose it.');
assert.match(js,/uploadedAt/,'Personal recent activity must use real upload timestamps.');
assert.match(js,/uploaded_at/,'Corporate recent activity must use real upload timestamps.');
assert.match(js,/dashboard-type-share/,'Document Types must render real percentage bars from the existing document register.');
assert.match(js,/renderCommandCenter/,'Personal readiness hierarchy must derive from the existing document register.');
assert.match(js,/personalWindows/,'Expiry-window metrics must be derived deterministically from the shared expiry contract.');
assert.doesNotMatch(js,/Math\.random|faker|mock data|12\.4|20 GB/i,'Dashboard must not fabricate production data.');
assert.doesNotMatch(js,/fetch\(|supabaseClient|\.from\(/,'Dashboard enhancement must not add backend queries.');

assert.match(css,/#dashboardPage \.dashboard-executive-grid/,'New layout must remain scoped to Dashboard.');
assert.match(css,/:has\(> #dashboardPage:not\(\.hidden\)\)/,'Dashboard route must use the available workspace width without changing unrelated pages.');
assert.match(css,/@media\(max-width:560px\)/,'Mobile layout must be explicit.');
assert.match(css,/Readiness Command Center/,'The selected visual direction must remain explicit and scoped.');
assert.match(css,/grid-template-columns:repeat\(8,minmax\(0,1fr\)\)!important/,'Desktop Personal metrics must remain a compact single strip.');
assert.doesNotMatch(css,/conic-gradient|radial-gradient|dashboard-donut|dashboard-pie/i,'The selected direction must not introduce a circular chart.');
assert.match(css,/var\(--atsrs-workspace-line/,'Dashboard separators must reuse ATSRS workspace tokens.');
assert.doesNotMatch(css,/#[0-9a-f]{3,8}\b/i,'Dashboard CSS must not introduce hard-coded colors.');
assert.doesNotMatch(css,/(^|\n)\s*(button|input|select|h1|\*)\s*\{/,'No unscoped global control or typography override is allowed.');
assert.match(harness,/mode=company|params\.get\('mode'\)/,'Harness must support Corporate visual QA.');
assert.match(harness,/theme.*light/,'Harness must support light-mode visual QA.');
assert.match(responsiveHarness,/iframe/,'Responsive QA must use a real nested viewport.');
assert.match(responsiveHarness,/Math\.max\(320/,'Responsive QA must cover mobile viewport widths.');

console.log('executive-dashboard-structure: PASS');
