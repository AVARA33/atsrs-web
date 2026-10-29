import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.55.0";
import { resolvePaymentProvider } from "../_shared/payment-provider.ts";
import { verifyBillingQuote } from "../_shared/billing-quote.ts";
import { readBodyLimited } from "../_shared/request-body.ts";

const SITE_ORIGINS = new Set(["https://atsrs.com", "https://www.atsrs.com"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const secretKey = () => Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY") ?? "";
const publishableKey = () => Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
const allowedOrigin = (request: Request) => SITE_ORIGINS.has(request.headers.get("origin") ?? "") ? request.headers.get("origin")! : null;
const headers = (request: Request) => ({
  "Access-Control-Allow-Origin": allowedOrigin(request) ?? "https://atsrs.com",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, idempotency-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8", "Referrer-Policy": "no-referrer",
  "Vary": "Origin", "X-Content-Type-Options": "nosniff",
});
const json = (request: Request, status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: headers(request) });

function clientIpAddress(request: Request) {
  for (const candidate of [request.headers.get("cf-connecting-ip"), request.headers.get("x-forwarded-for")?.split(",")[0]]) {
    const value = candidate?.trim() ?? "";
    if (value.length <= 45 && /^[0-9a-f:.]+$/i.test(value)) return value;
  }
  return "0.0.0.0";
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: headers(request) });
  if (request.method !== "POST" || !allowedOrigin(request)) return json(request, 405, { code: "BILLING_METHOD_REJECTED" });
  if (Deno.env.get("ATSRS_BILLING_ENABLED") !== "true") return json(request, 503, { code: "BILLING_NOT_OPEN" });
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceSecret = secretKey();
  const authorization = request.headers.get("authorization") ?? "";
  const quoteSecret = Deno.env.get("ATSRS_BILLING_QUOTE_SECRET") ?? "";
  const purchaseIntent = (request.headers.get("idempotency-key") ?? "").trim();
  if (!supabaseUrl || !serviceSecret || !publishableKey() || quoteSecret.length < 32) return json(request, 503, { code: "BILLING_NOT_CONFIGURED" });
  if (!UUID.test(purchaseIntent)) return json(request, 400, { code: "PURCHASE_INTENT_INVALID" });
  if (!authorization.toLowerCase().startsWith("bearer ")) return json(request, 401, { code: "AUTH_REQUIRED" });
  const userClient = createClient(supabaseUrl, publishableKey(), { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const user = (await userClient.auth.getUser()).data.user;
  if (!user) return json(request, 401, { code: "AUTH_REQUIRED" });
  let body: Record<string, unknown>;
  try {
    const raw = await readBodyLimited(request, 16_384);
    body = JSON.parse(new TextDecoder().decode(raw));
  } catch (error) { return json(request, error instanceof Error && error.message === "REQUEST_TOO_LARGE" ? 413 : 400,
    { code: error instanceof Error && error.message === "REQUEST_TOO_LARGE" ? "BILLING_REQUEST_TOO_LARGE" : "BILLING_REQUEST_INVALID" }); }
  if (body.accepted_payment_terms !== true || typeof body.quote_token !== "string") {
    return json(request, 400, { code: body.accepted_payment_terms === true ? "BILLING_QUOTE_REQUIRED" : "PAYMENT_TERMS_ACCEPTANCE_REQUIRED" });
  }
  let quote;
  try { quote = await verifyBillingQuote(body.quote_token, quoteSecret); }
  catch { return json(request, 400, { code: "BILLING_QUOTE_INVALID" }); }
  if (quote.userId !== user.id) return json(request, 403, { code: "BILLING_QUOTE_OWNER_MISMATCH" });
  const provider = await resolvePaymentProvider((Deno.env.get("ATSRS_PAYMENT_PROVIDER") ?? "").trim().toLowerCase());
  if (!provider) return json(request, 503, { code: "PAYMENT_PROVIDER_NOT_CONNECTED" });
  const admin = createClient(supabaseUrl, serviceSecret, { auth: { persistSession: false } });
  const plan = await admin.schema("atsrs_private").from("atsrs_billing_plans")
    .select("plan_key,currency,monthly_amount_minor,yearly_amount_minor,checkout_enabled,catalog_version")
    .eq("plan_key", quote.planKey).maybeSingle();
  const expectedAmount = quote.billingCycle === "monthly" ? plan.data?.monthly_amount_minor : plan.data?.yearly_amount_minor;
  if (plan.error || !plan.data?.checkout_enabled) return json(request, 409, { code: "PLAN_CHECKOUT_DISABLED" });
  if (plan.data.currency !== quote.currency ||
      expectedAmount !== quote.amountMinor || plan.data.catalog_version !== quote.catalogVersion) {
    return json(request, 409, { code: "BILLING_QUOTE_STALE" });
  }
  const transactionId = crypto.randomUUID();
  const row = { id: transactionId, user_id: user.id, plan_key: quote.planKey,
    billing_cycle: quote.billingCycle, currency: quote.currency, amount_minor: quote.amountMinor,
    provider: provider.key, idempotency_key: purchaseIntent, purchase_intent_key: purchaseIntent,
    quote_version: quote.catalogVersion };
  const inserted = await admin.schema("atsrs_private").from("atsrs_payment_transactions").insert(row).select("*").maybeSingle();
  let transaction = inserted.data;
  if (inserted.error) {
    const existing = await admin.schema("atsrs_private").from("atsrs_payment_transactions")
      .select("*").eq("user_id", user.id).eq("purchase_intent_key", purchaseIntent).maybeSingle();
    if (existing.error || !existing.data) return json(request, 500, { code: "TRANSACTION_CREATE_FAILED" });
    transaction = existing.data;
    if (transaction.plan_key !== quote.planKey || transaction.billing_cycle !== quote.billingCycle ||
        transaction.currency !== quote.currency || transaction.amount_minor !== quote.amountMinor || transaction.provider !== provider.key) {
      return json(request, 409, { code: "PURCHASE_INTENT_CONFLICT" });
    }
  }
  if (!transaction) return json(request, 500, { code: "TRANSACTION_CREATE_FAILED" });
  if (["paid", "partially_refunded", "refunded"].includes(transaction.status)) {
    return json(request, 409, { code: "PURCHASE_ALREADY_COMPLETED", transaction_id: transaction.id });
  }
  try {
    const checkout = await provider.createCheckout({ transactionId: transaction.id, idempotencyKey: purchaseIntent,
      planKey: quote.planKey, billingCycle: quote.billingCycle, amountMinor: quote.amountMinor,
      currency: quote.currency, customerReference: user.id, clientIpAddress: clientIpAddress(request),
      language: body.language === "az" || body.language === "ru" ? body.language : "en",
      successUrl: `https://atsrs.com/pricing.html?payment=success&transaction=${transaction.id}`,
      cancelUrl: `https://atsrs.com/pricing.html?payment=cancelled&transaction=${transaction.id}` });
    const saved = await admin.schema("atsrs_private").from("atsrs_payment_transactions").update({
      status: "pending", provider_order_reference: checkout.providerOrderReference,
      reconciliation_required: false, updated_at: new Date().toISOString(),
    }).eq("id", transaction.id).in("status", ["initiated", "pending"]).select("id").maybeSingle();
    if (saved.error || !saved.data) {
      await admin.schema("atsrs_private").from("atsrs_payment_transactions").update({ reconciliation_required: true }).eq("id", transaction.id);
      return json(request, 503, { code: "PAYMENT_RECONCILIATION_REQUIRED", transaction_id: transaction.id });
    }
    await admin.schema("atsrs_private").from("atsrs_billing_audit_log").insert({ actor_user_id: user.id,
      action: "checkout_started", entity_type: "payment", entity_reference: transaction.id,
      safe_details: { provider: provider.key, plan: quote.planKey, cycle: quote.billingCycle } });
    return json(request, 200, { redirect_url: checkout.redirectUrl, transaction_id: transaction.id });
  } catch (error) {
    await admin.schema("atsrs_private").from("atsrs_payment_transactions").update({
      reconciliation_required: true, failure_code: "PROVIDER_CHECKOUT_UNCERTAIN", updated_at: new Date().toISOString(),
    }).eq("id", transaction.id).in("status", ["initiated", "pending"]);
    console.error("Payment provider checkout requires reconciliation", error instanceof Error ? error.name : "UnknownError");
    return json(request, 503, { code: "PAYMENT_RECONCILIATION_REQUIRED", transaction_id: transaction.id });
  }
});
