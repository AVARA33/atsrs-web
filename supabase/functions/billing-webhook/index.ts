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
  if (!event.providerOrderReference || !event.paymentStatus) {
    return json(400, { error: "Webhook event is incomplete." });
  }
  const occurredAt = event.occurredAt && !Number.isNaN(Date.parse(event.occurredAt))
    ? new Date(event.occurredAt).toISOString()
    : new Date().toISOString();
  const applied = await admin.schema("atsrs_private").rpc("atsrs_apply_verified_payment_event", {
    p_provider: provider.key,
    p_event_reference: event.eventReference,
    p_payload_sha256: payloadHash,
    p_event_at: occurredAt,
    p_order_reference: event.providerOrderReference,
    p_payment_reference: event.providerPaymentReference ?? null,
    p_status: event.paymentStatus,
    p_amount_minor: event.amountMinor ?? null,
    p_currency: event.currency?.toUpperCase() ?? null,
    p_safe_failure_code: event.safeFailureCode?.slice(0, 120) ?? null,
  });
  if (applied.error) {
    console.error("Unable to atomically apply billing webhook", applied.error.code);
    return json(500, { error: "Webhook could not be applied." });
  }
  const result = applied.data?.result ?? "unknown";
  if (result === "unmatched" || result === "mismatch") {
    return json(409, { received: true, result });
  }
  return json(200, { received: true, result });
});
