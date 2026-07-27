import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.55.0";

const allowedOrigins = new Set(["https://atsrs.com", "https://www.atsrs.com"]);
const encoder = new TextEncoder();

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://atsrs.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function respond(req: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function clean(value: unknown, max = 80) {
  return String(value ?? "").trim().slice(0, max);
}

function e164(value: unknown) {
  const digits = clean(value).replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : "";
}

async function hashCode(id: string, code: string, pepper: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(`${id}:${code}:${pepper}`));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let i = 0; i < length; i += 1) {
    difference |= (left.charCodeAt(i) || 0) ^ (right.charCodeAt(i) || 0);
  }
  return difference === 0;
}

function variableCount(template: Record<string, unknown>) {
  const components = Array.isArray(template.components) ? template.components : [];
  const body = components.find((item) =>
    item && typeof item === "object" && String((item as Record<string, unknown>).type).toUpperCase() === "BODY"
  ) as Record<string, unknown> | undefined;
  const text = String(body?.text || "");
  return new Set(Array.from(text.matchAll(/\{\{(\d+)\}\}/g)).map((match) => match[1])).size;
}

async function approvedTemplate(token: string, wabaId: string) {
  const url = `https://graph.facebook.com/v25.0/${encodeURIComponent(wabaId)}/message_templates?status=APPROVED&limit=100&fields=name,status,category,language,components`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const payload = await response.json();
  if (!response.ok) throw new Error("Meta approved template list could not be read.");
  const templates = Array.isArray(payload.data) ? payload.data as Record<string, unknown>[] : [];
  return templates.find((item) => String(item.category).toUpperCase() === "AUTHENTICATION") ||
    templates.find((item) =>
      String(item.category).toUpperCase() === "UTILITY" && variableCount(item) === 1
    );
}

async function sendTemplate(
  token: string,
  phoneNumberId: string,
  destination: string,
  code: string,
  template: Record<string, unknown>,
) {
  const category = String(template.category).toUpperCase();
  const components: Record<string, unknown>[] = [{
    type: "body",
    parameters: [{ type: "text", text: code }],
  }];
  if (category === "AUTHENTICATION") {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: code }],
    });
  }
  const response = await fetch(
    `https://graph.facebook.com/v25.0/${encodeURIComponent(phoneNumberId)}/messages`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: destination.replace(/\D/g, ""),
        type: "template",
        template: {
          name: template.name,
          language: { code: template.language },
          components,
        },
      }),
    },
  );
  const payload = await response.json();
  if (!response.ok) {
    console.error("Meta OTP send failed", JSON.stringify(payload));
    throw new Error("WhatsApp verification message could not be sent.");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return respond(req, 405, { error: "Method not allowed." });

  const authorization = req.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return respond(req, 401, { error: "Please sign in again." });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const accessToken = authorization.slice(7);
  const authClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const userResult = await authClient.auth.getUser(accessToken);
  const user = userResult.data.user;
  if (!user) return respond(req, 401, { error: "Your session has expired. Please sign in again." });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const action = clean(body.action, 20);
  const kind = clean(body.kind, 20);
  if (!["mobile", "whatsapp"].includes(kind)) return respond(req, 400, { error: "Invalid verification type." });
  const profileResult = await admin.from("atsrs_talent_profiles")
    .select("phone_number,phone_verified,whatsapp_number,whatsapp_verified")
    .eq("user_id", user.id).maybeSingle();
  if (profileResult.error) return respond(req, 500, { error: "Profile could not be read." });
  const profile = profileResult.data;
  if (!profile) return respond(req, 400, { error: "Save your profile first." });
  const numberField = kind === "mobile" ? "phone_number" : "whatsapp_number";
  const verifiedField = kind === "mobile" ? "phone_verified" : "whatsapp_verified";
  const destination = e164(profile[numberField]);

  if (action === "status") {
    return respond(req, 200, {
      verified: Boolean(profile[verifiedField]),
      destination: destination ? destination.replace(/^(\+\d{3})\d+(....)$/, "$1••••$2") : "",
    });
  }
  if (!destination) return respond(req, 400, { error: "Enter and save a valid phone number first." });
  if (profile[verifiedField]) return respond(req, 200, { verified: true });

  if (action === "send") {
    const latest = await admin.from("whatsapp_verification_challenges")
      .select("resend_after").eq("user_id", user.id).eq("kind", kind)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (latest.data && Date.parse(latest.data.resend_after) > Date.now()) {
      return respond(req, 429, { error: "Please wait one minute before requesting another code." });
    }
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
    const id = crypto.randomUUID();
    const pepper = Deno.env.get("WHATSAPP_OTP_PEPPER") || Deno.env.get("META_APP_SECRET") || "";
    if (!pepper) return respond(req, 500, { error: "Verification service is not configured." });
    const insert = await admin.from("whatsapp_verification_challenges").insert({
      id,
      user_id: user.id,
      kind,
      destination_e164: destination,
      code_hash: await hashCode(id, code, pepper),
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      resend_after: new Date(Date.now() + 60 * 1000).toISOString(),
      attempts_left: 5,
    });
    if (insert.error) return respond(req, 500, { error: "Verification request could not be created." });
    try {
      const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN")!;
      const wabaId = Deno.env.get("WHATSAPP_WABA_ID")!;
      const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;
      const template = await approvedTemplate(token, wabaId);
      if (!template) throw new Error("No approved authentication template is available.");
      await sendTemplate(token, phoneNumberId, destination, code, template);
    } catch (error) {
      await admin.from("whatsapp_verification_challenges").delete().eq("id", id);
      console.error(error);
      return respond(req, 502, { error: error instanceof Error ? error.message : "Code could not be sent." });
    }
    return respond(req, 200, { sent: true, expires_in: 600 });
  }

  if (action === "confirm") {
    const code = clean(body.code, 6).replace(/\D/g, "");
    if (code.length !== 6) return respond(req, 400, { error: "Enter the 6-digit code." });
    const challengeResult = await admin.from("whatsapp_verification_challenges")
      .select("*").eq("user_id", user.id).eq("kind", kind).is("verified_at", null)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    const challenge = challengeResult.data;
    if (!challenge || Date.parse(challenge.expires_at) <= Date.now()) {
      return respond(req, 400, { error: "This code has expired. Request a new code." });
    }
    if (challenge.destination_e164 !== destination) {
      return respond(req, 400, { error: "The saved number changed. Request a new code." });
    }
    if (challenge.attempts_left <= 0) return respond(req, 429, { error: "Too many attempts. Request a new code." });
    const pepper = Deno.env.get("WHATSAPP_OTP_PEPPER") || Deno.env.get("META_APP_SECRET") || "";
    const valid = constantTimeEqual(challenge.code_hash, await hashCode(challenge.id, code, pepper));
    if (!valid) {
      await admin.from("whatsapp_verification_challenges")
        .update({ attempts_left: challenge.attempts_left - 1 }).eq("id", challenge.id);
      return respond(req, 400, { error: "The code is incorrect." });
    }
    const now = new Date().toISOString();
    const update = await admin.from("atsrs_talent_profiles")
      .update({ [verifiedField]: true, updated_at: now })
      .eq("user_id", user.id).eq(numberField, destination)
      .select("user_id").maybeSingle();
    if (update.error || !update.data) return respond(req, 500, { error: "Verification could not be saved." });
    await admin.from("whatsapp_verification_challenges").update({ verified_at: now }).eq("id", challenge.id);
    return respond(req, 200, { verified: true });
  }

  return respond(req, 400, { error: "Unknown action." });
});
