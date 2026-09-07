const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const migration = read('supabase/migrations/20260815130745_atsrs_billing_foundation.sql');
const checkout = read('supabase/functions/billing-checkout/index.ts');
const webhook = read('supabase/functions/billing-webhook/index.ts');
const provider = read('supabase/functions/_shared/payment-provider.ts');
const quote = read('supabase/functions/billing-quote/index.ts');
const quoteSecurity = read('supabase/functions/_shared/billing-quote.ts');
const billingAccount = read('supabase/functions/billing-account/index.ts');
const refundRequest = read('supabase/functions/billing-refund-request/index.ts');
const config = read('supabase/config.toml');
const pricing = read('pricing.html');
const terms = read('billing-terms.html');
const refunds = read('refund-policy.html');
const hardening = read('supabase/migrations/20260907191000_harden_payment_lifecycle.sql');

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
assert.match(hardening, /plan_key in \('free', 'bronze', 'silver', 'gold', 'titan'\)/);
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
assert.match(provider, /getPayment\(providerOrderReference: string\)/);
assert.match(provider, /createRefund\(request: RefundRequest\)/);
assert.match(config, /\[functions\.billing-checkout\][\s\S]*verify_jwt = true/);
assert.match(config, /\[functions\.billing-quote\][\s\S]*verify_jwt = true/);
assert.match(config, /\[functions\.billing-account\][\s\S]*verify_jwt = true/);
assert.match(config, /\[functions\.billing-refund-request\][\s\S]*verify_jwt = true/);
assert.match(config, /\[functions\.billing-webhook\][\s\S]*verify_jwt = false/);

assert.match(terms, /ATSRS will not request or store a full card number, CVV or card expiry date/);
for (const page of ['billing-terms.html', 'refund-policy.html']) {
  assert.match(pricing, new RegExp(page.replace('.', '\\.')));
}
assert.match(terms, /Billing is currently not active/);
assert.match(terms, /id="candidate-fees"/);
assert.match(terms, /ATSRS does not charge candidates any commission or placement fee/);
assert.match(terms, /Optional subscriptions, plan upgrades, add-on storage, AI credits and other paid platform features are separate service charges/);
assert.match(terms, /This statement applies only to charges made by ATSRS/);
assert.match(refunds, /No paid checkout is currently active/);

assert.match(checkout, /purchase_intent_key/);
assert.match(checkout, /verifyBillingQuote/);
assert.match(checkout, /BILLING_QUOTE_INVALID/);
assert.match(quote, /expiresAt: issuedAt \+ 10 \* 60 \* 1000/);
assert.match(quoteSecurity, /constantTimeEqual/);
assert.match(checkout, /PURCHASE_INTENT_REQUIRED/);
assert.match(checkout, /PURCHASE_INTENT_REUSED/);
assert.match(checkout, /CHECKOUT_RECONCILIATION_REQUIRED/);
assert.match(checkout, /\.eq\("status", "initiated"\)\.select\("id"\)\.maybeSingle\(\)/);
assert.match(webhook, /atsrs_apply_verified_payment_event/);
assert.doesNotMatch(webhook, /\.update\(update\).*provider_order_reference/s);
assert.match(hardening, /create unique index if not exists atsrs_payment_user_purchase_intent_idx/);
assert.match(hardening, /create table if not exists atsrs_private\.atsrs_payment_refunds/);
assert.match(hardening, /create table if not exists atsrs_private\.atsrs_payment_reconciliation_cases/);
assert.match(hardening, /create or replace function atsrs_private\.atsrs_apply_verified_payment_event/);
assert.match(hardening, /STALE_OR_INVALID_TRANSITION/);
assert.match(hardening, /SETTLEMENT_MISMATCH/);
assert.match(hardening, /PAYMENT_NOT_FOUND/);
assert.match(hardening, /'bronze', 'Bronze', 'USD', 2000, 19200/);
assert.match(hardening, /'titan', 'Titan', 'USD', 12000, 115200/);
assert.match(refundRequest, /PAYMENT_NOT_REFUNDABLE/);
assert.match(refundRequest, /request_intent_key/);
assert.match(refundRequest, /safe_reason_code/);
assert.doesNotMatch(refundRequest, /card_number|\bcvv\b|card_expiry/i);
assert.match(billingAccount, /\.eq\("user_id", user\.id\)/);
assert.doesNotMatch(billingAccount, /provider_payment_reference/);

console.log('ATSRS bank-agnostic billing foundation contract passed.');
