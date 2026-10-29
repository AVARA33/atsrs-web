const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const server = read("services/pasha-ecomm-connector/server.mjs");
const state = read("services/pasha-ecomm-connector/state-store.mjs");
const nginx = read("services/pasha-ecomm-connector/deploy/nginx.conf");
const checkout = read("supabase/functions/billing-checkout/index.ts");
const callback = read("supabase/functions/billing-pasha-return/index.ts");
const quote = read("supabase/functions/_shared/billing-quote.ts");

assert.match(server, /request\.pause\(\)/);
assert.match(server, /request\.destroy\(\)/);
assert.match(server, /stateStore\.consumeNonce/);
assert.match(server, /beginRegistration/);
assert.match(server, /REGISTRATION_RECONCILIATION_REQUIRED/);
assert.match(server, /PASHA_ALLOWED_MERCHANT_HANDLER_URLS/);
assert.match(server, /CONNECTOR_SHARED_SECRETS_JSON/);
assert.match(server, /x-atsrs-key-id/);
assert.match(server, /runConnectorPreflight\(\)/);
assert.match(state, /rename\(temporary, this\.path\)/);
assert.match(state, /open\(temporary, ['"]wx['"], 0o600\)/);
assert.match(nginx, /client_max_body_size 16k/);
assert.match(checkout, /verifyBillingQuote/);
assert.match(checkout, /purchase_intent_key/);
assert.match(checkout, /reconciliation_required/);
assert.match(callback, /provider_event_reference/);
assert.match(callback, /eq\("status", payment\.status\)/);
assert.match(callback, /nextPashaPaymentStatus/);
assert.match(callback, /callbackEventDecision/);
assert.match(callback, /finalStatus \? "processed" : "received"/);
assert.match(callback, /eq\("attempt_count", event\.attempt_count\)/);
assert.match(quote, /crypto\.subtle\.verify/);

console.log("PAŞA hardening contract passed.");
