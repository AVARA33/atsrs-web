import assert from "node:assert/strict";
import test from "node:test";
import { validateConnectorEnvironment } from "../preflight.mjs";

const valid = () => ({
  BIND_HOST: "127.0.0.1",
  PORT: "8080",
  CONNECTOR_SHARED_SECRETS_JSON: JSON.stringify({ "2026-q4-primary": "0123456789abcdef0123456789abcdef" }),
  PASHA_MERCHANT_ID: "6000270",
  PASHA_TERMINAL_ID: "staging-terminal",
  PASHA_AMOUNT_FORMAT: "minor-units-confirmed",
  PASHA_MERCHANT_HANDLER_URL: "https://ecomm.pashabank.az:18443/ecomm2/MerchantHandler",
  PASHA_ALLOWED_MERCHANT_HANDLER_URLS: "https://ecomm.pashabank.az:18443/ecomm2/MerchantHandler",
  CONNECTOR_STATE_PATH: "/var/lib/atsrs-pasha/state.json",
  PASHA_CLIENT_CERT_PATH: "/etc/atsrs-pasha/client-cert.pem",
  PASHA_CLIENT_KEY_PATH: "/etc/atsrs-pasha/private-key.pem",
  PASHA_CA_CERT_PATH: "/etc/atsrs-pasha/ca-chain.pem",
});

test("production connector environment passes fail-closed preflight", () => {
  const result = validateConnectorEnvironment(valid());
  assert.equal(result.port, 8080);
  assert.deepEqual(result.keyIds, ["2026-q4-primary"]);
});

for (const [name, value, code] of [
  ["BIND_HOST", "0.0.0.0", "BIND_HOST_NOT_LOOPBACK"],
  ["PASHA_AMOUNT_FORMAT", "unconfirmed", "PASHA_AMOUNT_FORMAT_NOT_CONFIRMED"],
  ["CONNECTOR_SHARED_SECRETS_JSON", JSON.stringify({ primary: "short" }), "CONNECTOR_SHARED_SECRET_WEAK"],
  ["PASHA_MERCHANT_HANDLER_URL", "https://evil.example/MerchantHandler", "MERCHANT_HANDLER_NOT_ALLOWED"],
  ["PASHA_ALLOWED_MERCHANT_HANDLER_URLS", "https://evil.example/MerchantHandler", "MERCHANT_HANDLER_NOT_ALLOWED"],
]) {
  test(`preflight rejects unsafe ${name}`, () => {
    const env = valid();
    env[name] = value;
    assert.throws(() => validateConnectorEnvironment(env), new RegExp(code));
  });
}

test("preflight rejects a mutually configured but unapproved bank endpoint", () => {
  const env = valid();
  env.PASHA_MERCHANT_HANDLER_URL = "https://evil.example/MerchantHandler";
  env.PASHA_ALLOWED_MERCHANT_HANDLER_URLS = env.PASHA_MERCHANT_HANDLER_URL;
  assert.throws(() => validateConnectorEnvironment(env), /MERCHANT_HANDLER_ALLOWLIST_UNAPPROVED/);
});
