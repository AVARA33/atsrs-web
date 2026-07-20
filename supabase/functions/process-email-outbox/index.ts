import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.55.0";

const jsonHeaders = { "Content-Type": "application/json" };
const maxAttempts = 5;
const staleProcessingMinutes = 15;

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function getSupabaseSecretKey() {
  const legacyKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacyKey) return legacyKey;

  const secretKeysJson = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!secretKeysJson) return null;

  try {
    const secretKeys = JSON.parse(secretKeysJson) as Record<string, unknown>;
    const defaultKey = secretKeys.default;
    if (typeof defaultKey === "string" && defaultKey) return defaultKey;

    const firstKey = Object.values(secretKeys).find(
      (value): value is string => typeof value === "string" && Boolean(value),
    );
    return firstKey ?? null;
  } catch {
    return null;
  }
}

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = getSupabaseSecretKey();
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const emailFrom = Deno.env.get("ATSRS_EMAIL_FROM");

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: "Supabase server configuration is missing" });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const authorization = request.headers.get("Authorization") ?? "";
  const apiKey = request.headers.get("apikey") ?? "";
  const requiresWorkerToken =
    authorization !== `Bearer ${serviceRoleKey}` &&
    apiKey !== serviceRoleKey;

  if (requiresWorkerToken) {
    const workerToken = request.headers.get("x-atsrs-cron-token") ?? "";
    if (!workerToken) return json(403, { error: "Forbidden" });

    const { data: tokenIsValid, error: tokenError } = await supabase.rpc(
      "atsrs_verify_email_worker_token",
      { p_token: workerToken },
    );
    if (tokenError || tokenIsValid !== true) {
      return json(403, { error: "Forbidden" });
    }
  }

  // Do not touch queued jobs until the production email provider is configured.
  if (!resendApiKey || !emailFrom) {
    return json(503, {
      error: "Email provider is not configured",
      requiredSecrets: ["RESEND_API_KEY", "ATSRS_EMAIL_FROM"],
    });
  }

  const staleBefore = new Date(
    Date.now() - staleProcessingMinutes * 60_000,
  ).toISOString();
  const { data: recoveredJobs, error: recoveryError } = await supabase
    .from("atsrs_notification_outbox")
    .update({
      status: "pending",
      available_at: new Date().toISOString(),
      last_error: "Recovered after an interrupted email worker run",
      updated_at: new Date().toISOString(),
    })
    .eq("channel", "email")
    .eq("status", "processing")
    .lt("updated_at", staleBefore)
    .lt("attempts", maxAttempts)
    .select("id");

  if (recoveryError) return json(500, { error: recoveryError.message });

  const { data: jobs, error: jobsError } = await supabase
    .from("atsrs_notification_outbox")
    .select("id,user_id,attempts,notification:atsrs_notifications(title,body)")
    .eq("channel", "email")
    .in("status", ["pending", "failed"])
    .lte("available_at", new Date().toISOString())
    .lt("attempts", maxAttempts)
    .order("created_at", { ascending: true })
    .limit(20);

  if (jobsError) return json(500, { error: jobsError.message });

  let sent = 0;
  let failed = 0;

  for (const job of jobs ?? []) {
    const claimedAt = new Date().toISOString();
    const { data: claimed, error: claimError } = await supabase
      .from("atsrs_notification_outbox")
      .update({
        status: "processing",
        attempts: Number(job.attempts ?? 0) + 1,
        updated_at: claimedAt,
      })
      .eq("id", job.id)
      .in("status", ["pending", "failed"])
      .lt("attempts", maxAttempts)
      .select("id")
      .maybeSingle();

    if (claimError || !claimed) continue;

    try {
      const { data: userResult, error: userError } =
        await supabase.auth.admin.getUserById(job.user_id);
      const email = userResult?.user?.email;
      if (userError || !email) throw new Error(userError?.message ?? "User email not found");

      const notification = Array.isArray(job.notification)
        ? job.notification[0]
        : job.notification;
      const subject = notification?.title ?? "ATSRS document reminder";
      const message = notification?.body ?? "You have a document expiry reminder in ATSRS.";

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `atsrs-notification-${job.id}`,
        },
        body: JSON.stringify({
          from: emailFrom,
          to: [email],
          subject,
          html: `<div style="font-family:Arial,sans-serif;line-height:1.55;color:#111827"><h2 style="margin:0 0 16px">ATSRS</h2><h3>${escapeHtml(subject)}</h3><p>${escapeHtml(message)}</p><p><a href="https://atsrs.com">Open ATSRS</a></p></div>`,
        }),
      });

      if (!response.ok) {
        const providerMessage = await response.text();
        throw new Error(`Resend ${response.status}: ${providerMessage.slice(0, 500)}`);
      }

      const { error: sentUpdateError } = await supabase
        .from("atsrs_notification_outbox")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      if (sentUpdateError) throw sentUpdateError;
      sent += 1;
    } catch (error) {
      const attempts = Number(job.attempts ?? 0) + 1;
      const terminal = attempts >= maxAttempts;
      const retryAt = new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000);
      await supabase
        .from("atsrs_notification_outbox")
        .update({
          status: terminal ? "failed" : "pending",
          available_at: retryAt.toISOString(),
          last_error: String(error instanceof Error ? error.message : error).slice(0, 1000),
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      failed += 1;
    }
  }

  return json(200, {
    recovered: recoveredJobs?.length ?? 0,
    processed: (jobs ?? []).length,
    sent,
    failed,
  });
});
