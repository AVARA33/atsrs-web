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
  audience: "anyone" | "recruiters" | "recipient";
  recipient_recruiter_id: string | null;
  recipient_name: string | null;
  recipient_company: string | null;
  recipient_email: string | null;
  token_hash: string;
  token_hint: string;
  selected_file_ids: string[];
  enabled: boolean;
  expires_at: string | null;
  view_count: number | string;
  last_viewed_at: string | null;
  revoked_at: string | null;
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

const SHARE_SELECT = "id,user_id,account_type,audience,recipient_recruiter_id,recipient_name,recipient_company,recipient_email,token_hash,token_hint,selected_file_ids,enabled,expires_at,view_count,last_viewed_at,revoked_at,created_at,updated_at";
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

function isShareEligibleFile(file: JsonObject) {
  const metadata = file.metadata && typeof file.metadata === "object"
    ? file.metadata as JsonObject
    : {};
  return metadata.document_registered !== false;
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

async function normalizeExpiredRequests(admin: AdminClient, rows: AccessRequestRow[]) {
  if (!rows.length) return rows;
  const shareIds = Array.from(new Set(rows.map((row) => row.share_id).filter(Boolean)));
  const shares = shareIds.length
    ? await admin.from("atsrs_profile_shares").select(SHARE_SELECT).in("id", shareIds)
    : { data: [], error: null };
  if (shares.error) throw shares.error;
  const sharesById = new Map(
    (shares.data ?? []).map((share) => [String(share.id), share as ShareRow]),
  );
  const nowTime = Date.now();
  const expiredIds = rows.filter((row) => {
    const shareActive = shareIsActive(sharesById.get(row.share_id) ?? null);
    if (["otp_pending", "pending"].includes(row.status)) return !shareActive;
    if (row.status !== "approved") return false;
    const accessExpiry = row.access_expires_at
      ? new Date(row.access_expires_at).getTime()
      : Number.NaN;
    return !shareActive || !Number.isFinite(accessExpiry) || accessExpiry <= nowTime;
  }).map((row) => row.id);
  if (!expiredIds.length) return rows;
  const now = new Date(nowTime).toISOString();
  const update = await admin.from("atsrs_share_access_requests")
    .update({ status: "expired", access_expires_at: null, updated_at: now })
    .in("id", expiredIds).in("status", ["otp_pending", "pending", "approved"]);
  if (update.error) throw update.error;
  const expiredSet = new Set(expiredIds);
  return rows.map((row) => expiredSet.has(row.id)
    ? { ...row, status: "expired", access_expires_at: null, updated_at: now }
    : row);
}

function publicShareStatus(row: ShareRow | null) {
  if (!row) return null;
  const active = shareIsActive(row);
  const expired = Date.parse(row.expires_at ?? "") <= Date.now();
  const status = active ? "active" : row.revoked_at ? "revoked" : expired ? "expired" : "inactive";
  return {
    id: row.id,
    audience: row.audience ?? "anyone",
    recipient_recruiter_id: row.recipient_recruiter_id,
    recipient_name: row.recipient_name,
    recipient_company: row.recipient_company,
    recipient_email: row.recipient_email,
    active,
    enabled: row.enabled,
    status,
    revoked_at: row.revoked_at,
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
    share_id: row.share_id,
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

function shareResumeValue(row: AccessRequestRow) {
  return `atsrs:share-resume:v1:${row.id}:${row.share_id}:${row.requester_email}:${row.viewer_token_hash ?? ""}`;
}

async function loadResumeRequest(admin: AdminClient, secretKey: string, requestId: string, resume: string) {
  if (!UUID_PATTERN.test(requestId) || !/^[a-f0-9]{64}$/.test(resume)) return null;
  const result = await admin.from("atsrs_share_access_requests").select(REQUEST_SELECT).eq("id", requestId).maybeSingle();
  if (result.error) throw result.error;
  const row = result.data as AccessRequestRow | null;
  if (!row?.email_verified_at || !row.viewer_token_hash) return null;
  const expected = await hmacHex(secretKey, shareResumeValue(row));
  return expected === resume ? row : null;
}

async function loadShareById(admin: AdminClient, shareId: string) {
  if (!UUID_PATTERN.test(shareId)) return null;
  const result = await admin.from("atsrs_profile_shares").select(SHARE_SELECT).eq("id", shareId).eq("enabled", true).maybeSingle();
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
  const reviewUrl = `${SITE_URL}/?route=profile&tab=sharing&request=${encodeURIComponent(row.id)}&share_id=${encodeURIComponent(row.share_id)}`;
  const approveUrl = `${reviewUrl}&intent=approve`;
  const visibleNames = names.slice(0, 8);
  const documentList = visibleNames.length
    ? `<ul style="margin:10px 0 0;padding-left:20px;color:#334155">${visibleNames.map((name) => `<li style="margin:6px 0">${escapeHtml(name)}</li>`).join("")}</ul>${names.length > visibleNames.length ? `<p style="margin:10px 0 0;color:#64748b;font-size:13px">+ ${names.length - visibleNames.length} more files in ATSRS</p>` : ""}`
    : `<p style="margin:10px 0 0;color:#334155">${escapeHtml(documents)}</p>`;
  await sendEmail(
    email,
    `ATSRS download request from ${row.requester_name}`,
    `<div style="background:#f1f5f9;padding:28px 12px;font-family:Arial,sans-serif;color:#172033"><div style="max-width:620px;margin:auto;background:#fff;border:1px solid #dbe4ee;border-radius:18px;overflow:hidden"><div style="padding:18px 24px;background:#08111f;color:#fff;font-weight:800;letter-spacing:.08em">ATSRS</div><div style="padding:26px 24px"><p style="margin:0 0 8px;color:#2563eb;font-size:12px;font-weight:800;letter-spacing:.1em">VERIFIED DOWNLOAD REQUEST</p><h2 style="margin:0 0 20px;font-size:24px">Review file access</h2><table role="presentation" style="width:100%;border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0"><tr><td style="padding:11px 14px;color:#64748b;width:130px">Name</td><td style="padding:11px 14px;font-weight:700">${escapeHtml(row.requester_name)}</td></tr><tr><td style="padding:11px 14px;color:#64748b;border-top:1px solid #e2e8f0">Company</td><td style="padding:11px 14px;font-weight:700;border-top:1px solid #e2e8f0">${escapeHtml(row.requester_company)}</td></tr><tr><td style="padding:11px 14px;color:#64748b;border-top:1px solid #e2e8f0">Verified email</td><td style="padding:11px 14px;font-weight:700;border-top:1px solid #e2e8f0">${escapeHtml(row.requester_email)}</td></tr></table><div style="margin-top:22px"><b>${row.request_all ? "All shared files requested" : `${names.length || row.requested_file_ids.length} file(s) requested`}</b>${documentList}</div><div style="margin-top:24px"><a href="${reviewUrl}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 18px;border-radius:10px;background:#2563eb;color:#fff;text-decoration:none;font-weight:700">Review request</a><a href="${approveUrl}" style="display:inline-block;margin:0 0 8px;padding:12px 18px;border-radius:10px;background:#16a34a;color:#fff;text-decoration:none;font-weight:700">Approve all files</a></div><p style="margin:10px 0 0;color:#64748b;font-size:12px;line-height:1.5">For security, approval is completed after you sign in to ATSRS and confirm. No download is possible before your approval.</p></div></div></div>`,
    `ATSRS verified download request\nName: ${row.requester_name}\nCompany: ${row.requester_company}\nVerified email: ${row.requester_email}\nRequested: ${documents}\nReview: ${reviewUrl}\nApprove all files: ${approveUrl}\nSign in to ATSRS and confirm before access is granted.`,
  );
}

async function notifyDecision(row: AccessRequestRow, approved: boolean, secretKey: string) {
  const subject = approved ? "Your ATSRS download request was approved" : "Your ATSRS download request was declined";
  const timing = approved && row.access_expires_at
    ? `Download access is available until ${new Date(row.access_expires_at).toUTCString()}, and never beyond the original share-link expiry.`
    : "The profile owner did not grant download access for this request.";
  const resume = approved ? await hmacHex(secretKey, shareResumeValue(row)) : "";
  const returnUrl = approved
    ? `${SITE_URL}/?share_request=${encodeURIComponent(row.id)}&resume=${encodeURIComponent(resume)}`
    : "";
  await sendEmail(
    row.requester_email,
    subject,
    `<div style="background:#f1f5f9;padding:28px 12px;font-family:Arial,sans-serif;color:#172033"><div style="max-width:620px;margin:auto;background:#fff;border:1px solid #dbe4ee;border-radius:18px;overflow:hidden"><div style="padding:18px 24px;background:#08111f;color:#fff;font-weight:800;letter-spacing:.08em">ATSRS</div><div style="padding:26px 24px"><p style="margin:0 0 8px;color:#16a34a;font-size:12px;font-weight:800;letter-spacing:.1em">${approved ? "DOWNLOAD APPROVED" : "REQUEST UPDATE"}</p><h2 style="margin:0 0 14px;font-size:24px">${approved ? "Your files are ready" : "Download request declined"}</h2><p style="line-height:1.6">Hello ${escapeHtml(row.requester_name)},</p><p style="line-height:1.6">${escapeHtml(timing)}</p>${approved ? `<a href="${returnUrl}" style="display:inline-block;margin:12px 0 8px;padding:12px 18px;border-radius:10px;background:#16a34a;color:#fff;text-decoration:none;font-weight:700">Open shared files</a>` : ""}<p style="color:#64748b;font-size:12px;line-height:1.5">ATSRS never sends document attachments by email.</p></div></div></div>`,
    `${approved ? "Approved." : "Declined."} ${timing}${approved ? ` Open shared files: ${returnUrl}` : ""}`,
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

async function ownerRequest(req: Request, admin: AdminClient, secretKey: string, body: JsonObject) {
  const user = await authenticatedUser(admin, req);
  if (!user) return json(req, 401, { error: "Authentication required." });
  const action = safeText(body.action, 40);
  const existingResult = await admin.from("atsrs_profile_shares").select(SHARE_SELECT)
    .eq("user_id", user.id).eq("account_type", "personal")
    .order("created_at", { ascending: false });
  if (existingResult.error) throw existingResult.error;
  const existingShares = (existingResult.data ?? []) as ShareRow[];
  const existing = existingShares.find(shareIsActive) ?? existingShares[0] ?? null;

  if (action === "create_recruiter_email_share") {
    const recruiterId = safeText(body.recruiter_id, 40);
    if (!UUID_PATTERN.test(recruiterId)) {
      return json(req, 400, { error: "Choose a valid ATSRS recruiter." });
    }
    const recruiterResult = await admin.from("atsrs_recruiters")
      .select("id,name,company,professional_email,email_verification_status,status")
      .eq("id", recruiterId)
      .eq("status", "active")
      .eq("email_verification_status", "verified")
      .maybeSingle();
    if (recruiterResult.error) throw recruiterResult.error;
    const recruiter = recruiterResult.data as JsonObject | null;
    const recipientEmail = safeEmail(recruiter?.professional_email);
    if (!recruiter || !recipientEmail) {
      return json(req, 404, { error: "This recruiter does not have a verified professional email." });
    }
    const now = new Date();
    const expiredResult = await admin.from("atsrs_profile_shares")
      .update({ enabled: false, updated_at: now.toISOString() })
      .eq("user_id", user.id)
      .eq("account_type", "personal")
      .eq("recipient_recruiter_id", recruiterId)
      .eq("enabled", true)
      .lte("expires_at", now.toISOString());
    if (expiredResult.error) throw expiredResult.error;
    const activeResult = await admin.from("atsrs_profile_shares").select(SHARE_SELECT)
      .eq("user_id", user.id)
      .eq("account_type", "personal")
      .eq("recipient_recruiter_id", recruiterId)
      .eq("enabled", true)
      .gt("expires_at", now.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (activeResult.error) throw activeResult.error;
    if (activeResult.data) {
      return json(req, 409, {
        error: "Your profile is already shared with this recruiter. Revoke the active link before sharing again.",
        share: publicShareStatus(activeResult.data as ShareRow),
        already_active: true,
      });
    }
    const token = randomToken();
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const payload = {
      user_id: user.id,
      account_type: "personal",
      audience: "recipient",
      recipient_recruiter_id: recruiterId,
      recipient_name: safeText(recruiter.name, 180),
      recipient_company: safeText(recruiter.company, 180),
      recipient_email: recipientEmail,
      token_hash: tokenHash,
      token_hint: token.slice(-8),
      selected_file_ids: [],
      enabled: true,
      expires_at: expiresAt,
      view_count: 0,
      last_viewed_at: null,
      revoked_at: null,
      updated_at: now.toISOString(),
    };
    const saved = await admin.from("atsrs_profile_shares").insert(payload)
      .select(SHARE_SELECT).single();
    if (saved.error?.code === "23505") {
      return json(req, 409, {
        error: "Your profile is already shared with this recruiter. Revoke the active link before sharing again.",
        already_active: true,
      });
    }
    if (saved.error) throw saved.error;
    const share = saved.data as ShareRow;
    return json(req, 200, {
      share: publicShareStatus(share),
      token,
      share_url: `${SITE_URL}/?share=${encodeURIComponent(token)}`,
      recipient: {
        id: recruiterId,
        name: share.recipient_name,
        company: share.recipient_company,
        email: recipientEmail,
      },
      email_sent: false,
    });
  }

  if (action === "status") return json(req, 200, {
    shares: existingShares.map(publicShareStatus),
    share: publicShareStatus(existing),
  });

  if (action === "list_sent_requests") {
    const workspace = await admin.from("atsrs_workspaces").select("user_id")
      .eq("user_id", user.id).eq("account_type", "company").maybeSingle();
    if (workspace.error) throw workspace.error;
    if (!workspace.data) return json(req, 403, { error: "A Corporate workspace is required." });

    const requestsResult = await admin.from("atsrs_share_access_requests").select(REQUEST_SELECT)
      .eq("requester_user_id", user.id).not("email_verified_at", "is", null)
      .order("created_at", { ascending: false }).limit(100);
    if (requestsResult.error) throw requestsResult.error;
    const requestRows = await normalizeExpiredRequests(
      admin,
      (requestsResult.data ?? []) as AccessRequestRow[],
    );
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
    const requestRows = await normalizeExpiredRequests(
      admin,
      (requestsResult.data ?? []) as AccessRequestRow[],
    );
    return json(req, 200, {
      requests: requestRows.map((row) => ({
        ...publicRequestStatus(row),
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
    const shareId = safeText(body.share_id, 40);
    const target = UUID_PATTERN.test(shareId)
      ? existingShares.find((share) => share.id === shareId) ?? null
      : existing;
    if (!target) return json(req, 200, { share: null });
    const now = new Date().toISOString();
    const update = await admin.from("atsrs_profile_shares")
      .update({ enabled: false, revoked_at: now, updated_at: now }).eq("id", target.id).eq("user_id", user.id)
      .select(SHARE_SELECT).single();
    if (update.error) throw update.error;
    await admin.from("atsrs_share_access_requests")
      .update({ status: "expired", access_expires_at: null, updated_at: now })
      .eq("share_id", target.id).in("status", ["otp_pending", "pending", "approved"]);
    return json(req, 200, {
      share: publicShareStatus(update.data as ShareRow),
      email_sent: false,
      recipient_notified: false,
    });
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
    const accessExpires = decision === "approve" ? share!.expires_at : null;
    const status = decision === "approve" ? "approved" : "declined";
    const update = await admin.from("atsrs_share_access_requests").update({
      status, access_expires_at: accessExpires, decided_at: now.toISOString(), updated_at: now.toISOString(),
    }).eq("id", accessRequest.id).eq("owner_id", user.id).select(REQUEST_SELECT).single();
    if (update.error) throw update.error;
    const updated = update.data as AccessRequestRow;
    if (share) await insertEvent(admin, share, decision === "approve" ? "request_approved" : "request_declined", { request_id: updated.id });
    try { await notifyDecision(updated, decision === "approve", secretKey); } catch (error) { console.warn("ATSRS decision email skipped", error); }
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
    const accessExpires = existing!.expires_at;
    const updatedRows: AccessRequestRow[] = [];
    for (const item of pending.data ?? []) {
      const update = await admin.from("atsrs_share_access_requests").update({
        status: "approved", access_expires_at: accessExpires, decided_at: now.toISOString(), updated_at: now.toISOString(),
      }).eq("id", item.id).eq("status", "pending").select(REQUEST_SELECT).single();
      if (!update.error && update.data) {
        const updated = update.data as AccessRequestRow;
        updatedRows.push(updated);
        await insertEvent(admin, existing!, "request_approved", { request_id: updated.id });
        try { await notifyDecision(updated, true, secretKey); } catch (error) { console.warn("ATSRS approval email skipped", error); }
      }
    }
    return json(req, 200, { approved: updatedRows.length });
  }

  if (action !== "create") return json(req, 400, { error: "Unsupported action." });
  const fileIds = uniqueFileIds(body.file_ids);
  const expiresAt = parseExpiry(body.expires_at);
  const audienceText = safeText(body.audience, 20);
  const audience = (["anyone", "recruiters", "recipient"].includes(audienceText)
    ? audienceText : "anyone") as ShareRow["audience"];
  if (!fileIds.length) return json(req, 400, { error: "Select at least one server document." });
  if (!expiresAt) return json(req, 400, { error: "Choose a valid link expiry between 10 minutes and one year." });
  const owned = await admin.from("atsrs_files").select("id,metadata").eq("user_id", user.id)
    .eq("account_type", "personal").in("id", fileIds);
  if (owned.error) throw owned.error;
  const found = new Set((owned.data ?? []).filter((row) =>
    isShareEligibleFile(row as JsonObject)
  ).map((row) => String(row.id)));
  if (!fileIds.every((id) => found.has(id))) return json(req, 403, { error: "One or more selected files are not available." });

  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const now = new Date().toISOString();
  const payload = {
    user_id: user.id,
    account_type: "personal",
    audience,
    token_hash: tokenHash,
    token_hint: token.slice(-8),
    selected_file_ids: fileIds,
    enabled: true,
    expires_at: expiresAt,
    view_count: 0,
    last_viewed_at: null,
    updated_at: now,
  };
  const reusable = audience === "recipient"
    ? null
    : existingShares.find((share) => share.audience === audience) ?? null;
  const saved = reusable
    ? await admin.from("atsrs_profile_shares").update(payload).eq("id", reusable.id)
      .eq("user_id", user.id).select(SHARE_SELECT).single()
    : await admin.from("atsrs_profile_shares").insert(payload).select(SHARE_SELECT).single();
  if (saved.error) throw saved.error;
  const share = saved.data as ShareRow;
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

async function downloadDocument(req: Request, admin: AdminClient, share: ShareRow, body: JsonObject, resumeRequest: AccessRequestRow | null = null) {
  const fileId = safeText(body.file_id, 40);
  const viewerToken = safeText(body.viewer_token, 160) || req.headers.get("x-atsrs-viewer-token") || "";
  if (!UUID_PATTERN.test(fileId) || !uniqueFileIds(share.selected_file_ids).includes(fileId)) return json(req, 404, { error: "Document is not shared." });
  let approvedRows: AccessRequestRow[] = [];
  if (resumeRequest) {
    if (resumeRequest.share_id === share.id && resumeRequest.status === "approved" && resumeRequest.access_expires_at && new Date(resumeRequest.access_expires_at).getTime() > Date.now() && resumeRequest.requested_file_ids.includes(fileId)) approvedRows = [resumeRequest];
  } else {
    const identity = await findViewerIdentity(admin, share, viewerToken);
    if (!identity?.row) return json(req, 401, { error: "Your verified recruiter session has expired." });
    const approved = await admin.from("atsrs_share_access_requests").select(REQUEST_SELECT)
      .eq("share_id", share.id).eq("share_token_hash", share.token_hash).eq("viewer_token_hash", identity.tokenHash).eq("status", "approved")
      .contains("requested_file_ids", [fileId]).gt("access_expires_at", new Date().toISOString())
      .order("access_expires_at", { ascending: false }).limit(20);
    if (approved.error) throw approved.error;
    approvedRows = (approved.data ?? []) as AccessRequestRow[];
  }
  const access = approvedRows.find((row) =>
    !uniqueFileIds(row.revoked_file_ids).includes(fileId)
  ) ?? null;
  if (!access?.access_expires_at) return json(req, 403, { error: "Download access has not been approved or has expired." });
  const file = await admin.from("atsrs_files").select("id,file_name,storage_path,metadata")
    .eq("id", fileId).eq("user_id", share.user_id).eq("account_type", share.account_type).maybeSingle();
  if (file.error) throw file.error;
  if (!file.data || !isShareEligibleFile(file.data as JsonObject)) {
    return json(req, 404, { error: "Document was not found." });
  }
  const seconds = Math.max(1, Math.min(
    DOWNLOAD_URL_SECONDS,
    Math.floor((new Date(access.access_expires_at).getTime() - Date.now()) / 1000),
    Math.floor((new Date(share.expires_at!).getTime() - Date.now()) / 1000),
  ));
  const signed = await admin.storage.from(FILE_BUCKET).createSignedUrl(file.data.storage_path, seconds, { download: file.data.file_name });
  if (signed.error) throw signed.error;
  const downloadEvent = await admin.from("atsrs_share_events").insert({
    share_id: share.id,
    owner_id: share.user_id,
    request_id: access.id,
    file_id: fileId,
    event_type: "document_downloaded",
    event_data: {},
  });
  if (downloadEvent.error) throw downloadEvent.error;
  return json(req, 200, { download_url: signed.data.signedUrl, expires_in: seconds });
}

async function publicAction(req: Request, admin: AdminClient, secretKey: string, body: JsonObject) {
  const token = safeText(body.token, 160);
  const resumeRequest = await loadResumeRequest(admin, secretKey, safeText(body.request_id, 40), safeText(body.resume, 80));
  const share = resumeRequest ? await loadShareById(admin, resumeRequest.share_id) : await loadShareByToken(admin, token);
  if (!share) return json(req, 404, { error: "Shared profile was not found or is no longer active." });
  const action = safeText(body.action, 40);
  if (action === "start_verification") return startVerification(req, admin, secretKey, share, body);
  if (action === "verify_otp") return verifyOtp(req, admin, secretKey, share, body);
  if (action === "create_request") return createVerifiedRequest(req, admin, share, body);
  if (action === "download") return downloadDocument(req, admin, share, body, resumeRequest);
  if (action === "track_preview") {
    const fileId = safeText(body.file_id, 40);
    if (!UUID_PATTERN.test(fileId) || !uniqueFileIds(share.selected_file_ids).includes(fileId)) return json(req, 404, { error: "Document is not shared." });
    await insertEvent(admin, share, "document_previewed", { file_id: fileId });
    return json(req, 200, { tracked: true });
  }
  return json(req, 400, { error: "Unsupported public action." });
}

async function publicRequest(req: Request, admin: AdminClient, secretKey: string) {
  const requestUrl = new URL(req.url);
  const token = requestUrl.searchParams.get("token")?.trim() ?? "";
  const quietRefresh = requestUrl.searchParams.get("refresh") === "1";
  const resumeRequest = await loadResumeRequest(admin, secretKey, requestUrl.searchParams.get("request_id")?.trim() ?? "", requestUrl.searchParams.get("resume")?.trim() ?? "");
  const share = resumeRequest ? await loadShareById(admin, resumeRequest.share_id) : await loadShareByToken(admin, token);
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
    files = (fileResult.data ?? []).filter((file) =>
      isShareEligibleFile(file as JsonObject)
    ).slice().sort((a, b) =>
      (positions.get(String(a.id)) ?? 9999) - (positions.get(String(b.id)) ?? 9999)
    );
  }
  const viewerToken = req.headers.get("x-atsrs-viewer-token") ?? "";
  let tokenHash = "";
  if (TOKEN_PATTERN.test(viewerToken)) tokenHash = await sha256Hex(viewerToken);
  let approvedRows: AccessRequestRow[] = [];
  let viewerRequests: AccessRequestRow[] = resumeRequest ? [resumeRequest] : [];
  const downloadedByRequest = new Map<string, Set<string>>();
  if (resumeRequest) {
    approvedRows = viewerRequests.filter((row) => row.status === "approved" && row.access_expires_at && new Date(row.access_expires_at).getTime() > Date.now());
  } else if (tokenHash) {
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
  const documentResults = await Promise.all(files.map(async (file) => {
    const details = documentDetails(file);
    const preview = await admin.storage.from(FILE_BUCKET).createSignedUrl(String(file.storage_path), PREVIEW_URL_SECONDS);
    // A stale database row must not make the entire shared profile unavailable.
    // The owner can remove or re-upload that document separately; only files
    // that still have a readable Storage object belong in the public payload.
    if (preview.error || !preview.data?.signedUrl) return null;
    const approved = approvedRows.find((row) =>
      row.requested_file_ids.includes(details.id) && !uniqueFileIds(row.revoked_file_ids).includes(details.id)
    );
    const pending = viewerRequests.find((row) => row.status === "pending" && row.requested_file_ids.includes(details.id));
    const declined = viewerRequests.find((row) => row.status === "declined" && row.requested_file_ids.includes(details.id));
    const previouslyRequested = viewerRequests.find((row) => row.status !== "otp_pending" && row.requested_file_ids.includes(details.id));
    return {
      ...details,
      preview_url: preview.data.signedUrl,
      download_status: approved ? "approved" : pending ? "pending" : declined ? "declined" : previouslyRequested ? "approval_expired" : "available_on_request",
      download_expires_at: approved?.access_expires_at ?? null,
    };
  }));
  const documents = documentResults.filter((document) => document !== null);
  if (!quietRefresh) {
    const now = new Date().toISOString();
    await admin.from("atsrs_profile_shares").update({
      view_count: Number(share.view_count ?? 0) + 1,
      last_viewed_at: now,
    }).eq("id", share.id);
    await insertEvent(admin, share, "link_opened");
  }
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
    access: { preview_only: true, share_expires_at: share.expires_at, download_access_expires_at: share.expires_at, repeat_downloads: true },
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
    if (req.method === "GET") return await publicRequest(req, admin, secretKey);
    if (req.method === "POST") {
      let body: JsonObject;
      try { body = await req.json() as JsonObject; } catch { return json(req, 400, { error: "Invalid request body." }); }
      const action = safeText(body.action, 40);
      const publicActions = ["start_verification", "verify_otp", "create_request", "download", "track_preview"];
      return publicActions.includes(action)
        ? await publicAction(req, admin, secretKey, body)
        : await ownerRequest(req, admin, secretKey, body);
    }
    return json(req, 405, { error: "Method not allowed." });
  } catch (error) {
    console.error("share-profile failed", error);
    return json(req, 500, { error: "Shared profile service is temporarily unavailable." });
  }
});
