import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.55.0";

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function constantTimeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return difference === 0;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hasValidMetaSignature(
  bytes: Uint8Array,
  signatureHeader: string | null,
  appSecret: string,
): Promise<boolean> {
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, bytes);
  const expected = `sha256=${
    Array.from(new Uint8Array(signature))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
  }`;

  return constantTimeEqual(expected, signatureHeader);
}

function extractEventMetadata(payload: Record<string, unknown>) {
  const entry = Array.isArray(payload.entry) ? payload.entry[0] : undefined;
  const change =
    entry && typeof entry === "object" && Array.isArray(entry.changes)
      ? entry.changes[0]
      : undefined;
  const value =
    change && typeof change === "object" && change.value &&
      typeof change.value === "object"
      ? change.value as Record<string, unknown>
      : {};
  const metadata =
    value.metadata && typeof value.metadata === "object"
      ? value.metadata as Record<string, unknown>
      : {};
  const message = Array.isArray(value.messages) ? value.messages[0] : undefined;
  const status = Array.isArray(value.statuses) ? value.statuses[0] : undefined;
  const contact = Array.isArray(value.contacts) ? value.contacts[0] : undefined;

  const messageRecord =
    message && typeof message === "object"
      ? message as Record<string, unknown>
      : undefined;
  const statusRecord =
    status && typeof status === "object"
      ? status as Record<string, unknown>
      : undefined;
  const contactRecord =
    contact && typeof contact === "object"
      ? contact as Record<string, unknown>
      : undefined;

  const eventKind = messageRecord
    ? `message.${String(messageRecord.type ?? "unknown")}`
    : statusRecord
    ? `status.${String(statusRecord.status ?? "unknown")}`
    : "unknown";

  return {
    event_kind: eventKind,
    phone_number_id: typeof metadata.phone_number_id === "string"
      ? metadata.phone_number_id
      : null,
    message_id: typeof messageRecord?.id === "string"
      ? messageRecord.id
      : typeof statusRecord?.id === "string"
      ? statusRecord.id
      : null,
    wa_id: typeof contactRecord?.wa_id === "string"
      ? contactRecord.wa_id
      : typeof statusRecord?.recipient_id === "string"
      ? statusRecord.recipient_id
      : null,
  };
}

Deno.serve(async (request: Request) => {
  if (request.method === "GET") {
    const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
    if (!verifyToken) {
      return jsonResponse({ error: "Webhook verification is not configured" }, 503);
    }

    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (
      mode === "subscribe" &&
      token &&
      constantTimeEqual(token, verifyToken) &&
      challenge
    ) {
      return new Response(challenge, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    return jsonResponse({ error: "Webhook verification failed" }, 403);
  }

  if (request.method !== "POST") {
    return new Response(null, {
      status: 405,
      headers: { Allow: "GET, POST" },
    });
  }

  const appSecret = Deno.env.get("META_APP_SECRET");
  if (!appSecret) {
    return jsonResponse({ error: "Webhook signature verification is not configured" }, 503);
  }

  const rawBody = new Uint8Array(await request.arrayBuffer());
  const isValid = await hasValidMetaSignature(
    rawBody,
    request.headers.get("x-hub-signature-256"),
    appSecret,
  );
  if (!isValid) {
    return jsonResponse({ error: "Invalid webhook signature" }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(new TextDecoder().decode(rawBody));
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (payload.object !== "whatsapp_business_account") {
    return jsonResponse({ error: "Unsupported webhook object" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Webhook storage is not configured" }, 503);
  }

  const metadata = extractEventMetadata(payload);
  const dedupeKey = await sha256Hex(rawBody);
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase
    .from("whatsapp_webhook_events")
    .upsert(
      {
        dedupe_key: dedupeKey,
        ...metadata,
        payload,
      },
      { onConflict: "dedupe_key", ignoreDuplicates: true },
    );

  if (error) {
    console.error("Unable to store WhatsApp webhook event", error.code);
    return jsonResponse({ error: "Unable to store webhook event" }, 500);
  }

  return jsonResponse({ received: true }, 200);
});
