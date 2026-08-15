const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const migration = read('supabase/migrations/20260815130745_atsrs_billing_foundation.sql');
const checkout = read('supabase/functions/billing-checkout/index.ts');
const webhook = read('supabase/functions/billing-webhook/index.ts');
const provider = read('supabase/functions/_shared/payment-provider.ts');
const config = read('supabase/config.toml');
const pricing = read('pricing.html');
const terms = read('billing-terms.html');
const refunds = read('refund-policy.html');

for (const table of [
  'atsrs_billing_plans',
  'atsrs_billing_customers',
  'atsrs_billing_subscriptions',
  'atsrs_payment_transactions',
  'atsrs_payment_webhook_events',
  'atsrs_billing_audit_log',
]) {
  assert.match(migration, new RegExp(`create table if not exists atsrs_private\\.${table}`));
  assert.match(migration, new RegExp(`alter table atsrs_private\\.${table} enable row level security`));
  assert.match(migration, new RegExp(`revoke all on table atsrs_private\\.${table} from public, anon, authenticated`));
}

for (const plan of ['free', 'bronze', 'silver', 'gold']) {
  assert.match(migration, new RegExp(`'${plan}'`));
}
assert.doesNotMatch(migration, /plan_key in \([^)]*'pro'/);
assert.doesNotMatch(migration, /plan_key in \([^)]*'business'/);
assert.doesNotMatch(migration, /plan_key in \([^)]*'titan'/);
assert.doesNotMatch(migration, /alter table public\.atsrs_subscriptions/i);
assert.doesNotMatch(migration, /update public\.atsrs_subscriptions/i);
assert.match(migration, /checkout_enabled = false/);
assert.match(migration, /idempotency_key uuid not null/);
assert.match(migration, /payload_sha256 text not null/);
assert.doesNotMatch(migration, /\b(card_number|card_expiry|cvv|pan)\s+(text|varchar|integer|bigint)/i);

assert.match(checkout, /ATSRS_BILLING_ENABLED/);
assert.match(checkout, /auth\.getUser\(\)/);
assert.match(checkout, /PLAN_CHECKOUT_DISABLED/);
assert.match(checkout, /idempotencyKey/);
assert.match(webhook, /verifyWebhook\(rawBody, request\.headers\)/);
assert.match(webhook, /payload_sha256: payloadHash/);
assert.doesNotMatch(webhook, /payload:\s*(event|rawBody)/);
assert.match(provider, /return null;/);
assert.match(config, /\[functions\.billing-checkout\][\s\S]*verify_jwt = true/);
assert.match(config, /\[functions\.billing-webhook\][\s\S]*verify_jwt = false/);

assert.match(pricing, /ATSRS will not store card numbers or CVV values/);
for (const page of ['billing-terms.html', 'refund-policy.html']) {
  assert.match(pricing, new RegExp(page.replace('.', '\\.')));
}
assert.match(terms, /Billing is currently not active/);
assert.match(refunds, /No paid checkout is currently active/);

console.log('ATSRS bank-agnostic billing foundation contract passed.');
