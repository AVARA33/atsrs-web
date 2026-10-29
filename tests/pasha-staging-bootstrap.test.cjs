const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'audit',
  'pasha-payment-staging-bootstrap.sql'), 'utf8');

assert.match(sql, /revoke all on schema atsrs_private from public, anon, authenticated/i);
assert.match(sql, /checkout_enabled boolean not null default false/i);
assert.match(sql, /enable row level security/ig);
assert.match(sql, /Synthetic non-production record/);
assert.doesNotMatch(sql, /cron\.schedule|net\.http|https:\/\/hwtjuqyxzivymofamwxl/i);
assert.doesNotMatch(sql, /service_role_key|private[_ -]?key|begin rsa private key/i);

console.log('PAŞA staging bootstrap safety contract passed.');
