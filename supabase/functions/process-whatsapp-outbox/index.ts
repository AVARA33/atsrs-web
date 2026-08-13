import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.55.0";

const maxAttempts = 5;
const staleProcessingMinutes = 15;

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function secretKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}") as Record<string, unknown>;
    return typeof keys.default === "string"
      ? keys.default
      : Object.values(keys).find((value): value is string => typeof value === "string" && Boolean(value)) || null;
  } catch {
    return null;
  }
}

function formatDate(value: unknown) {
  const input = String(value || "").slice(0, 10);
  const date = new Date(`${input}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? input || "Not provided" : new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
  }).format(date);
}

function timing(value: unknown) {
  const days = Number(value);
  if (!Number.isFinite(days)) return "Expiry reminder";
  if (days < 0) return `Expired ${Math.abs(days)} day${days === -1 ? "" : "s"} ago`;
  if (days === 0) return "Expires today";
  return `${days} day${days === 1 ? "" : "s"} remaining`;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = secretKey();
  if (!supabaseUrl || !serviceRoleKey) return json(500, { error: "Supabase server configuration is missing" });

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const authorization = request.headers.get("Authorization") || "";
  const apiKey = request.headers.get("apikey") || "";
  if (authorization !== `Bearer ${serviceRoleKey}` && apiKey !== serviceRoleKey) {
    const workerToken = request.headers.get("x-atsrs-cron-token") || "";
    if (!workerToken) return json(403, { error: "Forbidden" });
    const result = await supabase.rpc("atsrs_verify_whatsapp_worker_token", { p_token: workerToken });
    if (result.error || result.data !== true) return json(403, { error: "Forbidden" });
  }

  // Do not reveal provider state or touch queued jobs until the caller is authenticated.
  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const templateName = Deno.env.get("WHATSAPP_EXPIRY_TEMPLATE_NAME");
  const templateLanguage = Deno.env.get("WHATSAPP_EXPIRY_TEMPLATE_LANGUAGE") || "en";
  if (!token || !phoneNumberId || !templateName) {
    return json(503, {
      error: "WhatsApp provider is not configured",
      requiredSecrets: ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_EXPIRY_TEMPLATE_NAME"],
    });
  }

  const now = new Date().toISOString();
  const staleBefore = new Date(Date.now() - staleProcessingMinutes * 60_000).toISOString();
  const recovered = await supabase.from("atsrs_notification_outbox").update({
    status: "pending", available_at: now,
    last_error: "Recovered after an interrupted WhatsApp worker run", updated_at: now,
  }).eq("channel", "whatsapp").eq("status", "processing").lt("updated_at", staleBefore)
    .lt("attempts", maxAttempts).select("id");
  if (recovered.error) return json(500, { error: recovered.error.message });

  const jobsResult = await supabase.from("atsrs_notification_outbox")
    .select("id,user_id,account_type,attempts,notification:atsrs_notifications(document_type,expiry_date,days_remaining)")
    .eq("channel", "whatsapp").in("status", ["pending", "failed"]).lte("available_at", now)
    .lt("attempts", maxAttempts).order("created_at", { ascending: true }).limit(20);
  if (jobsResult.error) return json(500, { error: jobsResult.error.message });

  let sent = 0, failed = 0, skipped = 0;
  for (const job of jobsResult.data || []) {
    const claimed = await supabase.from("atsrs_notification_outbox").update({
      status: "processing", attempts: Number(job.attempts || 0) + 1, updated_at: new Date().toISOString(),
    }).eq("id", job.id).in("status", ["pending", "failed"]).lt("attempts", maxAttempts).select("id").maybeSingle();
    if (claimed.error || !claimed.data) continue;

    try {
      const preference = await supabase.from("atsrs_notification_preferences")
        .select("whatsapp_phone_e164").eq("user_id", job.user_id).eq("account_type", job.account_type)
        .eq("whatsapp_enabled", true).maybeSingle();
      const destination = String(preference.data?.whatsapp_phone_e164 || "");
      if (preference.error || !/^\+[1-9]\d{7,14}$/.test(destination)) {
        await supabase.from("atsrs_notification_outbox").update({
          status: "skipped", last_error: "WhatsApp reminders are not enabled", updated_at: new Date().toISOString(),
        }).eq("id", job.id);
        skipped += 1;
        continue;
      }

      const verified = await supabase.from("atsrs_talent_profiles").select("user_id")
        .eq("user_id", job.user_id).eq("whatsapp_number", destination).eq("whatsapp_verified", true).maybeSingle();
      if (verified.error || !verified.data) {
        await supabase.from("atsrs_notification_outbox").update({
          status: "skipped", last_error: "Verified WhatsApp number is unavailable", updated_at: new Date().toISOString(),
        }).eq("id", job.id);
        skipped += 1;
        continue;
      }

      const notification = Array.isArray(job.notification) ? job.notification[0] : job.notification;
      const response = await fetch(`https://graph.facebook.com/v25.0/${encodeURIComponent(phoneNumberId)}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp", to: destination.replace(/\D/g, ""), type: "template",
          template: {
            name: templateName, language: { code: templateLanguage }, components: [{
              type: "body", parameters: [
                { type: "text", text: String(notification?.document_type || "Document").slice(0, 80) },
                { type: "text", text: formatDate(notification?.expiry_date) },
                { type: "text", text: timing(notification?.days_remaining) },
              ],
            }],
          },
        }),
      });
      if (!response.ok) throw new Error(`Meta ${response.status}: ${(await response.text()).slice(0, 500)}`);
      const update = await supabase.from("atsrs_notification_outbox").update({
        status: "sent", sent_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString(),
      }).eq("id", job.id);
      if (update.error) throw update.error;
      sent += 1;
    } catch (error) {
      const attempts = Number(job.attempts || 0) + 1;
      await supabase.from("atsrs_notification_outbox").update({
        status: attempts >= maxAttempts ? "failed" : "pending",
        available_at: new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000).toISOString(),
        last_error: String(error instanceof Error ? error.message : error).slice(0, 1000),
        updated_at: new Date().toISOString(),
      }).eq("id", job.id);
      failed += 1;
    }
  }

  return json(200, { recovered: recovered.data?.length || 0, processed: jobsResult.data?.length || 0, sent, failed, skipped });
});
