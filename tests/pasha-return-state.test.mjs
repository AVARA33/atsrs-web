import assert from "node:assert/strict";
import { callbackEventDecision, callbackRedirectState, nextPashaPaymentStatus } from "../supabase/functions/_shared/pasha-return-state.mjs";

assert.equal(nextPashaPaymentStatus("pending", "paid"), "paid");
assert.equal(nextPashaPaymentStatus("failed", "paid"), "paid");
assert.equal(nextPashaPaymentStatus("paid", "failed"), "paid");
assert.equal(nextPashaPaymentStatus("refunded", "paid"), "refunded");
assert.equal(nextPashaPaymentStatus("authorized", "pending"), "authorized");
assert.equal(nextPashaPaymentStatus("pending", "failed"), "failed");
assert.equal(callbackRedirectState("paid"), "success");
assert.equal(callbackRedirectState("initiated"), "verification-pending");
const now = Date.parse("2026-10-29T12:02:00Z");
assert.equal(callbackEventDecision({ eventStatus: "received", lastErrorCode: "PASHA_RESULT_PENDING",
  receivedAt: "2026-10-29T12:00:00Z", processedAt: "2026-10-29T12:01:30Z", paymentStatus: "pending", now }), "wait");
assert.equal(callbackEventDecision({ eventStatus: "received", lastErrorCode: "PASHA_RESULT_PENDING",
  receivedAt: "2026-10-29T12:00:00Z", processedAt: "2026-10-29T12:00:30Z", paymentStatus: "pending", now }), "reclaim");
assert.equal(callbackEventDecision({ eventStatus: "processed", receivedAt: "2026-10-29T12:00:00Z",
  processedAt: "2026-10-29T12:00:30Z", paymentStatus: "pending", now }), "reclaim");
assert.equal(callbackEventDecision({ eventStatus: "processed", receivedAt: "2026-10-29T12:00:00Z",
  processedAt: "2026-10-29T12:01:59Z", paymentStatus: "paid", now }), "final");
assert.equal(callbackEventDecision({ eventStatus: "received", receivedAt: "2026-10-29T12:00:30Z",
  paymentStatus: "pending", now }), "wait");
assert.equal(callbackEventDecision({ eventStatus: "received", receivedAt: "2026-10-29T12:00:00Z",
  paymentStatus: "pending", now }), "reclaim");
const firstResult = nextPashaPaymentStatus("initiated", "pending");
assert.equal(firstResult, "pending");
assert.equal(callbackEventDecision({ eventStatus: "received", lastErrorCode: "PASHA_RESULT_PENDING",
  processedAt: "2026-10-29T12:00:30Z", paymentStatus: firstResult, now }), "reclaim");
assert.equal(nextPashaPaymentStatus(firstResult, "paid"), "paid");
console.log("PAŞA return state transitions passed.");
