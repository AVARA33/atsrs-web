const TERMINAL = new Set(["partially_refunded", "refunded"]);
const FINAL_FOR_CALLBACK = new Set(["paid", "partially_refunded", "refunded"]);

export function nextPashaPaymentStatus(current, reported) {
  if (TERMINAL.has(current) || current === "paid") return current;
  if (reported === "paid") return "paid";
  if (reported === "pending") return ["initiated", "pending"].includes(current) ? "pending" : current;
  if (["failed", "canceled"].includes(reported)) {
    return ["initiated", "pending", "authorized"].includes(current) ? reported : current;
  }
  throw new Error("PASHA_STATUS_INVALID");
}

export function callbackRedirectState(status) {
  if (status === "paid") return "success";
  if (["failed", "canceled", "pending"].includes(status)) return status;
  return "verification-pending";
}

export function isFinalPashaPaymentStatus(status) {
  return FINAL_FOR_CALLBACK.has(status);
}

export function callbackEventDecision({ eventStatus, lastErrorCode, receivedAt, processedAt,
  paymentStatus, now = Date.now(), retryCooldownMs = 60_000, staleClaimMs = 120_000 }) {
  if (eventStatus === "processed" && isFinalPashaPaymentStatus(paymentStatus)) return "final";
  const timestamp = Date.parse(processedAt || receivedAt || "");
  const age = Number.isFinite(timestamp) ? now - timestamp : Number.POSITIVE_INFINITY;
  if (eventStatus === "processed") return age >= retryCooldownMs ? "reclaim" : "wait";
  if (eventStatus === "failed") return age >= retryCooldownMs ? "reclaim" : "wait";
  if (eventStatus === "received") {
    const cooldown = /^PASHA_RESULT_/.test(lastErrorCode || "") ? retryCooldownMs : staleClaimMs;
    return age >= cooldown ? "reclaim" : "wait";
  }
  return "wait";
}
