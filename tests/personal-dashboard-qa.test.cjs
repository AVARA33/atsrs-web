const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'personal-dashboard-qa.css'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'js', 'personal-dashboard-qa.js'), 'utf8');
const notifications = fs.readFileSync(path.join(root, 'js', 'notifications.js'), 'utf8');
const talentDirectory = fs.readFileSync(path.join(root, 'js', 'talent-directory.js'), 'utf8');
const harness = fs.readFileSync(path.join(root, 'tests', 'fixtures', 'personal-workspace-surface-harness.html'), 'utf8');

assert.match(index, /<section id="dashboardPage" class="hidden">\s*<h1 id="dashboardHeading">Dashboard<\/h1>/);
assert.match(index, /id="snapshotTitle">Managed in Account<\/h2>/);
assert.match(index, /Sharing settings are managed in Account\./);
assert.doesNotMatch(index, /Ready to share|Sharing status|id="snapShare"|id="snapShareLabel"/);
assert.doesNotMatch(index, /id="snapValid"|id="snapRisk"/);

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
assert.match(css, /dashboard-snapshot-panel\{[\s\S]*?width:min\(100%,760px\)!important/);
assert.match(css, /\.atsrs-notification-actions:not\(:has\(button:not\(:disabled\)\)\)\{\s*display:none!important/);
assert.match(css, /\.sidebar\.v76-mobile-closed \.nav/);
assert.doesNotMatch(css, /body\.company-mode/);

assert.match(runtime, /window\.innerWidth<=800&&!lastDashboardVisible/);
assert.match(runtime, /sidebar\.classList\.add\('v76-mobile-closed'\)/);
assert.match(runtime, /element\.classList\.remove\('warning','danger'\)/);
assert.match(runtime, /Number\.isFinite\(value\)&&value>0/);
assert.match(runtime, /value\.textContent='On file'/);
assert.match(runtime, /value\.textContent='Not uploaded'/);
assert.match(runtime, /child\.setAttribute\('aria-hidden','true'\)/);
assert.match(runtime, /\^\[✓✔\]\$[\s\S]*setAttribute\('aria-hidden','true'\)/);
assert.match(runtime, /email-verified download requests/);
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

for (const state of ['Loading notifications...', 'No expiry notifications yet.', 'No pending requests.', 'No messages yet.', 'Messages could not be loaded.']) {
  assert.ok(
    index.includes(state) ||
    fs.readFileSync(path.join(root, 'js', 'notifications.js'), 'utf8').includes(state) ||
    fs.readFileSync(path.join(root, 'js', 'talent-directory.js'), 'utf8').includes(state),
    `Dashboard state must remain represented: ${state}`
  );
}

assert.match(notifications, /rows\.length\?rows\.map\(notificationMarkup\)/, 'Populated notification state must retain its real renderer');
assert.match(notifications, /Notifications could not be loaded from the server\./, 'Notification error state must remain distinct from empty');
assert.match(talentDirectory, /id="refreshTalentMessages">Refresh<\/button>/, 'Messages keep their real retry action');
assert.match(talentDirectory, /Messages could not be loaded\./, 'Messages error state must remain distinct from empty');
for (const state of ['loading', 'error', 'retry', 'populated']) {
  assert.ok(harness.includes(`state === '${state}'`) || (state === 'retry' && harness.includes("state === 'error' || state === 'retry'")), `Harness must inject ${state} deterministically`);
}

assert.match(index, /css\/personal-dashboard-qa\.css\?v=436/);
assert.match(index, /js\/personal-dashboard-qa\.js\?v=434/);

console.log('Personal Dashboard QA candidate contracts passed');
