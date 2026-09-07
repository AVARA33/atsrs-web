import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.55.0";

const ORIGINS = new Set(["https://atsrs.com", "https://www.atsrs.com"]);
const origin = (request: Request) => {
  const value = request.headers.get("origin") ?? "";
  return ORIGINS.has(value) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(value) ? value : null;
};
const headers = (request: Request) => ({
  "Access-Control-Allow-Origin": origin(request) ?? "https://atsrs.com",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, OPTIONS", "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8", "Vary": "Origin", "X-Content-Type-Options": "nosniff",
});
const json = (request: Request, status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers: headers(request) });

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: headers(request) });
  if (request.method !== "GET" || !origin(request)) return json(request, 405, { code: "BILLING_METHOD_REJECTED" });
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const publicKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY") ?? "";
  const authorization = request.headers.get("authorization") ?? "";
  if (!supabaseUrl || !publicKey || !serviceKey) return json(request, 503, { code: "BILLING_NOT_CONFIGURED" });
  const userClient = createClient(supabaseUrl, publicKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const user = (await userClient.auth.getUser()).data.user;
  if (!user) return json(request, 401, { code: "AUTH_REQUIRED" });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const [subscriptions, payments] = await Promise.all([
    admin.schema("atsrs_private").from("atsrs_billing_subscriptions")
      .select("id,plan_key,billing_cycle,status,currency,amount_minor,current_period_start,current_period_end,cancel_at_period_end,canceled_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    admin.schema("atsrs_private").from("atsrs_payment_transactions")
      .select("id,subscription_id,plan_key,billing_cycle,status,currency,amount_minor,refunded_amount_minor,failure_code,paid_at,created_at,updated_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
  ]);
  if (subscriptions.error || payments.error) return json(request, 500, { code: "BILLING_ACCOUNT_LOAD_FAILED" });
  const transactionIds = (payments.data ?? []).map((payment) => payment.id);
  const refunds = transactionIds.length ? await admin.schema("atsrs_private").from("atsrs_payment_refunds")
    .select("id,transaction_id,status,amount_minor,currency,safe_reason_code,created_at,updated_at,processed_at")
    .in("transaction_id", transactionIds).order("created_at", { ascending: false }) : { data: [], error: null };
  if (refunds.error) return json(request, 500, { code: "BILLING_ACCOUNT_LOAD_FAILED" });
  return json(request, 200, { subscriptions: subscriptions.data ?? [], payments: payments.data ?? [], refunds: refunds.data ?? [] });
});
