import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.55.0";
import { isBillingCycle, isPlanKey } from "../_shared/payment-provider.ts";
import { signBillingQuote } from "../_shared/billing-quote.ts";
import { readBodyLimited } from "../_shared/request-body.ts";

const ORIGINS = new Set(["https://atsrs.com", "https://www.atsrs.com"]);
const origin = (request: Request) => ORIGINS.has(request.headers.get("origin") ?? "") ? request.headers.get("origin")! : null;
const responseHeaders = (request: Request) => ({
  "Access-Control-Allow-Origin": origin(request) ?? "https://atsrs.com",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8", "Vary": "Origin", "X-Content-Type-Options": "nosniff",
});
const json = (request: Request, status: number, value: Record<string, unknown>) =>
  new Response(JSON.stringify(value), { status, headers: responseHeaders(request) });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: responseHeaders(request) });
  if (request.method !== "POST" || !origin(request)) return json(request, 405, { code: "BILLING_METHOD_REJECTED" });
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY") ?? "";
  const secret = Deno.env.get("ATSRS_BILLING_QUOTE_SECRET") ?? "";
  const authorization = request.headers.get("authorization") ?? "";
  if (!url || !key || !service || secret.length < 32) return json(request, 503, { code: "BILLING_NOT_CONFIGURED" });
  const userClient = createClient(url, key, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const user = (await userClient.auth.getUser()).data.user;
  if (!user) return json(request, 401, { code: "AUTH_REQUIRED" });
  let body: Record<string, unknown>;
  try {
    const raw = await readBodyLimited(request, 16_384);
    body = JSON.parse(new TextDecoder().decode(raw));
  } catch (error) { return json(request, error instanceof Error && error.message === "REQUEST_TOO_LARGE" ? 413 : 400,
    { code: error instanceof Error && error.message === "REQUEST_TOO_LARGE" ? "BILLING_REQUEST_TOO_LARGE" : "BILLING_REQUEST_INVALID" }); }
  if (!isPlanKey(body.plan) || !isBillingCycle(body.cycle)) return json(request, 400, { code: "BILLING_PLAN_INVALID" });
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const result = await admin.schema("atsrs_private").from("atsrs_billing_plans")
    .select("plan_key,currency,monthly_amount_minor,yearly_amount_minor,checkout_enabled,catalog_version")
    .eq("plan_key", body.plan).maybeSingle();
  if (result.error || !result.data?.checkout_enabled) return json(request, 409, { code: "PLAN_CHECKOUT_DISABLED" });
  const amountMinor = body.cycle === "monthly" ? result.data.monthly_amount_minor : result.data.yearly_amount_minor;
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0 || !Number.isSafeInteger(result.data.catalog_version) ||
      result.data.catalog_version < 1 || !/^[A-Z]{3}$/.test(result.data.currency)) {
    return json(request, 503, { code: "BILLING_CATALOG_INVALID" });
  }
  const expiresAt = Date.now() + 10 * 60_000;
  const quoteToken = await signBillingQuote({ version: 1, userId: user.id, planKey: body.plan,
    billingCycle: body.cycle, amountMinor, currency: result.data.currency,
    catalogVersion: result.data.catalog_version, expiresAt }, secret);
  return json(request, 200, { quote_token: quoteToken, expires_at: new Date(expiresAt).toISOString() });
});
