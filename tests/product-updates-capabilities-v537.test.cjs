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
    'AI Document Scan',
    'QR Phone Upload',
    'Manual Document Upload',
    'Document Register',
    'Expiry Tracking',
    'Email Expiry Alerts',
    'ATSRS Profile CV',
    'CV, References &amp; Appraisals',
    'Controlled Profile Sharing',
    'Download Approvals',
    'Candidate Profile Visibility',
    'Work Availability',
    'Account Security &amp; Data',
    'Candidate Directory',
    'Company Personnel',
    'Projects &amp; Assignments',
    'Personnel Compliance',
    'Compliance Reports'
  ];

  for (const label of available) {
    assert.match(updates, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(updates, /WhatsApp Expiry Alerts[\s\S]*?In development|In development[\s\S]*?WhatsApp Expiry Alerts/i);
  assert.match(updates, /Automated Scheduled Reports[\s\S]*?Planned|Planned[\s\S]*?Automated Scheduled Reports/i);
  assert.match(updates, /Jobs[\s\S]*?In development|In development[\s\S]*?Jobs/i);
  assert.doesNotMatch(updates, /API Access|Priority Support|Advanced Security/);
});

test('QR and email capability cards expose visible status labels', () => {
  assert.match(updates, /status-available">Available now<\/span>[\s\S]*?QR Phone Upload/);
  assert.match(updates, /status-available">Available now<\/span>[\s\S]*?Email Expiry Alerts/);
});

test('Dashboard is restored without the capability inventory', () => {
  assert.doesNotMatch(dashboard, /dashboardCapabilities|PLATFORM CAPABILITIES|Your ATSRS tools/);
  assert.match(dashboard, /class="grid stats-grid"/);
  assert.match(dashboard, /class="panel dashboard-snapshot-panel"/);
});

test('Product Updates keeps the established roadmap card design', () => {
  assert.match(updates, /class="roadmap-grid"/);
  assert.equal((updates.match(/class="roadmap-card/g) || []).length, 21);
  assert.equal((updates.match(/roadmap-status/g) || []).length, 21);
});

test('Roadmap groups Premium, Planned, In Development, then Available work', () => {
  const premium = updates.indexOf('ATSRS Profile CV');
  const planned = updates.indexOf('Automated Scheduled Reports');
  const development = updates.indexOf('Jobs');
  const available = updates.indexOf('Manual Document Upload');
  assert.ok(premium >= 0 && premium < planned);
  assert.ok(planned < development);
  assert.ok(development < available);
});

test('Premium capabilities are grouped before standard capabilities', () => {
  const premiumLabels = [
    'WhatsApp Expiry Alerts',
    'AI Document Scan',
    'QR Phone Upload',
    'ATSRS Profile CV'
  ];
  const firstStandard = updates.indexOf('Manual Document Upload');

  assert.ok(firstStandard >= 0);
  for (const label of premiumLabels) {
    const position = updates.indexOf(label);
    assert.ok(position >= 0 && position < firstStandard, `${label} must precede standard capabilities`);
  }
});
