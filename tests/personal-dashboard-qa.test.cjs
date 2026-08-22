const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'personal-dashboard-qa.css'), 'utf8');
const dashboardCss = fs.readFileSync(path.join(root, 'css', 'dashboard.css'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'js', 'personal-dashboard-qa.js'), 'utf8');
const notifications = fs.readFileSync(path.join(root, 'js', 'notifications.js'), 'utf8');
const talentDirectory = fs.readFileSync(path.join(root, 'js', 'talent-directory.js'), 'utf8');
const harness = fs.readFileSync(path.join(root, 'tests', 'fixtures', 'personal-workspace-surface-harness.html'), 'utf8');

assert.match(index, /<section id="dashboardPage" class="hidden">\s*<h1 id="dashboardHeading">Dashboard<\/h1>/);
assert.doesNotMatch(index, /id="snapshotTitle"|dashboard-snapshot-panel/);
assert.doesNotMatch(index, /id="riskList"|dashboard-priority-alerts-panel/);
assert.doesNotMatch(index, /id="accessRequestsPanel"/);
assert.doesNotMatch(index, /Ready to share|Sharing status|id="snapShare"|id="snapShareLabel"/);
assert.doesNotMatch(index, /id="snapValid"|id="snapRisk"/);
assert.doesNotMatch(index, /id="cvStatusDash"|id="cvStatusDashText"|class="card cv-status-card"/);
for (const id of ['exp90', 'exp60', 'exp30', 'exp7', 'expired']) assert.match(index, new RegExp(`id="${id}"`));
for (const label of ['Expiring in 90 Days', 'Expiring in 60 Days', 'Expiring in 30 Days', 'Expiring in 1 Week']) assert.ok(index.includes(label));
for (const className of ['expiry-summary-uploaded', 'expiry-summary-90', 'expiry-summary-60', 'expiry-summary-30', 'expiry-summary-7', 'expiry-summary-expired']) assert.ok(index.includes(className));
for (const iconName of ['ph-file-text', 'ph-calendar-dots', 'ph-calendar-x', 'ph-x-circle']) assert.ok(index.includes(iconName));

assert.match(css, /body\.personal-mode\.atsrs-personal-dashboard-route[\s\S]*?> \.main::before\{[\s\S]*?display:none!important/);
assert.match(css, /body\.personal-mode\.atsrs-personal-dashboard-route[\s\S]*?> \.main > #pageTitle\{[\s\S]*?display:none!important/);
assert.match(css, /grid-template-columns:repeat\(6,minmax\(0,1fr\)\)!important/);
assert.match(css, /@media\(max-width:1100px\)[\s\S]*?repeat\(3,minmax\(0,1fr\)\)/);
assert.match(css, /@media\(max-width:560px\)[\s\S]*?repeat\(2,minmax\(0,1fr\)\)/);
assert.match(css, /--dashboard-muted:#465b70/);
assert.match(css, /--dashboard-error:#991b1b/);
const shareHelpColor = css.match(/html\[data-theme="light"\][\s\S]*?#snapShareHelp\{\s*color:(#[0-9a-f]{6})!important/i)?.[1];
assert.ok(shareHelpColor, 'Light sharing help must have an explicit contrast-safe colour');
const channel = value => { const linear=value/255; return linear<=0.04045?linear/12.92:((linear+0.055)/1.055)**2.4; };
const luminance = hex => { const rgb=[1,3,5].map(index=>parseInt(hex.slice(index,index+2),16)); return 0.2126*channel(rgb[0])+0.7152*channel(rgb[1])+0.0722*channel(rgb[2]); };
const shareContrast = (1.05)/(luminance(shareHelpColor)+0.05);
assert.ok(shareContrast>=4.5, `Light sharing help contrast must be >=4.5:1, got ${shareContrast.toFixed(2)}:1`);
assert.match(css, /min-width:44px!important;\s*min-height:44px!important/);
assert.match(css, /atsrs-personal-dashboard-route \.sidebar \.nav button/);
assert.match(css, /:focus-visible\{[\s\S]*?outline:3px solid/);
assert.match(css, /\.atsrs-notification-actions:not\(:has\(button:not\(:disabled\)\)\)\{\s*display:none!important/);
assert.match(css, /\.sidebar\.v76-mobile-closed \.nav/);
assert.match(css, /body\.company-mode[\s\S]*?#dashboardPage > \.panel[\s\S]*?padding:18px!important/);
assert.match(css, /option 3[\s\S]*?body:where\(\.personal-mode,\.company-mode\) #dashboardPage \.stats-grid/);
assert.match(css, /expiry-summary-icon[\s\S]*?border-radius:50%/);
assert.match(css, /expiry-summary-90\{--expiry-signal:#2563eb/);
assert.match(css, /expiry-summary-60\{--expiry-signal:#b7791f/);
assert.match(css, /expiry-summary-30\{--expiry-signal:#c56a00/);
assert.match(css, /expiry-summary-7\{--expiry-signal:#dc5a11/);
assert.match(css, /expiry-summary-expired\{--expiry-signal:#c62828/);
assert.match(css, /html\[data-theme="dark"\][\s\S]*?expiry-summary-90\{--expiry-signal:#73a7ff/);
assert.match(css, /html\[data-theme="dark"\] body\.company-mode #dashboardPage \.corporate-personnel-summary-card\{--expiry-signal:var\(--atsrs-brand-green,#22c55e\)/);
assert.match(css, /expiry-summary-card > \.stat\.is-zero-risk\{[\s\S]*?color:var\(--expiry-signal\)!important/);
assert.match(dashboardCss, /#dashboardPage > \.panel:not\(\.solo-hero\):not\(\.dashboard-snapshot-panel\):not\(#shareProfilePanel\):not\(#personalDashboardPanel\)\{\s*padding:18px!important/);

assert.match(runtime, /compactSidebarViewport\(\)&&!lastDashboardVisible/);
assert.match(runtime, /window\.innerWidth<=960&&window\.innerHeight<=560/);
assert.match(runtime, /sidebar\.classList\.add\('v76-mobile-closed'\)/);
assert.match(runtime, /element\.classList\.remove\('warning','danger'\)/);
assert.match(runtime, /Number\.isFinite\(value\)&&value>0/);
assert.doesNotMatch(runtime, /syncCvStatus|On file|Not uploaded|cvStatusDash/);
assert.match(runtime, /days<=7[\s\S]*?counts\.exp7/);
assert.match(runtime, /days<=30[\s\S]*?counts\.exp30/);
assert.match(runtime, /days<=60[\s\S]*?counts\.exp60/);
assert.match(runtime, /days<=90[\s\S]*?counts\.exp90/);
assert.match(runtime, /child\.setAttribute\('aria-hidden','true'\)/);
assert.match(runtime, /\^\[✓✔\]\$[\s\S]*setAttribute\('aria-hidden','true'\)/);
assert.match(runtime, /syncShareCapability/);
assert.doesNotMatch(runtime, /Ready to share|syncShareReadiness|snapShare['"]?\)|snapShare\.textContent/);
assert.match(runtime, /wrapAndSync\('showPage'\)/);
assert.match(runtime, /wrapAndSync\('renderAll'\)/);
assert.match(runtime, /window\.addEventListener\('atsrs:data-hydrated',syncDashboard\)/);
assert.doesNotMatch(runtime, /fetch\(|supabase|insert\(|update\(|delete\(/i);
assert.match(runtime, /aria-controls/);
assert.match(runtime, /aria-expanded/);
assert.match(runtime, /event\.key==='Escape'/);
assert.match(runtime, /event\.key!=='Tab'/);
assert.match(runtime, /window\.atsrsRefreshNotifications\(\)/);
assert.match(runtime, /role',error\?'alert':'status'/);
assert.match(runtime, /aria-live',error\?'assertive':'polite'/);
assert.match(runtime, /aria-busy',loading\?'true':'false'/);

for (const state of ['Loading notifications...', 'No expiry notifications yet.', 'No company messages to your Candidate profile yet.', 'Messages could not be loaded.']) {
  assert.ok(
    index.includes(state) ||
    fs.readFileSync(path.join(root, 'js', 'notifications.js'), 'utf8').includes(state) ||
    fs.readFileSync(path.join(root, 'js', 'talent-directory.js'), 'utf8').includes(state),
    `Dashboard state must remain represented: ${state}`
  );
}

assert.match(notifications, /rows\.length\?rows\.map\(notificationMarkup\)/, 'Populated notification state must retain its real renderer');
assert.match(notifications, /if\(mode\(\)!=='company'\)[\s\S]*?personalPanel\.remove\(\)/, 'Personal Dashboard must not mount expiry notifications.');
assert.match(notifications, /Notifications could not be loaded from the server\./, 'Notification error state must remain distinct from empty');
assert.match(talentDirectory, /id="refreshTalentMessages">Refresh<\/button>/, 'Messages keep their real retry action');
assert.match(talentDirectory, /Messages could not be loaded\./, 'Messages error state must remain distinct from empty');
assert.match(talentDirectory, /Only messages sent to your ATSRS Candidate profile by signed-in Corporate accounts appear here\./);
assert.match(talentDirectory, /Active messages remain here until you archive them\./);
assert.match(talentDirectory, /The Archive keeps messages in ATSRS so you can restore or permanently delete them later\./);
assert.match(talentDirectory, /if\(mode\(\)==='personal'\)[\s\S]*?existing\.remove\(\)[\s\S]*?return null/, 'Personal Dashboard must not mount the company-message inbox.');
assert.match(talentDirectory, /aria-pressed/);
for (const state of ['loading', 'error', 'retry', 'populated']) {
  assert.ok(harness.includes(`state === '${state}'`) || (state === 'retry' && harness.includes("state === 'error' || state === 'retry'")), `Harness must inject ${state} deterministically`);
}

assert.match(index, /css\/personal-dashboard-qa\.css\?v=58156/);
assert.match(index, /js\/personal-dashboard-qa\.js\?v=550/);

console.log('Personal Dashboard QA candidate contracts passed');
