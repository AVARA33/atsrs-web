import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.55.0";
import { resolvePaymentProvider, sha256Hex } from "../_shared/payment-provider.ts";

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json(405, { error: "Method not allowed." });

  const providerKey = new URL(request.url).searchParams.get("provider")?.trim().toLowerCase() ?? "";
  const provider = resolvePaymentProvider(providerKey);
  if (!provider) return json(503, { error: "Payment provider is not connected." });

  const rawBody = new Uint8Array(await request.arrayBuffer());
  let event;
  try {
    // Signature verification happens before parsing, storing or acting on the event.
    event = await provider.verifyWebhook(rawBody, request.headers);
  } catch {
    return json(401, { error: "Invalid webhook signature." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceSecret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY") ?? "";
  if (!supabaseUrl || !serviceSecret) return json(503, { error: "Webhook storage is not configured." });
  const admin = createClient(supabaseUrl, serviceSecret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const payloadHash = await sha256Hex(rawBody);
  const stored = await admin.schema("atsrs_private").from("atsrs_payment_webhook_events").upsert({
    provider: provider.key,
    provider_event_reference: event.eventReference,
    payload_sha256: payloadHash,
    signature_verified: true,
    status: "received",
    attempt_count: 0,
  }, { onConflict: "provider,provider_event_reference", ignoreDuplicates: true });
  if (stored.error) {
    console.error("Unable to store billing webhook", stored.error.code);
    return json(500, { error: "Webhook could not be recorded." });
  }

  if (event.providerOrderReference && event.paymentStatus) {
    const update: Record<string, unknown> = {
      status: event.paymentStatus,
      updated_at: new Date().toISOString(),
    };
    if (event.providerPaymentReference) update.provider_payment_reference = event.providerPaymentReference;
    if (event.safeFailureCode) update.failure_code = event.safeFailureCode.slice(0, 120);
    if (event.paymentStatus === "paid") update.paid_at = new Date().toISOString();
    const payment = await admin.schema("atsrs_private").from("atsrs_payment_transactions")
      .update(update).eq("provider", provider.key)
      .eq("provider_order_reference", event.providerOrderReference);
    if (payment.error) {
      console.error("Unable to apply billing webhook", payment.error.code);
      return json(500, { error: "Webhook could not be applied." });
    }
  }

  await admin.schema("atsrs_private").from("atsrs_payment_webhook_events").update({
    status: "processed",
    processed_at: new Date().toISOString(),
    attempt_count: 1,
  }).eq("provider", provider.key).eq("provider_event_reference", event.eventReference);

  return json(200, { received: true });
});
