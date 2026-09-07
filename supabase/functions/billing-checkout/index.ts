import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.55.0";
import {
  isBillingCycle,
  isPlanKey,
  resolvePaymentProvider,
} from "../_shared/payment-provider.ts";
import { verifyBillingQuote } from "../_shared/billing-quote.ts";

const SITE_ORIGINS = new Set(["https://atsrs.com", "https://www.atsrs.com"]);

function secretKey() {
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY") ?? "";
}

function publishableKey() {
  return Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
}

function allowedOrigin(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  if (SITE_ORIGINS.has(origin)) return origin;
  if (/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) return origin;
  return null;
}

function headers(request: Request) {
  return {
    "Access-Control-Allow-Origin": allowedOrigin(request) ?? "https://atsrs.com",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, idempotency-key",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Referrer-Policy": "no-referrer",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
  };
}

function json(request: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: headers(request) });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: headers(request) });
  if (request.method !== "POST" || !allowedOrigin(request)) {
    return json(request, 405, { error: "Method not allowed.", code: "BILLING_METHOD_REJECTED" });
  }

  if (Deno.env.get("ATSRS_BILLING_ENABLED") !== "true") {
    return json(request, 503, { error: "Paid billing is not open yet.", code: "BILLING_NOT_OPEN" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceSecret = secretKey();
  const authorization = request.headers.get("authorization") ?? "";
  if (!supabaseUrl || !serviceSecret || !publishableKey()) {
    return json(request, 503, { error: "Billing is not configured.", code: "BILLING_NOT_CONFIGURED" });
  }
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return json(request, 401, { error: "Sign in is required.", code: "AUTH_REQUIRED" });
  }

  const userClient = createClient(supabaseUrl, publishableKey(), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const userResult = await userClient.auth.getUser();
  const user = userResult.data.user;
  if (!user) return json(request, 401, { error: "Sign in is required.", code: "AUTH_REQUIRED" });

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return json(request, 400, { error: "Invalid request.", code: "BILLING_REQUEST_INVALID" });
  }
  if (!isPlanKey(body.plan) || !isBillingCycle(body.cycle)) {
    return json(request, 400, { error: "Select a valid paid plan and billing cycle.", code: "BILLING_PLAN_INVALID" });
  }
  const purchaseIntentKey = request.headers.get("idempotency-key") ?? body.purchase_intent_key;
  if (!isUuid(purchaseIntentKey)) {
    return json(request, 400, { error: "A valid purchase intent is required.", code: "PURCHASE_INTENT_REQUIRED" });
  }

  const providerKey = (Deno.env.get("ATSRS_PAYMENT_PROVIDER") ?? "").trim().toLowerCase();
  const provider = resolvePaymentProvider(providerKey);
  if (!provider) {
    return json(request, 503, { error: "The payment provider is not connected yet.", code: "PAYMENT_PROVIDER_NOT_CONNECTED" });
  }

  const admin = createClient(supabaseUrl, serviceSecret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const planResult = await admin.schema("atsrs_private").from("atsrs_billing_plans")
    .select("plan_key,currency,monthly_amount_minor,yearly_amount_minor,checkout_enabled,catalog_version")
    .eq("plan_key", body.plan).maybeSingle();
  if (planResult.error || !planResult.data?.checkout_enabled) {
    return json(request, 409, { error: "This plan is not available for checkout.", code: "PLAN_CHECKOUT_DISABLED" });
  }

  const amountMinor = body.cycle === "monthly"
    ? planResult.data.monthly_amount_minor
    : planResult.data.yearly_amount_minor;
  const quoteSecret = Deno.env.get("ATSRS_BILLING_QUOTE_SECRET") ?? "";
  const quote = quoteSecret.length >= 32 ? await verifyBillingQuote(body.quote_token, quoteSecret) : null;
  if (!quote || quote.userId !== user.id || quote.planKey !== body.plan ||
      quote.billingCycle !== body.cycle || quote.amountMinor !== amountMinor ||
      quote.currency !== planResult.data.currency || quote.catalogVersion !== planResult.data.catalog_version) {
    return json(request, 409, { error: "The checkout price has expired or changed.", code: "BILLING_QUOTE_INVALID" });
  }
  const transactionId = crypto.randomUUID();
  const idempotencyKey = purchaseIntentKey;
  const inserted = await admin.schema("atsrs_private").from("atsrs_payment_transactions").insert({
    id: transactionId,
    user_id: user.id,
    plan_key: body.plan,
    billing_cycle: body.cycle,
    currency: planResult.data.currency,
    amount_minor: amountMinor,
    provider: provider.key,
    idempotency_key: idempotencyKey,
    purchase_intent_key: purchaseIntentKey,
    quote_version: planResult.data.catalog_version,
  }).select("id,plan_key,billing_cycle,status,provider_order_reference").maybeSingle();
  if (inserted.error) {
    if (inserted.error.code === "23505") {
      const existing = await admin.schema("atsrs_private").from("atsrs_payment_transactions")
        .select("id,plan_key,billing_cycle,status,provider_order_reference")
        .eq("user_id", user.id).eq("purchase_intent_key", purchaseIntentKey).maybeSingle();
      if (existing.error || !existing.data) {
        return json(request, 409, { error: "The existing checkout could not be recovered.", code: "PURCHASE_INTENT_CONFLICT" });
      }
      if (existing.data.plan_key !== body.plan || existing.data.billing_cycle !== body.cycle) {
        return json(request, 409, { error: "This purchase intent belongs to a different checkout.", code: "PURCHASE_INTENT_REUSED" });
      }
      return json(request, 200, {
        transaction_id: existing.data.id,
        status: existing.data.status,
        resumed: true,
      });
    }
    console.error("Unable to create billing transaction", inserted.error.code);
    return json(request, 500, { error: "Checkout could not be started.", code: "TRANSACTION_CREATE_FAILED" });
  }

  try {
    const checkout = await provider.createCheckout({
      transactionId,
      idempotencyKey,
      planKey: body.plan,
      billingCycle: body.cycle,
      amountMinor,
      currency: planResult.data.currency,
      customerReference: user.id,
      successUrl: `https://atsrs.com/pricing.html?payment=success&transaction=${transactionId}`,
      cancelUrl: `https://atsrs.com/pricing.html?payment=cancelled&transaction=${transactionId}`,
    });
    const finalized = await admin.schema("atsrs_private").from("atsrs_payment_transactions").update({
      status: "pending",
      provider_order_reference: checkout.providerOrderReference,
      updated_at: new Date().toISOString(),
    }).eq("id", transactionId).eq("user_id", user.id).eq("status", "initiated").select("id").maybeSingle();
    if (finalized.error || !finalized.data) {
      console.error("Unable to persist provider order reference", finalized.error?.code ?? "NO_ROW");
      await admin.schema("atsrs_private").from("atsrs_payment_transactions").update({
        reconciliation_required: true,
        failure_code: "PROVIDER_ORDER_PERSIST_FAILED",
        updated_at: new Date().toISOString(),
      }).eq("id", transactionId);
      return json(request, 503, { error: "Checkout is being reconciled. No new attempt is needed.", code: "CHECKOUT_RECONCILIATION_REQUIRED", transaction_id: transactionId });
    }
    await admin.schema("atsrs_private").from("atsrs_billing_audit_log").insert({
      actor_user_id: user.id,
      action: "checkout_created",
      entity_type: "payment",
      entity_reference: transactionId,
      safe_details: { plan: body.plan, cycle: body.cycle, quote_version: planResult.data.catalog_version },
    });
    return json(request, 200, { redirect_url: checkout.redirectUrl, transaction_id: transactionId });
  } catch (error) {
    await admin.schema("atsrs_private").from("atsrs_payment_transactions").update({
      status: "failed",
      failure_code: "PROVIDER_CHECKOUT_FAILED",
      updated_at: new Date().toISOString(),
    }).eq("id", transactionId).eq("user_id", user.id);
    console.error("Payment provider checkout failed", error instanceof Error ? error.name : "UnknownError");
    return json(request, 502, { error: "The bank checkout could not be started.", code: "PROVIDER_CHECKOUT_FAILED" });
  }
});
