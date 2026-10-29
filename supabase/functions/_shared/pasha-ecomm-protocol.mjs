const CURRENCY_CODES = Object.freeze({
  AZN: "944",
  USD: "840",
  EUR: "978",
});

export function pashaCurrencyCode(currency) {
  const normalized = String(currency ?? "").trim().toUpperCase();
  const code = CURRENCY_CODES[normalized];
  if (!code) throw new Error("PASHA_CURRENCY_UNSUPPORTED");
  return code;
}

export function pashaAmountMinor(amountMinor) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new Error("PASHA_AMOUNT_INVALID");
  }
  const amount = String(amountMinor);
  if (amount.length > 12) throw new Error("PASHA_AMOUNT_TOO_LARGE");
  return amount;
}

export function pashaLanguage(language) {
  return language === "az" || language === "ru" ? language : "en";
}

const DEFAULT_CLIENT_HANDLER_URL = "https://ecomm.pashabank.az:8463/ecomm2/ClientHandler";

export function pashaClientRedirectUrl(clientHandlerUrl, transactionId, allowedUrls = [DEFAULT_CLIENT_HANDLER_URL]) {
  const url = new URL(clientHandlerUrl);
  const canonical = url.toString();
  const allowlist = new Set(allowedUrls.map((value) => new URL(value).toString()));
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("PASHA_CLIENT_HANDLER_INVALID");
  }
  if (!allowlist.has(canonical)) throw new Error("PASHA_CLIENT_HANDLER_NOT_ALLOWED");
  if (!/^[A-Za-z0-9+/=_-]{8,512}$/.test(transactionId)) {
    throw new Error("PASHA_TRANSACTION_ID_INVALID");
  }
  url.searchParams.set("trans_id", transactionId);
  return url.toString();
}

/**
 * @returns {{ paymentStatus: "pending" | "paid" | "failed" | "canceled", safeFailureCode?: string }}
 */
export function normalizePashaResult(result, resultCode) {
  const normalizedResult = String(result ?? "").trim().toUpperCase();
  const normalizedCode = String(resultCode ?? "").trim().toUpperCase();

  if (normalizedResult === "OK" && normalizedCode === "000") {
    return { paymentStatus: "paid", safeFailureCode: undefined };
  }
  if (normalizedResult === "PENDING" || normalizedResult === "CREATED") {
    return { paymentStatus: "pending", safeFailureCode: undefined };
  }
  if (normalizedResult === "REVERSED" || normalizedResult === "AUTOREVERSED") {
    return { paymentStatus: "canceled", safeFailureCode: `PASHA_${normalizedResult}` };
  }
  if (["FAILED", "DECLINED", "TIMEOUT"].includes(normalizedResult)) {
    const suffix = normalizedCode && /^[A-Z0-9_-]{1,32}$/.test(normalizedCode)
      ? `_${normalizedCode}`
      : "";
    return { paymentStatus: "failed", safeFailureCode: `PASHA_${normalizedResult}${suffix}` };
  }
  throw new Error("PASHA_RESULT_UNKNOWN");
}
