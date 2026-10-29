const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const migration = fs.readFileSync(path.join(root,
  "supabase/migrations/20261029230000_reconcile_hardened_payment_lifecycle.sql"), "utf8");
const pricing = fs.readFileSync(path.join(root, "pricing.html"), "utf8");

for (const column of ["catalog_version", "purchase_intent_key", "quote_version",
  "provider_event_at", "provider_event_reference", "settled_amount_minor",
  "settled_currency", "reconciliation_required", "payment_transaction_id"]) {
  assert.match(migration, new RegExp(`\\b${column}\\b`));
}
for (const index of ["atsrs_payment_user_purchase_intent_idx", "atsrs_payment_reconciliation_idx",
  "atsrs_payment_webhook_transaction_idx"]) assert.match(migration, new RegExp(index));
assert.match(migration, /add column if not exists/i);
assert.match(migration, /create unique index if not exists atsrs_payment_user_purchase_intent_idx/i);
assert.match(migration, /\('bronze',\s*'Bronze',\s*'USD',\s*1999,\s*19200,\s*false,\s*20,\s*3\)/i);
assert.doesNotMatch(migration, /checkout_enabled\s*=\s*true/i);
assert.match(pricing, /data-billing-enabled="false"/);
assert.match(pricing, /data-monthly="\$19\.99"[^>]*data-yearly="\$16"[^>]*\$192 billed annually/i);
assert.match(pricing, /data-pricing-checkout="bronze"[^>]*disabled/);
assert.match(pricing, /pricing-checkout\.js/);

console.log("Payment lifecycle reconciliation contract passed.");
