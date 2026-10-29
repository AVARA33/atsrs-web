import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const fromRoot = (path) => new URL(path, root);

const connectorTests = readdirSync(fromRoot("services/pasha-ecomm-connector/test/"))
  .filter((name) => name.endsWith(".test.mjs"))
  .sort()
  .map((name) => join("services", "pasha-ecomm-connector", "test", name));

const paymentTests = [
  "tests/billing-foundation.test.cjs",
  "tests/pasha-ecomm-protocol.test.mjs",
  "tests/pasha-hardening-contract.test.cjs",
  "tests/pasha-return-state.test.mjs",
  "tests/payment-lifecycle-reconciliation.test.cjs",
  "tests/pricing-checkout.test.mjs",
  "tests/pasha-staging-bootstrap.test.cjs",
  "tests/security-advisor-payment-activation.test.cjs",
];

const edgeFunctions = [
  "supabase/functions/_shared/billing-quote.ts",
  "supabase/functions/_shared/payment-provider.ts",
  "supabase/functions/_shared/pasha-ecomm.ts",
  "supabase/functions/_shared/request-body.ts",
  "supabase/functions/billing-quote/index.ts",
  "supabase/functions/billing-checkout/index.ts",
  "supabase/functions/billing-pasha-return/index.ts",
];

for (const path of [...connectorTests, ...paymentTests, ...edgeFunctions]) {
  assert.ok(existsSync(fromRoot(path)), `Required PAŞA readiness file is missing: ${path}`);
}
assert.ok(
  existsSync(fromRoot("services/pasha-ecomm-connector/deploy/digitalocean-provisioning-checklist.md")),
  "DigitalOcean connector provisioning checklist is missing",
);

const pricing = readFileSync(fromRoot("pricing.html"), "utf8");
assert.match(pricing, /data-billing-enabled=["']false["']/, "Production billing UI must remain disabled before certification");

const migration = readFileSync(
  fromRoot("supabase/migrations/20261029230000_reconcile_hardened_payment_lifecycle.sql"),
  "utf8",
);
assert.match(migration, /purchase_intent_key/i);
assert.match(migration, /reconciliation_required/i);

const testRun = spawnSync(process.execPath, ["--test", ...connectorTests, ...paymentTests], {
  cwd: new URL(".", root),
  encoding: "utf8",
  stdio: "inherit",
});
assert.equal(testRun.status, 0, "PAŞA payment test matrix failed");

for (const path of edgeFunctions) {
  const syntax = spawnSync(process.execPath, ["--experimental-strip-types", "--check", path], {
    cwd: new URL(".", root),
    encoding: "utf8",
    stdio: "inherit",
  });
  assert.equal(syntax.status, 0, `Edge Function syntax check failed: ${path}`);
}

const localDeno = fileURLToPath(fromRoot(".codex-qa/tools/deno-v2.9.8/deno.exe"));
const denoCandidates = [process.env.DENO_BIN, existsSync(localDeno) ? localDeno : null, "deno"].filter(Boolean);
let deno = null;
for (const candidate of denoCandidates) {
  const version = spawnSync(candidate, ["--version"], { encoding: "utf8" });
  if (version.status === 0) { deno = candidate; break; }
}
if (deno) {
  const check = spawnSync(deno, ["check", "--lock=deno.lock", "--frozen-lockfile",
    "supabase/functions/billing-quote/index.ts",
    "supabase/functions/billing-checkout/index.ts",
    "supabase/functions/billing-pasha-return/index.ts"], {
    cwd: new URL(".", root), encoding: "utf8", stdio: "inherit",
  });
  assert.equal(check.status, 0, "Deno Edge Function type check failed");
} else {
  console.warn("Deno was not found; authoritative Edge Function type checking was skipped.");
}

console.log(`PAŞA local readiness gate passed: ${connectorTests.length + paymentTests.length} test files, ${edgeFunctions.length} Edge Function syntax checks, Deno type-check=${deno ? "passed" : "skipped"}, billing UI disabled.`);
