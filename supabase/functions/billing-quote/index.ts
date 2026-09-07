import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.55.0";
import { signBillingQuote } from "../_shared/billing-quote.ts";
import { isBillingCycle, isPlanKey } from "../_shared/payment-provider.ts";

const SITE_ORIGINS = new Set(["https://atsrs.com", "https://www.atsrs.com"]);
const allowedOrigin = (request: Request) => {
  const origin = request.headers.get("origin") ?? "";
  return SITE_ORIGINS.has(origin) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin) ? origin : null;
};
const responseHeaders = (request: Request) => ({
  "Access-Control-Allow-Origin": allowedOrigin(request) ?? "https://atsrs.com",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "Vary": "Origin",
  "X-Content-Type-Options": "nosniff",
});
const json = (request: Request, status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: responseHeaders(request) });

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: responseHeaders(request) });
  if (request.method !== "POST" || !allowedOrigin(request)) return json(request, 405, { code: "BILLING_METHOD_REJECTED" });
  if (Deno.env.get("ATSRS_BILLING_ENABLED") !== "true") return json(request, 503, { code: "BILLING_NOT_OPEN" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const publicKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY") ?? "";
  const quoteSecret = Deno.env.get("ATSRS_BILLING_QUOTE_SECRET") ?? "";
  const authorization = request.headers.get("authorization") ?? "";
  if (!supabaseUrl || !publicKey || !serviceKey || quoteSecret.length < 32) return json(request, 503, { code: "BILLING_NOT_CONFIGURED" });

  const userClient = createClient(supabaseUrl, publicKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const user = (await userClient.auth.getUser()).data.user;
  if (!user) return json(request, 401, { code: "AUTH_REQUIRED" });

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return json(request, 400, { code: "BILLING_REQUEST_INVALID" }); }
  if (!isPlanKey(body.plan) || !isBillingCycle(body.cycle)) return json(request, 400, { code: "BILLING_PLAN_INVALID" });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const plan = await admin.schema("atsrs_private").from("atsrs_billing_plans")
    .select("plan_key,currency,monthly_amount_minor,yearly_amount_minor,checkout_enabled,catalog_version")
    .eq("plan_key", body.plan).maybeSingle();
  if (plan.error || !plan.data?.checkout_enabled) return json(request, 409, { code: "PLAN_CHECKOUT_DISABLED" });

  const amountMinor = body.cycle === "monthly" ? plan.data.monthly_amount_minor : plan.data.yearly_amount_minor;
  const issuedAt = Date.now();
  const quote = {
    userId: user.id,
    planKey: body.plan,
    billingCycle: body.cycle,
    amountMinor,
    currency: plan.data.currency,
    catalogVersion: plan.data.catalog_version,
    issuedAt,
    expiresAt: issuedAt + 10 * 60 * 1000,
    nonce: crypto.randomUUID(),
  };
  return json(request, 200, { quote_token: await signBillingQuote(quote, quoteSecret), quote, checkout_enabled: true });
});
