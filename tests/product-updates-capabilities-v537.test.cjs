const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const updates = index.match(/<section id="introPage"[\s\S]*?<\/section>/)?.[0] || '';
const dashboard = index.match(/<section id="dashboardPage"[\s\S]*?<section id="refsPage"/)?.[0] || '';

test('Product Updates contains the complete honest capability inventory', () => {
  const available = [
    'International JobSearch',
    'Recruiter Directory',
    'Company Directory',
    'In-account Plans, FAQ &amp; Contact',
    'AI Document Scan',
    'QR Phone Upload',
    'Manual Document Upload',
    'Certificate Register',
    'Expiry Tracking',
    'Email Expiry Alerts',
    'ATSRS Profile CV',
    'CV, References &amp; Appraisals',
    'Controlled Profile Sharing',
    'Download Approvals',
    'Profile Visibility &amp; Work Availability',
    'Candidate Directory &amp; Company Personnel',
    'Projects &amp; Assignments',
    'Personnel Compliance &amp; Reports'
  ];

  for (const label of available) {
    assert.match(updates, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(updates, /WhatsApp Expiry Alerts[\s\S]*?In development|In development[\s\S]*?WhatsApp Expiry Alerts/i);
  assert.match(updates, /Automated Scheduled Reports[\s\S]*?Planned|Planned[\s\S]*?Automated Scheduled Reports/i);
  assert.match(updates, /status-available">Available now<\/span>[\s\S]*?International JobSearch/);
  assert.match(updates, /ATSRS Android App[\s\S]*?Planned|Planned[\s\S]*?ATSRS Android App/i);
  assert.doesNotMatch(updates, /API Access|Priority Support|Advanced Security/);
});

test('QR and email capability cards expose visible status labels', () => {
  assert.match(updates, /status-available">Available now<\/span>[\s\S]*?QR Phone Upload/);
  assert.match(updates, /status-available">Available now<\/span>[\s\S]*?Email Expiry Alerts/);
});

test('Dashboard is restored without the capability inventory', () => {
  assert.doesNotMatch(dashboard, /dashboardCapabilities|PLATFORM CAPABILITIES|Your ATSRS tools/);
  assert.match(dashboard, /class="grid stats-grid"/);
  assert.doesNotMatch(dashboard, /dashboard-snapshot-panel|dashboard-priority-alerts-panel|accessRequestsPanel/);
});

test('Product Updates keeps the established roadmap card design', () => {
  assert.match(updates, /class="roadmap-grid"/);
  assert.equal((updates.match(/class="roadmap-card/g) || []).length, 21);
  assert.equal((updates.match(/roadmap-status/g) || []).length, 21);
});

test('Roadmap leads with newly released capabilities and closes with upcoming work', () => {
  const latest = updates.indexOf('International JobSearch');
  const available = updates.indexOf('Manual Document Upload');
  const development = updates.indexOf('WhatsApp Expiry Alerts');
  const planned = updates.indexOf('Automated Scheduled Reports');
  assert.ok(latest >= 0 && latest < available);
  assert.ok(available < development);
  assert.ok(development < planned);
});

test('Premium capabilities are grouped before standard capabilities', () => {
  const premiumLabels = [
    'WhatsApp Expiry Alerts',
    'AI Document Scan',
    'QR Phone Upload',
    'ATSRS Profile CV'
  ];
  const whatsapp = updates.indexOf('WhatsApp Expiry Alerts');
  for (const label of premiumLabels) {
    const position = updates.indexOf(label);
    assert.ok(position >= 0, `${label} must be present`);
  }
  assert.ok(whatsapp > updates.indexOf('Manual Document Upload'));
});
