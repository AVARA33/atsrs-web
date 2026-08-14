const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('index.html');
const css = read('css/dashboard-capabilities-v536.css');
const runtime = read('js/dashboard-capabilities-v536.js');
const notifications = read('js/notifications.js');

test('dashboard lists real platform capabilities including email and QR', () => {
  assert.match(index, /id="dashboardCapabilities"/);
  for (const label of ['AI Document Scan','QR Phone Upload','Manual Document Upload','Document Register','Expiry Tracking','Email Expiry Alerts','ATSRS Profile CV','Controlled Profile Sharing','Download Approvals','Candidate Profile Visibility','References & Appraisals','Work Availability','Account Security & Data','Candidate Directory','Company Personnel','Projects & Assignments','Personnel Compliance','Compliance Reports']) {
    assert.match(index, new RegExp(label.replace(/[&]/g, '&amp;|&')));
  }
  assert.doesNotMatch(index, /API Access|Priority Support|Advanced Security/);
});

test('capability states use live account information where available', () => {
  assert.match(runtime, /atsrs_notification_preferences/);
  assert.match(runtime, /email_enabled/);
  assert.match(runtime, /profileVisibility/);
  assert.match(notifications, /atsrs:notification-preferences/);
});

test('capability grid keeps current dashboard cards responsive', () => {
  assert.match(css, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:560px\)[\s\S]*?grid-template-columns:1fr/);
  assert.match(css, /min-width:0/);
  assert.match(css, /background:var\(--capability-surface\)/);
});
