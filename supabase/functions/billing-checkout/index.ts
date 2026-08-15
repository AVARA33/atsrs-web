import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.55.0";
import {
  isBillingCycle,
  isPlanKey,
  resolvePaymentProvider,
} from "../_shared/payment-provider.ts";

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
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
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

  const providerKey = (Deno.env.get("ATSRS_PAYMENT_PROVIDER") ?? "").trim().toLowerCase();
  const provider = resolvePaymentProvider(providerKey);
  if (!provider) {
    return json(request, 503, { error: "The payment provider is not connected yet.", code: "PAYMENT_PROVIDER_NOT_CONNECTED" });
  }

  const admin = createClient(supabaseUrl, serviceSecret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const planResult = await admin.schema("atsrs_private").from("atsrs_billing_plans")
    .select("plan_key,currency,monthly_amount_minor,yearly_amount_minor,checkout_enabled")
    .eq("plan_key", body.plan).maybeSingle();
  if (planResult.error || !planResult.data?.checkout_enabled) {
    return json(request, 409, { error: "This plan is not available for checkout.", code: "PLAN_CHECKOUT_DISABLED" });
  }

  const amountMinor = body.cycle === "monthly"
    ? planResult.data.monthly_amount_minor
    : planResult.data.yearly_amount_minor;
  const transactionId = crypto.randomUUID();
  const idempotencyKey = crypto.randomUUID();
  const inserted = await admin.schema("atsrs_private").from("atsrs_payment_transactions").insert({
    id: transactionId,
    user_id: user.id,
    plan_key: body.plan,
    billing_cycle: body.cycle,
    currency: planResult.data.currency,
    amount_minor: amountMinor,
    provider: provider.key,
    idempotency_key: idempotencyKey,
  });
  if (inserted.error) {
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
    await admin.schema("atsrs_private").from("atsrs_payment_transactions").update({
      status: "pending",
      provider_order_reference: checkout.providerOrderReference,
      updated_at: new Date().toISOString(),
    }).eq("id", transactionId).eq("user_id", user.id);
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
