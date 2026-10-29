import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.55.0";
import { resolvePaymentProvider, sha256Hex } from "../_shared/payment-provider.ts";
import type { PashaEcommProvider } from "../_shared/pasha-ecomm.ts";
import { callbackEventDecision, callbackRedirectState, isFinalPashaPaymentStatus,
  nextPashaPaymentStatus } from "../_shared/pasha-return-state.mjs";
import { readBodyLimited } from "../_shared/request-body.ts";

const TRANSACTION_ID = /^[A-Za-z0-9+/=_-]{8,512}$/;
const CLAIM_STALE_MS = 2 * 60_000;
const RETRY_COOLDOWN_MS = 60_000;
const redirect = (status: string, transactionId?: string) => {
  const url = new URL("https://atsrs.com/pricing.html");
  url.searchParams.set("payment", status);
  if (transactionId) url.searchParams.set("transaction", transactionId);
  return Response.redirect(url, 303);
};
function clientIpAddress(request: Request) {
  for (const candidate of [request.headers.get("cf-connecting-ip"), request.headers.get("x-forwarded-for")?.split(",")[0]]) {
    const value = candidate?.trim() ?? "";
    if (value.length <= 45 && /^[0-9a-f:.]+$/i.test(value)) return value;
  }
  return "0.0.0.0";
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed.", { status: 405 });
  if (!(request.headers.get("content-type") ?? "").toLowerCase().includes("application/x-www-form-urlencoded")) {
    return new Response("Unsupported content type.", { status: 415 });
  }
  let raw: Uint8Array;
  try { raw = await readBodyLimited(request, 4096); }
  catch { return new Response("Request too large.", { status: 413 }); }
  const body = new TextDecoder().decode(raw);
  const providerOrderReference = new URLSearchParams(body).get("trans_id")?.trim() ?? "";
  if (!TRANSACTION_ID.test(providerOrderReference)) return redirect("failed");
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceSecret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY") ?? "";
  if (!supabaseUrl || !serviceSecret) return redirect("verification-pending");
  const admin = createClient(supabaseUrl, serviceSecret, { auth: { persistSession: false } });
  const paymentResult = await admin.schema("atsrs_private").from("atsrs_payment_transactions")
    .select("id,status").eq("provider", "pasha-ecomm")
    .eq("provider_order_reference", providerOrderReference).maybeSingle();
  if (paymentResult.error || !paymentResult.data) return redirect("verification-pending");
  const payment = paymentResult.data;
  if (["paid", "partially_refunded", "refunded"].includes(payment.status)) return redirect(callbackRedirectState(payment.status), payment.id);

  const eventReference = `return:${providerOrderReference}`;
  const payloadHash = await sha256Hex(new TextEncoder().encode(`trans_id=${providerOrderReference}`));
  const created = await admin.schema("atsrs_private").from("atsrs_payment_webhook_events").insert({
    provider: "pasha-ecomm", provider_event_reference: eventReference, payload_sha256: payloadHash,
    signature_verified: false, status: "received", attempt_count: 1, payment_transaction_id: payment.id,
  }).select("id,status,attempt_count,received_at,processed_at,last_error_code").maybeSingle();
  let event = created.data;
  if (created.error) {
    const existing = await admin.schema("atsrs_private").from("atsrs_payment_webhook_events")
      .select("id,status,attempt_count,received_at,processed_at,payload_sha256,last_error_code")
      .eq("provider", "pasha-ecomm").eq("provider_event_reference", eventReference).maybeSingle();
    if (existing.error || !existing.data || existing.data.payload_sha256 !== payloadHash) return redirect("verification-pending", payment.id);
    event = existing.data;
    let currentPayment = payment;
    if (event.status === "processed") {
      const refreshed = await admin.schema("atsrs_private").from("atsrs_payment_transactions")
        .select("id,status").eq("id", payment.id).maybeSingle();
      if (refreshed.data) currentPayment = refreshed.data;
    }
    const decision = callbackEventDecision({ eventStatus: event.status, lastErrorCode: event.last_error_code,
      receivedAt: event.received_at, processedAt: event.processed_at, paymentStatus: currentPayment.status,
      retryCooldownMs: RETRY_COOLDOWN_MS, staleClaimMs: CLAIM_STALE_MS });
    if (decision === "final") return redirect(callbackRedirectState(currentPayment.status), currentPayment.id);
    if (decision !== "reclaim" || event.attempt_count >= 50) return redirect("verification-pending", currentPayment.id);
    const reclaimed = await admin.schema("atsrs_private").from("atsrs_payment_webhook_events").update({
      status: "received", attempt_count: event.attempt_count + 1, last_error_code: null, processed_at: null,
    }).eq("id", event.id).eq("status", event.status).eq("attempt_count", event.attempt_count)
      .select("id,status,attempt_count,received_at,processed_at,last_error_code").maybeSingle();
    if (reclaimed.error || !reclaimed.data) return redirect("verification-pending", payment.id);
    event = reclaimed.data;
  }

  try {
    const provider = await resolvePaymentProvider("pasha-ecomm") as PashaEcommProvider | null;
    if (!provider || !event) return redirect("verification-pending", payment.id);
    const completion = await provider.completeCheckout(providerOrderReference, clientIpAddress(request));
    const nextStatus = nextPashaPaymentStatus(payment.status, completion.paymentStatus);
    if (nextStatus !== payment.status) {
      const update: Record<string, unknown> = { status: nextStatus, failure_code: completion.safeFailureCode ?? null,
        updated_at: new Date().toISOString(), provider_event_at: new Date().toISOString(),
        provider_event_reference: eventReference };
      if (completion.providerPaymentReference) update.provider_payment_reference = completion.providerPaymentReference;
      if (nextStatus === "paid") update.paid_at = new Date().toISOString();
      const saved = await admin.schema("atsrs_private").from("atsrs_payment_transactions").update(update)
        .eq("id", payment.id).eq("status", payment.status).select("id").maybeSingle();
      if (saved.error || !saved.data) throw new Error("PAYMENT_STATE_RACE");
    }
    const finalStatus = isFinalPashaPaymentStatus(nextStatus);
    const finalized = await admin.schema("atsrs_private").from("atsrs_payment_webhook_events").update({
      status: finalStatus ? "processed" : "received", processed_at: new Date().toISOString(),
      last_error_code: finalStatus ? null : `PASHA_RESULT_${String(nextStatus).toUpperCase()}`,
    }).eq("id", event.id).eq("status", "received").select("id").maybeSingle();
    if (finalized.error || !finalized.data) throw new Error("CALLBACK_EVENT_FINALIZE_FAILED");
    await admin.schema("atsrs_private").from("atsrs_billing_audit_log").insert({
      action: "pasha_return_verified", entity_type: "payment", entity_reference: payment.id,
      safe_details: { status: nextStatus, event_reference: eventReference },
    });
    return redirect(callbackRedirectState(nextStatus), payment.id);
  } catch (error) {
    if (event) await admin.schema("atsrs_private").from("atsrs_payment_webhook_events").update({
      status: "failed", last_error_code: "PASHA_RESULT_VERIFICATION_FAILED", processed_at: new Date().toISOString(),
    }).eq("id", event.id).eq("status", "received");
    console.error("PAŞA result verification failed", error instanceof Error ? error.name : "UnknownError");
    return redirect("verification-pending", payment.id);
  }
});
