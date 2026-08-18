const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migration = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '20260818105255_add_seven_day_expiry_reminder.sql'),
  'utf8'
);
const notifications = fs.readFileSync(path.join(root, 'js', 'notifications.js'), 'utf8');
const emailWorker = fs.readFileSync(
  path.join(root, 'supabase', 'functions', 'process-email-outbox', 'index.ts'),
  'utf8'
);

assert.match(migration, /array\[90, 60, 30, 7, 0\]/, 'Database constraint must match all dashboard reminder stages');
assert.match(migration, /when d\.expiry_date - p_as_of <= 7 then 7/, 'Documents entering the final week must use threshold 7');
assert.match(migration, /when d\.expiry_date - p_as_of <= 60 then 60/, 'The 60-day dashboard stage must also send email');
assert.match(migration, /case due\.threshold_days when 90 then 'notice' when 60 then 'notice' when 30 then 'warning' when 7 then 'urgent'/);
assert.match(migration, /n\.threshold_days in \(90, 60, 30, 7, 0\)/, 'Email outbox must match every dashboard stage');
assert.match(
  migration,
  /on conflict \(user_id, account_type, document_fingerprint, expiry_date, threshold_days\) do nothing/,
  'One notification per document, expiry date and reminder stage must be enforced'
);
assert.match(
  migration,
  /on conflict \(notification_id, channel\) do nothing/,
  'A notification must be queued only once per delivery channel'
);
assert.match(notifications, /90 days, 60 days, 30 days, 7 days and expiry day\. Each reminder stage is sent once\./);
assert.match(migration, /has reached its expiry date today/);
assert.match(emailWorker, /timing: "Expiry date reached today"/);

console.log('Seven-day expiry reminder contract tests passed');
