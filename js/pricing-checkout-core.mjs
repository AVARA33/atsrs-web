const DEFAULT_ALLOWED_REDIRECTS = Object.freeze([
  "https://ecomm.pashabank.az:8463/ecomm2/ClientHandler",
]);

export function createPurchaseIntentStore(storage, uuid = () => crypto.randomUUID()) {
  const prefix = "atsrs_purchase_intent:";
  const keyFor = (plan, cycle) => `${prefix}${plan}:${cycle}`;
  return {
    get(plan, cycle) {
      const key = keyFor(plan, cycle);
      const existing = storage.getItem(key);
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existing ?? "")) return existing;
      const created = uuid();
      storage.setItem(key, created);
      return created;
    },
    clear(plan, cycle) { storage.removeItem(keyFor(plan, cycle)); },
    renew(plan, cycle) { this.clear(plan, cycle); return this.get(plan, cycle); },
  };
}

export function allowedPashaRedirect(value, allowed = DEFAULT_ALLOWED_REDIRECTS) {
  try {
    const url = new URL(value);
    const base = `${url.origin}${url.pathname}`;
    if (!allowed.includes(base) || url.username || url.password || url.hash) return false;
    const parameters = Array.from(url.searchParams.entries());
    return parameters.length === 1 && parameters[0][0] === "trans_id" &&
      /^[A-Za-z0-9+/=_-]{8,512}$/.test(parameters[0][1]);
  } catch { return false; }
}

export async function startPricingCheckout({ client, plan, cycle, accepted, language = "en",
  intentStore, now = () => Date.now(), navigate = (url) => location.assign(url) }) {
  if (!accepted) throw new Error("PAYMENT_TERMS_ACCEPTANCE_REQUIRED");
  if (!client?.auth || !client?.functions) throw new Error("BILLING_CLIENT_UNAVAILABLE");
  const session = (await client.auth.getSession())?.data?.session;
  if (!session?.access_token) throw new Error("AUTH_REQUIRED");
  const authorization = `Bearer ${session.access_token}`;
  const quoteResult = await client.functions.invoke("billing-quote", {
    body: { plan, cycle }, headers: { Authorization: authorization },
  });
  if (quoteResult.error) throw quoteResult.error;
  const quoteToken = quoteResult.data?.quote_token;
  const expiresAt = Date.parse(quoteResult.data?.expires_at ?? "");
  if (typeof quoteToken !== "string" || quoteToken.length > 4096 || !Number.isFinite(expiresAt) || expiresAt <= now() + 5_000) {
    throw new Error("BILLING_QUOTE_INVALID_OR_EXPIRED");
  }
  const idempotencyKey = intentStore.get(plan, cycle);
  const checkoutResult = await client.functions.invoke("billing-checkout", {
    body: { quote_token: quoteToken, accepted_payment_terms: true, language },
    headers: { Authorization: authorization, "Idempotency-Key": idempotencyKey },
  });
  if (checkoutResult.error) throw checkoutResult.error;
  const redirectUrl = checkoutResult.data?.redirect_url;
  if (!allowedPashaRedirect(redirectUrl)) throw new Error("PAYMENT_REDIRECT_REJECTED");
  navigate(redirectUrl);
  return { transactionId: checkoutResult.data?.transaction_id, redirectUrl, idempotencyKey };
}
