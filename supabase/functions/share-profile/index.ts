import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.55.0";

const FILE_BUCKET = "atsrs-user-files";
const SITE_URL = "https://atsrs.com";
const PREVIEW_URL_SECONDS = 300;
const DOWNLOAD_URL_SECONDS = 1800;
const OTP_TTL_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;
const MAX_SHARED_FILES = 50;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,128}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type JsonObject = Record<string, unknown>;
type AdminClient = ReturnType<typeof createClient>;
type ShareRow = {
  id: string;
  user_id: string;
  account_type: string;
  token_hash: string;
  token_hint: string;
  selected_file_ids: string[];
  enabled: boolean;
  expires_at: string | null;
  view_count: number | string;
  last_viewed_at: string | null;
  created_at: string;
  updated_at: string;
};
type AccessRequestRow = {
  id: string;
  share_id: string;
  share_token_hash: string;
  owner_id: string;
  requester_name: string;
  requester_company: string;
  requester_email: string;
  requester_user_id: string | null;
  requested_file_ids: string[];
  revoked_file_ids: string[];
  request_all: boolean;
  status: string;
  otp_hash: string | null;
  otp_expires_at: string | null;
  otp_attempts: number;
  email_verified_at: string | null;
  viewer_token_hash: string | null;
  viewer_token_expires_at: string | null;
  access_expires_at: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
};

const SHARE_SELECT = "id,user_id,account_type,token_hash,token_hint,selected_file_ids,enabled,expires_at,view_count,last_viewed_at,created_at,updated_at";
const REQUEST_SELECT = "id,share_id,share_token_hash,owner_id,requester_name,requester_company,requester_email,requester_user_id,requested_file_ids,revoked_file_ids,request_all,status,otp_hash,otp_expires_at,otp_attempts,email_verified_at,viewer_token_hash,viewer_token_expires_at,access_expires_at,decided_at,created_at,updated_at";

function getSupabaseSecretKey() {
  const legacyKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacyKey) return legacyKey;
  const secretKeysJson = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!secretKeysJson) return null;
  try {
    const secretKeys = JSON.parse(secretKeysJson) as Record<string, unknown>;
    const defaultKey = secretKeys.default;
    if (typeof defaultKey === "string" && defaultKey) return defaultKey;
    return Object.values(secretKeys).find(
      (value): value is string => typeof value === "string" && Boolean(value),
    ) ?? null;
  } catch {
    return null;
  }
}

function allowedOrigin(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  if (!origin) return SITE_URL;
  if (origin === SITE_URL || origin === "https://www.atsrs.com") return origin;
  if (/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) return origin;
  return null;
}

function responseHeaders(req: Request) {
  return {
    "Access-Control-Allow-Origin": allowedOrigin(req) ?? SITE_URL,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-atsrs-viewer-token, x-atsrs-requester-account",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
    "Referrer-Policy": "no-referrer",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
  };
}

function json(req: Request, status: number, body: JsonObject) {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(req) });
}

function randomToken(bytesLength = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(bytesLength));
  let binary = "";
  bytes.forEach((value) => binary += String.fromCharCode(value));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomOtp() {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return String(value).padStart(6, "0");
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeText(value: unknown, maxLength = 180) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function safeEmail(value: unknown) {
  const email = safeText(value, 254).toLowerCase();
  return EMAIL_PATTERN.test(email) ? email : "";
}

function uniqueFileIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value.filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => UUID_PATTERN.test(item)),
  )).slice(0, MAX_SHARED_FILES);
}

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] ?? char);
}

function shareIsActive(share: ShareRow | null) {
  return Boolean(
    share?.enabled && share.expires_at && new Date(share.expires_at).getTime() > Date.now(),
  );
}

function publicShareStatus(row: ShareRow | null) {
  if (!row) return null;
  return {
    id: row.id,
    active: shareIsActive(row),
    token_hint: row.token_hint,
    selected_file_ids: row.selected_file_ids ?? [],
    expires_at: row.expires_at,
    view_count: Number(row.view_count ?? 0),
    last_viewed_at: row.last_viewed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function publicRequestStatus(row: AccessRequestRow) {
  return {
    id: row.id,
    requester_name: row.requester_name,
    requester_company: row.requester_company,
    requester_email: row.requester_email,
    requested_file_ids: row.requested_file_ids ?? [],
    revoked_file_ids: row.revoked_file_ids ?? [],
    request_all: Boolean(row.request_all),
    status: row.status,
    email_verified_at: row.email_verified_at,
    access_expires_at: row.access_expires_at,
    decided_at: row.decided_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function corporateRequesterId(req: Request, admin: AdminClient) {
  if ((req.headers.get("x-atsrs-requester-account") ?? "").toLowerCase() !== "company") return null;
  const user = await authenticatedUser(admin, req);
  if (!user) return null;
  const workspace = await admin.from("atsrs_workspaces").select("user_id")
    .eq("user_id", user.id).eq("account_type", "company").maybeSingle();
  if (workspace.error) throw workspace.error;
  return workspace.data ? user.id : null;
}

function parseWorkspaceValue(payload: unknown) {
  if (!payload || typeof payload !== "object") return {};
  const value = (payload as JsonObject).value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" ? value : {};
}

function documentDetails(file: JsonObject) {
  const metadata = file.metadata && typeof file.metadata === "object" ? file.metadata as JsonObject : {};
  const document = metadata.document && typeof metadata.document === "object" ? metadata.document as JsonObject : {};
  const category = safeText(file.category, 40) || "document";
  const fileName = safeText(file.file_name, 180) || "ATSRS document";
  return {
    id: safeText(file.id, 40),
    category,
    file_name: fileName,
    document_type: safeText(document.type, 120) || (category === "cv" ? "Curriculum Vitae" : fileName),
    provider: safeText(document.provider, 160),
    issue_date: safeText(document.issue, 20),
    expiry_date: safeText(document.expiry, 20),
    uploaded_at: safeText(file.created_at, 40),
    mime_type: safeText(file.mime_type, 120),
    size_bytes: Number(file.size_bytes ?? 0),
  };
}

async function authenticatedUser(admin: AdminClient, req: Request) {
  const authorization = req.headers.get("authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return null;
  const token = authorization.slice(7).trim();
  if (!token) return null;
  const result = await admin.auth.getUser(token);
  return result.error ? null : result.data.user ?? null;
}

async function loadShareByToken(admin: AdminClient, token: string) {
  if (!TOKEN_PATTERN.test(token)) return null;
  const tokenHash = await sha256Hex(token);
  const result = await admin.from("atsrs_profile_shares").select(SHARE_SELECT)
    .eq("token_hash", tokenHash).eq("enabled", true).maybeSingle();
  if (result.error) throw result.error;
  const share = result.data as ShareRow | null;
  return shareIsActive(share) ? share : null;
}

function requestedFiles(share: ShareRow, value: unknown, requestAll: boolean) {
  const shared = uniqueFileIds(share.selected_file_ids);
  if (requestAll) return shared;
  const requested = uniqueFileIds(value);
  const allowed = new Set(shared);
  return requested.filter((id) => allowed.has(id));
}

async function insertEvent(
  admin: AdminClient,
  share: ShareRow,
  eventType: string,
  values: { request_id?: string | null; file_id?: string | null; event_data?: JsonObject } = {},
) {
  const result = await admin.from("atsrs_share_events").insert({
    share_id: share.id,
    owner_id: share.user_id,
    request_id: values.request_id ?? null,
    file_id: values.file_id ?? null,
    event_type: eventType,
    event_data: values.event_data ?? {},
  });
  if (result.error) console.warn("ATSRS share event skipped", result.error);
}

async function sendEmail(to: string, subject: string, html: string, text: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("ATSRS_EMAIL_FROM") || "ATSRS <notifications@notify.atsrs.com>";
  if (!apiKey) throw new Error("Email delivery is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Email delivery failed (${response.status}): ${message.slice(0, 180)}`);
  }
}

async function notifyOwner(admin: AdminClient, row: AccessRequestRow) {
  const owner = await admin.auth.admin.getUserById(row.owner_id);
  const email = owner.data.user?.email;
  if (!email) return;
  const files = await admin.from("atsrs_files").select("id,file_name,category,metadata")
    .eq("user_id", row.owner_id).in("id", row.requested_file_ids);
  const names = (files.data ?? []).map((file) => documentDetails(file as JsonObject).document_type);
  const documents = row.request_all
    ? `All shared files${names.length ? `: ${names.join(", ")}` : ""}`
    : (names.join(", ") || `${row.requested_file_ids.length} file(s)`);
  await sendEmail(
    email,
    `ATSRS download request from ${row.requester_name}`,
    `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#172033"><h2>New file access request</h2><p><b>${escapeHtml(row.requester_name)}</b> from <b>${escapeHtml(row.requester_company)}</b> verified <b>${escapeHtml(row.requester_email)}</b> and requested download access.</p><p><b>Requested:</b> ${escapeHtml(documents)}</p><p><a href="${SITE_URL}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#2563eb;color:#fff;text-decoration:none;font-weight:700">Review in ATSRS Dashboard</a></p><p style="color:#64748b;font-size:12px">No download is possible until you approve this request.</p></div>`,
    `New ATSRS request from ${row.requester_name} (${row.requester_company}, ${row.requester_email}). Requested: ${documents}. Review it in your ATSRS Dashboard.`,
  );
}

async function notifyDecision(row: AccessRequestRow, approved: boolean) {
  const subject = approved ? "Your ATSRS download request was approved" : "Your ATSRS download request was declined";
  const timing = approved && row.access_expires_at
    ? `Download access is available until ${new Date(row.access_expires_at).toUTCString()}, and never beyond the original share-link expiry.`
    : "The profile owner did not grant download access for this request.";
  await sendEmail(
    row.requester_email,
    subject,
    `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#172033"><h2>${approved ? "Download access approved" : "Request update"}</h2><p>Hello ${escapeHtml(row.requester_name)},</p><p>${escapeHtml(timing)}</p>${approved ? `<p>Open the original ATSRS profile link in the same browser and select Download.</p>` : ""}<p style="color:#64748b;font-size:12px">ATSRS never sends document attachments by email.</p></div>`,
    `${approved ? "Approved." : "Declined."} ${timing}${approved ? " Open the original ATSRS profile link in the same browser." : ""}`,
  );
}

function parseExpiry(value: unknown) {
  const raw = safeText(value, 40);
  const date = new Date(raw);
  const time = date.getTime();
  const now = Date.now();
  if (!raw || Number.isNaN(time) || time < now + 10 * 60 * 1000 || time > now + 366 * 86400000) return null;
  return date.toISOString();
}

async function ownerRequest(req: Request, admin: AdminClient, body: JsonObject) {
  const user = await authenticatedUser(admin, req);
  if (!user) return json(req, 401, { error: "Authentication required." });
  const action = safeText(body.action, 40);
  const existingResult = await admin.from("atsrs_profile_shares").select(SHARE_SELECT)
    .eq("user_id", user.id).eq("account_type", "personal").maybeSingle();
  if (existingResult.error) throw existingResult.error;
  const existing = existingResult.data as ShareRow | null;

  if (action === "status") return json(req, 200, { share: publicShareStatus(existing) });

  if (action === "list_sent_requests") {
    const workspace = await admin.from("atsrs_workspaces").select("user_id")
      .eq("user_id", user.id).eq("account_type", "company").maybeSingle();
    if (workspace.error) throw workspace.error;
    if (!workspace.data) return json(req, 403, { error: "A Corporate workspace is required." });

    const requestsResult = await admin.from("atsrs_share_access_requests").select(REQUEST_SELECT)
      .eq("requester_user_id", user.id).not("email_verified_at", "is", null)
      .order("created_at", { ascending: false }).limit(100);
    if (requestsResult.error) throw requestsResult.error;
    const requestRows = (requestsResult.data ?? []) as AccessRequestRow[];
    const ownerIds = Array.from(new Set(requestRows.map((row) => row.owner_id)));
    const fileIds = Array.from(new Set(requestRows.flatMap((row) => row.requested_file_ids ?? [])));
    const profilesByOwner = new Map<string, JsonObject>();
    const filesById = new Map<string, JsonObject>();

    if (ownerIds.length) {
      const profiles = await admin.from("atsrs_workspace_data").select("user_id,data_key,payload")
        .in("user_id", ownerIds).eq("account_type", "personal");
      if (profiles.error) throw profiles.error;
      (profiles.data ?? []).forEach((row) => {
        if (!String(row.data_key ?? "").endsWith("_personal_profile")) return;
        profilesByOwner.set(String(row.user_id), parseWorkspaceValue(row.payload) as JsonObject);
      });
    }
    if (fileIds.length) {
      const files = await admin.from("atsrs_files")
        .select("id,user_id,category,file_name,metadata").in("id", fileIds);
      if (files.error) throw files.error;
      (files.data ?? []).forEach((file) => filesById.set(String(file.id), file as JsonObject));
    }

    return json(req, 200, {
      requests: requestRows.map((row) => {
        const profile = profilesByOwner.get(row.owner_id) ?? {};
        return {
          ...publicRequestStatus(row),
          owner_name: [safeText(profile.name, 100), safeText(profile.surname, 100)].filter(Boolean).join(" ")
            || "ATSRS profile owner",
          owner_position: safeText(profile.position, 140),
          requested_files: (row.requested_file_ids ?? []).map((id) => {
            const file = filesById.get(id);
            return file ? documentDetails(file) : { id, document_type: "Shared document" };
          }),
        };
      }),
    });
  }

  if (action === "list_requests") {
    const requestsResult = await admin.from("atsrs_share_access_requests").select(REQUEST_SELECT)
      .eq("owner_id", user.id).order("created_at", { ascending: false }).limit(100);
    if (requestsResult.error) throw requestsResult.error;
    const eventsResult = await admin.from("atsrs_share_events").select("event_type,created_at,file_id,request_id")
      .eq("owner_id", user.id).order("created_at", { ascending: false }).limit(500);
    if (eventsResult.error) throw eventsResult.error;
    const counts: Record<string, number> = {};
    const downloadsByRequest: Record<string, number> = {};
    const downloadedFilesByRequest: Record<string, string[]> = {};
    const previewsByFile: Record<string, number> = {};
    (eventsResult.data ?? []).forEach((event) => {
      const type = String(event.event_type ?? "");
      counts[type] = (counts[type] ?? 0) + 1;
      if (type === "document_downloaded" && event.request_id) {
        const requestId = String(event.request_id);
        downloadsByRequest[requestId] = (downloadsByRequest[requestId] ?? 0) + 1;
        if (event.file_id) downloadedFilesByRequest[requestId] = [
          ...(downloadedFilesByRequest[requestId] ?? []),
          String(event.file_id),
        ];
      }
      if (type === "document_previewed" && event.file_id) {
        const fileId = String(event.file_id);
        previewsByFile[fileId] = (previewsByFile[fileId] ?? 0) + 1;
      }
    });
    return json(req, 200, {
      requests: (requestsResult.data ?? []).map((row) => ({
        ...publicRequestStatus(row as AccessRequestRow),
        download_count: downloadsByRequest[String(row.id)] ?? 0,
        downloaded_file_ids: downloadedFilesByRequest[String(row.id)] ?? [],
      })),
      analytics: {
        link_opened: counts.link_opened ?? Number(existing?.view_count ?? 0),
        document_previewed: counts.document_previewed ?? 0,
        download_requested: counts.download_requested ?? 0,
        document_downloaded: counts.document_downloaded ?? 0,
        previewed_files: Object.entries(previewsByFile).map(([file_id, count]) => ({ file_id, count })),
      },
    });
  }

  if (action === "revoke") {
    if (!existing) return json(req, 200, { share: null });
    const now = new Date().toISOString();
    const update = await admin.from("atsrs_profile_shares")
      .update({ enabled: false, updated_at: now }).eq("id", existing.id).eq("user_id", user.id)
      .select(SHARE_SELECT).single();
    if (update.error) throw update.error;
    await admin.from("atsrs_share_access_requests")
      .update({ status: "expired", access_expires_at: null, updated_at: now })
      .eq("share_id", existing.id).in("status", ["otp_pending", "pending", "approved"]);
    return json(req, 200, { share: publicShareStatus(update.data as ShareRow) });
  }

  if (action === "decide_request") {
    const requestId = safeText(body.request_id, 40);
    const decision = safeText(body.decision, 20);
    if (!UUID_PATTERN.test(requestId) || !["approve", "decline"].includes(decision)) {
      return json(req, 400, { error: "Invalid access decision." });
    }
    const requestResult = await admin.from("atsrs_share_access_requests").select(REQUEST_SELECT)
      .eq("id", requestId).eq("owner_id", user.id).eq("status", "pending").maybeSingle();
    if (requestResult.error) throw requestResult.error;
    const accessRequest = requestResult.data as AccessRequestRow | null;
    if (!accessRequest) return json(req, 404, { error: "Pending request was not found." });
    const shareResult = await admin.from("atsrs_profile_shares").select(SHARE_SELECT)
      .eq("id", accessRequest.share_id).eq("user_id", user.id).maybeSingle();
    if (shareResult.error) throw shareResult.error;
    const share = shareResult.data as ShareRow | null;
    if (decision === "approve" && !shareIsActive(share)) {
      return json(req, 409, { error: "The share link has expired. This request can no longer be approved." });
    }
    const now = new Date();
    const accessExpires = decision === "approve"
      ? new Date(Math.min(now.getTime() + DOWNLOAD_URL_SECONDS * 1000, new Date(share!.expires_at!).getTime())).toISOString()
      : null;
    const status = decision === "approve" ? "approved" : "declined";
    const update = await admin.from("atsrs_share_access_requests").update({
      status, access_expires_at: accessExpires, decided_at: now.toISOString(), updated_at: now.toISOString(),
    }).eq("id", accessRequest.id).eq("owner_id", user.id).select(REQUEST_SELECT).single();
    if (update.error) throw update.error;
    const updated = update.data as AccessRequestRow;
    if (share) await insertEvent(admin, share, decision === "approve" ? "request_approved" : "request_declined", { request_id: updated.id });
    try { await notifyDecision(updated, decision === "approve"); } catch (error) { console.warn("ATSRS decision email skipped", error); }
    return json(req, 200, { request: publicRequestStatus(updated) });
  }

  if (action === "revoke_request_access") {
    const requestId = safeText(body.request_id, 40);
    if (!UUID_PATTERN.test(requestId)) return json(req, 400, { error: "Invalid access request." });
    const requestResult = await admin.from("atsrs_share_access_requests").select(REQUEST_SELECT)
      .eq("id", requestId).eq("owner_id", user.id).eq("status", "approved").maybeSingle();
    if (requestResult.error) throw requestResult.error;
    const accessRequest = requestResult.data as AccessRequestRow | null;
    if (!accessRequest) return json(req, 404, { error: "Active access was not found." });
    const now = new Date().toISOString();
    const update = await admin.from("atsrs_share_access_requests").update({
      status: "expired", access_expires_at: null, updated_at: now,
    }).eq("id", accessRequest.id).eq("owner_id", user.id).eq("status", "approved")
      .select(REQUEST_SELECT).single();
    if (update.error) throw update.error;
    const shareResult = await admin.from("atsrs_profile_shares").select(SHARE_SELECT)
      .eq("id", accessRequest.share_id).eq("user_id", user.id).maybeSingle();
    if (shareResult.error) throw shareResult.error;
    const share = shareResult.data as ShareRow | null;
    if (share) await insertEvent(admin, share, "access_revoked", { request_id: accessRequest.id });
    return json(req, 200, { request: publicRequestStatus(update.data as AccessRequestRow) });
  }

  if (action === "revoke_document_access") {
    const requestId = safeText(body.request_id, 40);
    const fileId = safeText(body.file_id, 40);
    if (!UUID_PATTERN.test(requestId) || !UUID_PATTERN.test(fileId)) {
      return json(req, 400, { error: "Invalid document access request." });
    }
    const requestResult = await admin.from("atsrs_share_access_requests").select(REQUEST_SELECT)
      .eq("id", requestId).eq("owner_id", user.id).eq("status", "approved").maybeSingle();
    if (requestResult.error) throw requestResult.error;
    const accessRequest = requestResult.data as AccessRequestRow | null;
    if (!accessRequest || !uniqueFileIds(accessRequest.requested_file_ids).includes(fileId)) {
      return json(req, 404, { error: "Active document access was not found." });
    }
    const revoked = uniqueFileIds([...(accessRequest.revoked_file_ids ?? []), fileId]);
    const remaining = uniqueFileIds(accessRequest.requested_file_ids).filter((id) => !revoked.includes(id));
    const now = new Date().toISOString();
    const update = await admin.from("atsrs_share_access_requests").update({
      revoked_file_ids: revoked,
      status: remaining.length ? "approved" : "expired",
      access_expires_at: remaining.length ? accessRequest.access_expires_at : null,
      updated_at: now,
    }).eq("id", accessRequest.id).eq("owner_id", user.id).eq("status", "approved")
      .select(REQUEST_SELECT).single();
    if (update.error) throw update.error;
    const shareResult = await admin.from("atsrs_profile_shares").select(SHARE_SELECT)
      .eq("id", accessRequest.share_id).eq("user_id", user.id).maybeSingle();
    if (shareResult.error) throw shareResult.error;
    const share = shareResult.data as ShareRow | null;
    if (share) await insertEvent(admin, share, "document_access_revoked", {
      request_id: accessRequest.id, file_id: fileId,
    });
    return json(req, 200, { request: publicRequestStatus(update.data as AccessRequestRow) });
  }

  if (action === "approve_all_pending") {
    if (!shareIsActive(existing)) return json(req, 409, { error: "Create or renew an active share link first." });
    const pending = await admin.from("atsrs_share_access_requests").select(REQUEST_SELECT)
      .eq("owner_id", user.id).eq("share_id", existing!.id).eq("status", "pending").limit(50);
    if (pending.error) throw pending.error;
    const now = new Date();
    const accessExpires = new Date(Math.min(now.getTime() + DOWNLOAD_URL_SECONDS * 1000, new Date(existing!.expires_at!).getTime())).toISOString();
    const updatedRows: AccessRequestRow[] = [];
    for (const item of pending.data ?? []) {
      const update = await admin.from("atsrs_share_access_requests").update({
        status: "approved", access_expires_at: accessExpires, decided_at: now.toISOString(), updated_at: now.toISOString(),
      }).eq("id", item.id).eq("status", "pending").select(REQUEST_SELECT).single();
      if (!update.error && update.data) {
        const updated = update.data as AccessRequestRow;
        updatedRows.push(updated);
        await insertEvent(admin, existing!, "request_approved", { request_id: updated.id });
        try { await notifyDecision(updated, true); } catch (error) { console.warn("ATSRS approval email skipped", error); }
      }
    }
    return json(req, 200, { approved: updatedRows.length });
  }

  if (action !== "create") return json(req, 400, { error: "Unsupported action." });
  const fileIds = uniqueFileIds(body.file_ids);
  const expiresAt = parseExpiry(body.expires_at);
  if (!fileIds.length) return json(req, 400, { error: "Select at least one server document." });
  if (!expiresAt) return json(req, 400, { error: "Choose a valid link expiry between 10 minutes and one year." });
  const owned = await admin.from("atsrs_files").select("id").eq("user_id", user.id)
    .eq("account_type", "personal").in("id", fileIds);
  if (owned.error) throw owned.error;
  const found = new Set((owned.data ?? []).map((row) => String(row.id)));
  if (!fileIds.every((id) => found.has(id))) return json(req, 403, { error: "One or more selected files are not available." });

  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const now = new Date().toISOString();
  const upsert = await admin.from("atsrs_profile_shares").upsert({
    user_id: user.id,
    account_type: "personal",
    token_hash: tokenHash,
    token_hint: token.slice(-8),
    selected_file_ids: fileIds,
    enabled: true,
    expires_at: expiresAt,
    view_count: 0,
    last_viewed_at: null,
    updated_at: now,
  }, { onConflict: "user_id,account_type" }).select(SHARE_SELECT).single();
  if (upsert.error) throw upsert.error;
  const share = upsert.data as ShareRow;
  await admin.from("atsrs_share_access_requests")
    .update({ status: "expired", access_expires_at: null, updated_at: now })
    .eq("share_id", share.id).in("status", ["otp_pending", "pending", "approved"]);
  return json(req, 200, {
    share: publicShareStatus(share),
    token,
    share_url: `${SITE_URL}/?share=${encodeURIComponent(token)}`,
  });
}

async function startVerification(
  req: Request,
  admin: AdminClient,
  secretKey: string,
  share: ShareRow,
  body: JsonObject,
) {
  const name = safeText(body.requester_name, 100);
  const company = safeText(body.requester_company, 140);
  const email = safeEmail(body.requester_email);
  const requestAll = body.request_all === true;
  const fileIds = requestedFiles(share, body.file_ids, requestAll);
  const requesterUserId = await corporateRequesterId(req, admin);
  if (name.length < 2 || company.length < 2 || !email) {
    return json(req, 400, { error: "Enter your name, company and a valid work email." });
  }
  if (!fileIds.length) return json(req, 400, { error: "Choose at least one shared document." });
  const recent = await admin.from("atsrs_share_access_requests").select("created_at")
    .eq("share_id", share.id).eq("requester_email", email)
    .gte("created_at", new Date(Date.now() - 3600000).toISOString())
    .order("created_at", { ascending: false }).limit(6);
  if (recent.error) throw recent.error;
  const rows = recent.data ?? [];
  if (rows.length >= 5) return json(req, 429, { error: "Too many verification attempts. Please try again later." });
  if (rows[0] && Date.now() - new Date(rows[0].created_at).getTime() < 60000) {
    return json(req, 429, { error: "Please wait one minute before requesting another code." });
  }
  const requestId = crypto.randomUUID();
  const otp = randomOtp();
  const otpHash = await hmacHex(secretKey, `${requestId}:${email}:${otp}`);
  const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60000).toISOString();
  const insert = await admin.from("atsrs_share_access_requests").insert({
    id: requestId,
    share_id: share.id,
    share_token_hash: share.token_hash,
    owner_id: share.user_id,
    requester_name: name,
    requester_company: company,
    requester_email: email,
    requester_user_id: requesterUserId,
    requested_file_ids: fileIds,
    request_all: requestAll,
    status: "otp_pending",
    otp_hash: otpHash,
    otp_expires_at: otpExpiresAt,
  }).select(REQUEST_SELECT).single();
  if (insert.error) throw insert.error;
  try {
    await sendEmail(
      email,
      `${otp} is your ATSRS verification code`,
      `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033"><h2>Verify your work email</h2><p>Hello ${escapeHtml(name)},</p><p>Use this one-time code to send your document download request:</p><div style="font-size:32px;font-weight:800;letter-spacing:8px;padding:18px;background:#eef4ff;border-radius:12px;text-align:center">${otp}</div><p>This code expires in ${OTP_TTL_MINUTES} minutes.</p><p style="color:#64748b;font-size:12px">If you did not request access, ignore this email. No document access has been granted.</p></div>`,
      `Your ATSRS verification code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.`,
    );
  } catch (error) {
    await admin.from("atsrs_share_access_requests").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", requestId);
    throw error;
  }
  await insertEvent(admin, share, "otp_sent", { request_id: requestId });
  return json(req, 200, { request_id: requestId, otp_expires_in: OTP_TTL_MINUTES * 60 });
}

async function verifyOtp(
  req: Request,
  admin: AdminClient,
  secretKey: string,
  share: ShareRow,
  body: JsonObject,
) {
  const requestId = safeText(body.request_id, 40);
  const otp = safeText(body.otp, 6);
  if (!UUID_PATTERN.test(requestId) || !/^\d{6}$/.test(otp)) return json(req, 400, { error: "Enter the 6-digit verification code." });
  const result = await admin.from("atsrs_share_access_requests").select(REQUEST_SELECT)
    .eq("id", requestId).eq("share_id", share.id).eq("status", "otp_pending").maybeSingle();
  if (result.error) throw result.error;
  const row = result.data as AccessRequestRow | null;
  if (!row) return json(req, 404, { error: "Verification request was not found." });
  const attempts = Number(row.otp_attempts ?? 0) + 1;
  if (!row.otp_expires_at || new Date(row.otp_expires_at).getTime() <= Date.now() || attempts > MAX_OTP_ATTEMPTS) {
    await admin.from("atsrs_share_access_requests").update({ status: "expired", otp_attempts: attempts, updated_at: new Date().toISOString() }).eq("id", row.id);
    return json(req, 410, { error: "The verification code has expired. Start a new request." });
  }
  const expected = await hmacHex(secretKey, `${row.id}:${row.requester_email}:${otp}`);
  if (expected !== row.otp_hash) {
    await admin.from("atsrs_share_access_requests").update({ otp_attempts: attempts, updated_at: new Date().toISOString() }).eq("id", row.id);
    return json(req, 401, { error: attempts >= MAX_OTP_ATTEMPTS ? "Too many incorrect attempts." : "The verification code is incorrect." });
  }
  const viewerToken = randomToken();
  const viewerTokenHash = await sha256Hex(viewerToken);
  const now = new Date().toISOString();
  const update = await admin.from("atsrs_share_access_requests").update({
    status: "pending",
    otp_hash: null,
    otp_expires_at: null,
    otp_attempts: attempts,
    email_verified_at: now,
    viewer_token_hash: viewerTokenHash,
    viewer_token_expires_at: share.expires_at,
    updated_at: now,
  }).eq("id", row.id).eq("status", "otp_pending").select(REQUEST_SELECT).single();
  if (update.error) throw update.error;
  const updated = update.data as AccessRequestRow;
  await insertEvent(admin, share, "otp_verified", { request_id: updated.id });
  await insertEvent(admin, share, "download_requested", { request_id: updated.id, event_data: { request_all: updated.request_all, document_count: updated.requested_file_ids.length } });
  try { await notifyOwner(admin, updated); } catch (error) { console.warn("ATSRS owner notification skipped", error); }
  return json(req, 200, { viewer_token: viewerToken, request: publicRequestStatus(updated) });
}

async function findViewerIdentity(admin: AdminClient, share: ShareRow, viewerToken: string) {
  if (!TOKEN_PATTERN.test(viewerToken)) return null;
  const tokenHash = await sha256Hex(viewerToken);
  const result = await admin.from("atsrs_share_access_requests").select(REQUEST_SELECT)
    .eq("share_id", share.id).eq("share_token_hash", share.token_hash).eq("viewer_token_hash", tokenHash)
    .not("email_verified_at", "is", null).gt("viewer_token_expires_at", new Date().toISOString())
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (result.error) throw result.error;
  return { row: result.data as AccessRequestRow | null, tokenHash };
}

async function createVerifiedRequest(req: Request, admin: AdminClient, share: ShareRow, body: JsonObject) {
  const viewerToken = safeText(body.viewer_token, 160) || req.headers.get("x-atsrs-viewer-token") || "";
  const identity = await findViewerIdentity(admin, share, viewerToken);
  if (!identity?.row) return json(req, 401, { error: "Verify your work email before sending another request." });
  const requestAll = body.request_all === true;
  const fileIds = requestedFiles(share, body.file_ids, requestAll);
  if (!fileIds.length) return json(req, 400, { error: "Choose at least one shared document." });
  const duplicate = await admin.from("atsrs_share_access_requests").select("id,status")
    .eq("share_id", share.id).eq("share_token_hash", share.token_hash)
    .eq("viewer_token_hash", identity.tokenHash).neq("status", "otp_pending")
    .overlaps("requested_file_ids", fileIds).limit(1).maybeSingle();
  if (duplicate.error) throw duplicate.error;
  if (duplicate.data) {
    return json(req, 409, { error: "These documents were already requested with this verified profile link." });
  }
  const now = new Date().toISOString();
  const insert = await admin.from("atsrs_share_access_requests").insert({
    share_id: share.id,
    share_token_hash: share.token_hash,
    owner_id: share.user_id,
    requester_name: identity.row.requester_name,
    requester_company: identity.row.requester_company,
    requester_email: identity.row.requester_email,
    requester_user_id: identity.row.requester_user_id ?? await corporateRequesterId(req, admin),
    requested_file_ids: fileIds,
    request_all: requestAll,
    status: "pending",
    email_verified_at: identity.row.email_verified_at,
    viewer_token_hash: identity.tokenHash,
    viewer_token_expires_at: share.expires_at,
    updated_at: now,
  }).select(REQUEST_SELECT).single();
  if (insert.error) throw insert.error;
  const created = insert.data as AccessRequestRow;
  await insertEvent(admin, share, "download_requested", { request_id: created.id, event_data: { request_all: created.request_all, document_count: created.requested_file_ids.length } });
  try { await notifyOwner(admin, created); } catch (error) { console.warn("ATSRS owner notification skipped", error); }
  return json(req, 200, { request: publicRequestStatus(created) });
}

async function downloadDocument(req: Request, admin: AdminClient, share: ShareRow, body: JsonObject) {
  const fileId = safeText(body.file_id, 40);
  const viewerToken = safeText(body.viewer_token, 160) || req.headers.get("x-atsrs-viewer-token") || "";
  if (!UUID_PATTERN.test(fileId) || !uniqueFileIds(share.selected_file_ids).includes(fileId)) return json(req, 404, { error: "Document is not shared." });
  const identity = await findViewerIdentity(admin, share, viewerToken);
  if (!identity?.row) return json(req, 401, { error: "Your verified recruiter session has expired." });
  const approved = await admin.from("atsrs_share_access_requests").select(REQUEST_SELECT)
    .eq("share_id", share.id).eq("share_token_hash", share.token_hash).eq("viewer_token_hash", identity.tokenHash).eq("status", "approved")
    .contains("requested_file_ids", [fileId]).gt("access_expires_at", new Date().toISOString())
    .order("access_expires_at", { ascending: false }).limit(20);
  if (approved.error) throw approved.error;
  const approvedRows = (approved.data ?? []) as AccessRequestRow[];
  const approvedIds = approvedRows.map((row) => row.id);
  let consumedRequestIds = new Set<string>();
  if (approvedIds.length) {
    const consumed = await admin.from("atsrs_share_events").select("request_id")
      .eq("share_id", share.id).eq("file_id", fileId).eq("event_type", "document_downloaded")
      .in("request_id", approvedIds);
    if (consumed.error) throw consumed.error;
    consumedRequestIds = new Set((consumed.data ?? []).map((event) => String(event.request_id)));
  }
  const access = approvedRows.find((row) =>
    !uniqueFileIds(row.revoked_file_ids).includes(fileId) && !consumedRequestIds.has(row.id)
  ) ?? null;
  if (!access?.access_expires_at) return json(req, 403, { error: "Download access has not been approved or has expired." });
  const file = await admin.from("atsrs_files").select("id,file_name,storage_path")
    .eq("id", fileId).eq("user_id", share.user_id).eq("account_type", share.account_type).maybeSingle();
  if (file.error) throw file.error;
  if (!file.data) return json(req, 404, { error: "Document was not found." });
  const seconds = Math.max(1, Math.min(
    DOWNLOAD_URL_SECONDS,
    Math.floor((new Date(access.access_expires_at).getTime() - Date.now()) / 1000),
    Math.floor((new Date(share.expires_at!).getTime() - Date.now()) / 1000),
  ));
  const signed = await admin.storage.from(FILE_BUCKET).createSignedUrl(file.data.storage_path, seconds, { download: file.data.file_name });
  if (signed.error) throw signed.error;
  const consumed = await admin.from("atsrs_share_events").insert({
    share_id: share.id,
    owner_id: share.user_id,
    request_id: access.id,
    file_id: fileId,
    event_type: "document_downloaded",
    event_data: {},
  });
  if (consumed.error) {
    if (consumed.error.code === "23505") return json(req, 409, { error: "This approved document has already been downloaded." });
    throw consumed.error;
  }
  return json(req, 200, { download_url: signed.data.signedUrl, expires_in: seconds });
}

async function publicAction(req: Request, admin: AdminClient, secretKey: string, body: JsonObject) {
  const token = safeText(body.token, 160);
  const share = await loadShareByToken(admin, token);
  if (!share) return json(req, 404, { error: "Shared profile was not found or is no longer active." });
  const action = safeText(body.action, 40);
  if (action === "start_verification") return startVerification(req, admin, secretKey, share, body);
  if (action === "verify_otp") return verifyOtp(req, admin, secretKey, share, body);
  if (action === "create_request") return createVerifiedRequest(req, admin, share, body);
  if (action === "download") return downloadDocument(req, admin, share, body);
  if (action === "track_preview") {
    const fileId = safeText(body.file_id, 40);
    if (!UUID_PATTERN.test(fileId) || !uniqueFileIds(share.selected_file_ids).includes(fileId)) return json(req, 404, { error: "Document is not shared." });
    await insertEvent(admin, share, "document_previewed", { file_id: fileId });
    return json(req, 200, { tracked: true });
  }
  return json(req, 400, { error: "Unsupported public action." });
}

async function publicRequest(req: Request, admin: AdminClient) {
  const token = new URL(req.url).searchParams.get("token")?.trim() ?? "";
  const share = await loadShareByToken(admin, token);
  if (!share) return json(req, 404, { error: "Shared profile was not found or is no longer active." });
  const workspace = await admin.from("atsrs_workspace_data").select("data_key,payload")
    .eq("user_id", share.user_id).eq("account_type", share.account_type);
  if (workspace.error) throw workspace.error;
  const profileRow = (workspace.data ?? []).find((row) => String(row.data_key ?? "").endsWith(`_${share.account_type}_profile`));
  const profileValue = parseWorkspaceValue(profileRow?.payload) as JsonObject;
  let avatarUrl = safeText(profileValue.avatarUrl ?? profileValue.avatar_url, 500);
  if (!avatarUrl) {
    const ownerResult = await admin.auth.admin.getUserById(share.user_id);
    if (!ownerResult.error) {
      const metadata = ownerResult.data.user?.user_metadata ?? {};
      avatarUrl = safeText(metadata.avatar_url ?? metadata.picture, 500);
    }
  }
  const selectedFileIds = uniqueFileIds(share.selected_file_ids);
  let files: JsonObject[] = [];
  if (selectedFileIds.length) {
    const fileResult = await admin.from("atsrs_files")
      .select("id,category,file_name,mime_type,size_bytes,storage_path,metadata,created_at,updated_at")
      .eq("user_id", share.user_id).eq("account_type", share.account_type).in("id", selectedFileIds);
    if (fileResult.error) throw fileResult.error;
    const positions = new Map(selectedFileIds.map((id, index) => [id, index]));
    files = (fileResult.data ?? []).slice().sort((a, b) =>
      (positions.get(String(a.id)) ?? 9999) - (positions.get(String(b.id)) ?? 9999)
    );
  }
  const viewerToken = req.headers.get("x-atsrs-viewer-token") ?? "";
  let tokenHash = "";
  if (TOKEN_PATTERN.test(viewerToken)) tokenHash = await sha256Hex(viewerToken);
  let approvedRows: AccessRequestRow[] = [];
  let viewerRequests: AccessRequestRow[] = [];
  const downloadedByRequest = new Map<string, Set<string>>();
  if (tokenHash) {
    const requestResult = await admin.from("atsrs_share_access_requests").select(REQUEST_SELECT)
      .eq("share_id", share.id).eq("share_token_hash", share.token_hash).eq("viewer_token_hash", tokenHash).order("created_at", { ascending: false });
    if (requestResult.error) throw requestResult.error;
    viewerRequests = (requestResult.data ?? []) as AccessRequestRow[];
    approvedRows = viewerRequests.filter((row) => row.status === "approved" && row.access_expires_at && new Date(row.access_expires_at).getTime() > Date.now());
    const requestIds = viewerRequests.map((row) => row.id);
    if (requestIds.length) {
      const downloaded = await admin.from("atsrs_share_events").select("request_id,file_id")
        .eq("share_id", share.id).eq("event_type", "document_downloaded").in("request_id", requestIds);
      if (downloaded.error) throw downloaded.error;
      (downloaded.data ?? []).forEach((event) => {
        const requestId = String(event.request_id ?? "");
        const fileId = String(event.file_id ?? "");
        if (!requestId || !fileId) return;
        if (!downloadedByRequest.has(requestId)) downloadedByRequest.set(requestId, new Set());
        downloadedByRequest.get(requestId)!.add(fileId);
      });
    }
  }
  const documents = await Promise.all(files.map(async (file) => {
    const details = documentDetails(file);
    const preview = await admin.storage.from(FILE_BUCKET).createSignedUrl(String(file.storage_path), PREVIEW_URL_SECONDS);
    if (preview.error) throw preview.error;
    const downloaded = viewerRequests.find((row) =>
      row.requested_file_ids.includes(details.id) && downloadedByRequest.get(row.id)?.has(details.id)
    );
    const approved = approvedRows.find((row) =>
      row.requested_file_ids.includes(details.id) && !uniqueFileIds(row.revoked_file_ids).includes(details.id) && !downloadedByRequest.get(row.id)?.has(details.id)
    );
    const pending = viewerRequests.find((row) => row.status === "pending" && row.requested_file_ids.includes(details.id));
    const declined = viewerRequests.find((row) => row.status === "declined" && row.requested_file_ids.includes(details.id));
    const previouslyRequested = viewerRequests.find((row) => row.status !== "otp_pending" && row.requested_file_ids.includes(details.id));
    return {
      ...details,
      preview_url: preview.data.signedUrl,
      download_status: downloaded ? "downloaded" : approved ? "approved" : pending ? "pending" : declined ? "declined" : previouslyRequested ? "approval_expired" : "available_on_request",
      download_expires_at: approved?.access_expires_at ?? null,
    };
  }));
  const now = new Date().toISOString();
  await admin.from("atsrs_profile_shares").update({
    view_count: Number(share.view_count ?? 0) + 1,
    last_viewed_at: now,
  }).eq("id", share.id);
  await insertEvent(admin, share, "link_opened");
  return json(req, 200, {
    profile: {
      name: safeText(profileValue.name, 100), surname: safeText(profileValue.surname, 100),
      position: safeText(profileValue.position, 140), company: safeText(profileValue.company, 140),
      country: safeText(profileValue.country, 100),
      avatar_url: avatarUrl,
    },
    documents,
    requests: viewerRequests.map((row) => ({
      ...publicRequestStatus(row),
      downloaded_file_ids: Array.from(downloadedByRequest.get(row.id) ?? []),
    })),
    access: { preview_only: true, share_expires_at: share.expires_at, download_window_minutes: 30 },
  });
}

Deno.serve(async (req: Request) => {
  if (!allowedOrigin(req)) return json(req, 403, { error: "Origin is not allowed." });
  if (req.method === "OPTIONS") return new Response("ok", { headers: responseHeaders(req) });
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secretKey = getSupabaseSecretKey();
  if (!supabaseUrl || !secretKey) return json(req, 500, { error: "Server configuration is incomplete." });
  const admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    if (req.method === "GET") return await publicRequest(req, admin);
    if (req.method === "POST") {
      let body: JsonObject;
      try { body = await req.json() as JsonObject; } catch { return json(req, 400, { error: "Invalid request body." }); }
      const action = safeText(body.action, 40);
      const publicActions = ["start_verification", "verify_otp", "create_request", "download", "track_preview"];
      return publicActions.includes(action)
        ? await publicAction(req, admin, secretKey, body)
        : await ownerRequest(req, admin, body);
    }
    return json(req, 405, { error: "Method not allowed." });
  } catch (error) {
    console.error("share-profile failed", error);
    return json(req, 500, { error: "Shared profile service is temporarily unavailable." });
  }
});
