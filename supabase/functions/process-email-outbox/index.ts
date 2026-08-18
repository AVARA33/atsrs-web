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

type ExpiryNotification = {
  title?: string | null;
  body?: string | null;
  document_type?: string | null;
  expiry_date?: string | null;
  threshold_days?: number | null;
  days_remaining?: number | null;
  severity?: string | null;
};

function formatExpiryDate(value: string | null | undefined) {
  if (!value) return "Not provided";
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function expiryPresentation(notification: ExpiryNotification | null) {
  const rawDays = Number(notification?.days_remaining);
  const days = Number.isFinite(rawDays) ? rawDays : null;
  if (days !== null && days < 0) {
    const overdue = Math.abs(days);
    return {
      label: "Expired",
      timing: `${overdue} day${overdue === 1 ? "" : "s"} overdue`,
      accent: "#b91c1c",
      background: "#fef2f2",
    };
  }
  if (days === 0) {
    return {
      label: "Action required",
      timing: "Expiry date reached today",
      accent: "#dc2626",
      background: "#fef2f2",
    };
  }
  if (days !== null && days <= 30) {
    return {
      label: "Expiring soon",
      timing: `${days} day${days === 1 ? "" : "s"} remaining`,
      accent: "#d97706",
      background: "#fffbeb",
    };
  }
  return {
    label: "Advance notice",
    timing: days === null
      ? "Expiry reminder"
      : `${days} day${days === 1 ? "" : "s"} remaining`,
    accent: "#2563eb",
    background: "#eff6ff",
  };
}

function buildExpiryEmail(notification: ExpiryNotification | null) {
  const subject = notification?.title ?? "ATSRS document expiry reminder";
  const documentType = notification?.document_type ?? "Document";
  const expiryDate = formatExpiryDate(notification?.expiry_date);
  const presentation = expiryPresentation(notification);
  const summary = notification?.body ??
    `${documentType} has an expiry update in ATSRS.`;
  const appUrl = "https://atsrs.com";

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;background:#f3f6fa;font-family:Arial,sans-serif;color:#172033">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(documentType)} · ${escapeHtml(presentation.timing)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fa;padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden">
        <tr><td style="padding:22px 26px;background:#07111d;color:#ffffff">
          <div style="font-size:21px;font-weight:800;letter-spacing:.04em">ATSRS</div>
          <div style="margin-top:5px;color:#a9bdd3;font-size:13px">Document expiry notification</div>
        </td></tr>
        <tr><td style="padding:28px 26px">
          <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:${presentation.background};color:${presentation.accent};font-size:12px;font-weight:700">${escapeHtml(presentation.label)}</div>
          <h1 style="margin:18px 0 10px;font-size:24px;line-height:1.3;color:#111827">${escapeHtml(subject)}</h1>
          <p style="margin:0 0 22px;color:#526176;line-height:1.6">${escapeHtml(summary)}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:12px;border-collapse:separate;overflow:hidden">
            <tr><td style="padding:12px 14px;color:#64748b;border-bottom:1px solid #e2e8f0">Document</td><td align="right" style="padding:12px 14px;font-weight:700;border-bottom:1px solid #e2e8f0">${escapeHtml(documentType)}</td></tr>
            <tr><td style="padding:12px 14px;color:#64748b;border-bottom:1px solid #e2e8f0">Expiry date</td><td align="right" style="padding:12px 14px;font-weight:700;border-bottom:1px solid #e2e8f0">${escapeHtml(expiryDate)}</td></tr>
            <tr><td style="padding:12px 14px;color:#64748b;border-bottom:1px solid #e2e8f0">Time status</td><td align="right" style="padding:12px 14px;font-weight:700;color:${presentation.accent};border-bottom:1px solid #e2e8f0">${escapeHtml(presentation.timing)}</td></tr>
            <tr><td style="padding:12px 14px;color:#64748b">Status</td><td align="right" style="padding:12px 14px;font-weight:700">${escapeHtml(presentation.label)}</td></tr>
          </table>
          <p style="margin:24px 0 0"><a href="${appUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700">View document in ATSRS</a></p>
          <p style="margin:22px 0 0;color:#8290a3;font-size:12px;line-height:1.5">This automated reminder was sent because expiry notifications are enabled for your ATSRS workspace.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    subject,
    "",
    `Document: ${documentType}`,
    `Expiry date: ${expiryDate}`,
    `Time status: ${presentation.timing}`,
    `Status: ${presentation.label}`,
    "",
    "View document in ATSRS: https://atsrs.com",
  ].join("\n");

  return { subject, html, text };
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
    .select("id,user_id,attempts,notification:atsrs_notifications(title,body,document_type,expiry_date,threshold_days,days_remaining,severity)")
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
        : job.notification as ExpiryNotification | null;
      const emailContent = buildExpiryEmail(notification);

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
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
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
