import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.55.0";

const ORIGINS = new Set(["https://atsrs.com", "https://www.atsrs.com"]);
const origin = (request: Request) => {
  const value = request.headers.get("origin") ?? "";
  return ORIGINS.has(value) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(value) ? value : null;
};
const headers = (request: Request) => ({
  "Access-Control-Allow-Origin": origin(request) ?? "https://atsrs.com",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, idempotency-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8",
  "Vary": "Origin", "X-Content-Type-Options": "nosniff",
});
const json = (request: Request, status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers: headers(request) });
const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const reasons = new Set(["duplicate_charge", "incorrect_amount", "unauthorized", "service_not_delivered", "technical_failure", "other"]);

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: headers(request) });
  if (request.method !== "POST" || !origin(request)) return json(request, 405, { code: "BILLING_METHOD_REJECTED" });
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const publicKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY") ?? "";
  const authorization = request.headers.get("authorization") ?? "";
  if (!supabaseUrl || !publicKey || !serviceKey) return json(request, 503, { code: "BILLING_NOT_CONFIGURED" });
  const userClient = createClient(supabaseUrl, publicKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const user = (await userClient.auth.getUser()).data.user;
  if (!user) return json(request, 401, { code: "AUTH_REQUIRED" });

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return json(request, 400, { code: "REFUND_REQUEST_INVALID" }); }
  const intent = request.headers.get("idempotency-key") ?? body.request_intent_key;
  if (!uuid(body.transaction_id) || !uuid(intent) || typeof body.reason_code !== "string" || !reasons.has(body.reason_code)) {
    return json(request, 400, { code: "REFUND_REQUEST_INVALID" });
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const payment = await admin.schema("atsrs_private").from("atsrs_payment_transactions")
    .select("id,status,amount_minor,refunded_amount_minor,currency")
    .eq("id", body.transaction_id).eq("user_id", user.id).maybeSingle();
  if (payment.error || !payment.data) return json(request, 404, { code: "PAYMENT_NOT_FOUND" });
  if (!new Set(["paid", "partially_refunded"]).has(payment.data.status)) return json(request, 409, { code: "PAYMENT_NOT_REFUNDABLE" });
  const remaining = payment.data.amount_minor - payment.data.refunded_amount_minor;
  if (remaining <= 0) return json(request, 409, { code: "PAYMENT_ALREADY_REFUNDED" });

  const inserted = await admin.schema("atsrs_private").from("atsrs_payment_refunds").insert({
    transaction_id: payment.data.id,
    requested_by: user.id,
    idempotency_key: intent,
    amount_minor: remaining,
    currency: payment.data.currency,
    safe_reason_code: body.reason_code,
  }).select("id,status,amount_minor,currency,created_at").maybeSingle();
  if (inserted.error?.code === "23505") {
    const existing = await admin.schema("atsrs_private").from("atsrs_payment_refunds")
      .select("id,status,amount_minor,currency,created_at")
      .eq("transaction_id", payment.data.id).eq("idempotency_key", intent).maybeSingle();
    return existing.data ? json(request, 200, { refund: existing.data, resumed: true }) : json(request, 409, { code: "REFUND_REQUEST_CONFLICT" });
  }
  if (inserted.error || !inserted.data) return json(request, 500, { code: "REFUND_REQUEST_FAILED" });
  await admin.schema("atsrs_private").from("atsrs_billing_audit_log").insert({
    actor_user_id: user.id, action: "refund_requested", entity_type: "refund",
    entity_reference: inserted.data.id, safe_details: { transaction_id: payment.data.id, reason_code: body.reason_code },
  });
  return json(request, 202, { refund: inserted.data });
});
