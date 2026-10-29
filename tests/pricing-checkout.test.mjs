import test from "node:test";
import assert from "node:assert/strict";
import { allowedPashaRedirect, createPurchaseIntentStore, startPricingCheckout } from "../js/pricing-checkout-core.mjs";

const validRedirect = "https://ecomm.pashabank.az:8463/ecomm2/ClientHandler?trans_id=ABCDEFGH12345678";
const UUID_ONE = "11111111-1111-4111-8111-111111111111";
const UUID_TWO = "22222222-2222-4222-8222-222222222222";
function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}
function clientWith(responses, calls = []) {
  return {
    auth: { getSession: async () => ({ data: { session: { access_token: "test-token" } } }) },
    functions: { invoke: async (name, options) => { calls.push({ name, options }); return responses.shift(); } },
  };
}

test("expired quote is rejected before checkout", async () => {
  const calls = [];
  const client = clientWith([{ data: { quote_token: "signed", expires_at: new Date(1000).toISOString() } }], calls);
  await assert.rejects(startPricingCheckout({ client, plan: "bronze", cycle: "monthly", accepted: true,
    intentStore: createPurchaseIntentStore(memoryStorage(), () => UUID_ONE), now: () => 1000 }), /BILLING_QUOTE_INVALID_OR_EXPIRED/);
  assert.deepEqual(calls.map((call) => call.name), ["billing-quote"]);
});

test("quote mismatch/provider failure does not redirect and retry reuses purchase intent", async () => {
  const calls = [];
  const mismatch = new Error("BILLING_QUOTE_STALE");
  const future = new Date(Date.now() + 60_000).toISOString();
  const client = clientWith([
    { data: { quote_token: "signed-one", expires_at: future } }, { error: mismatch },
    { data: { quote_token: "signed-two", expires_at: future } }, { data: { redirect_url: validRedirect, transaction_id: "tx" } },
  ], calls);
  const intents = createPurchaseIntentStore(memoryStorage(), () => UUID_ONE);
  let navigated = "";
  const options = { client, plan: "bronze", cycle: "monthly", accepted: true, intentStore: intents, navigate: (url) => { navigated = url; } };
  await assert.rejects(startPricingCheckout(options), /BILLING_QUOTE_STALE/);
  assert.equal(navigated, "");
  const result = await startPricingCheckout(options);
  const checkoutCalls = calls.filter((call) => call.name === "billing-checkout");
  assert.equal(checkoutCalls[0].options.headers["Idempotency-Key"], checkoutCalls[1].options.headers["Idempotency-Key"]);
  assert.equal(result.idempotencyKey, UUID_ONE);
  assert.equal(navigated, validRedirect);
});

test("new intent creates a new UUID", () => {
  const source = [UUID_ONE, UUID_TWO];
  const store = createPurchaseIntentStore(memoryStorage(), () => source.shift());
  const first = store.get("bronze", "monthly");
  const second = store.renew("bronze", "monthly");
  assert.notEqual(first, second);
});

test("redirect must be exact PAŞA allowlisted URL", () => {
  assert.equal(allowedPashaRedirect(validRedirect), true);
  assert.equal(allowedPashaRedirect("https://evil.example/ecomm2/ClientHandler?trans_id=ABCDEFGH12345678"), false);
  assert.equal(allowedPashaRedirect(`${validRedirect}&next=https://evil.example`), false);
  assert.equal(allowedPashaRedirect(`${validRedirect}&trans_id=SECONDVALUE`), false);
});
