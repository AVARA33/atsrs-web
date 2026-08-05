import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.55.0";

const SITE_URL = "https://atsrs.com";
const PRODUCTION_REF = "hwtjuqyxzivymofamwxl";
const STAGING_REF = "nsbmbbqgekcwmdqmqsao";
const FILE_BUCKET = "atsrs-user-files";
const MAX_DOCUMENTS = 50;
const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const PREVIEW_SECONDS = 60;
const DOWNLOAD_SECONDS = 90;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,128}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type JsonObject = Record<string, unknown>;
type AdminClient = ReturnType<typeof createClient>;

function secretKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const source = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!source) return null;
  try {
    const keys = JSON.parse(source) as Record<string, unknown>;
    if (typeof keys.default === "string" && keys.default) return keys.default;
    return Object.values(keys).find(
      (value): value is string => typeof value === "string" && Boolean(value),
    ) ?? null;
  } catch {
    return null;
  }
}

function publishableKey() {
  return Deno.env.get("SUPABASE_ANON_KEY") ??
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
}

function projectRef(url: string) {
  const match = /^https:\/\/([a-z0-9]+)\.supabase\.co/i.exec(url);
  return match?.[1] ?? "";
}

function allowedOrigin(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  if (!origin) return SITE_URL;
  if (origin === SITE_URL || origin === "https://www.atsrs.com") return origin;
  if (/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) return origin;
  return null;
}

function headers(req: Request) {
  return {
    "Access-Control-Allow-Origin": allowedOrigin(req) ?? SITE_URL,
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info, x-atsrs-staging-test",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
    "Referrer-Policy": "no-referrer",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
  };
}

function json(req: Request, status: number, body: JsonObject) {
  return new Response(JSON.stringify(body), { status, headers: headers(req) });
}

function safeText(value: unknown, max = 180) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function safeEmail(value: unknown) {
  const email = safeText(value, 254).toLowerCase();
  return EMAIL_PATTERN.test(email) ? email : "";
}

function safeUuid(value: unknown) {
  const result = safeText(value, 40);
  return UUID_PATTERN.test(result) ? result : "";
}

function documentIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => safeUuid(item)).filter(Boolean)))
    .slice(0, MAX_DOCUMENTS);
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((value) => binary += String.fromCharCode(value));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomToken(bytes = 32) {
  return base64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmacBytes(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)),
  );
}

async function hmacHex(secret: string, value: string) {
  return Array.from(await hmacBytes(secret, value))
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function domainHmac(secret: string, domain: string, value: string) {
  return hmacHex(secret, `atsrs:${domain}:v1:${value}`);
}

async function deterministicShareToken(
  secret: string,
  ownerId: string,
  operationId: string,
) {
  return base64Url(
    await hmacBytes(
      secret,
      `atsrs:recipient-share-token:v1:${ownerId}:${operationId}`,
    ),
  );
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "•••";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"•".repeat(Math.max(3, Math.min(8, local.length - visible.length)))}@${domain}`;
}

function requestIp(req: Request) {
  return safeText(
    req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown",
    64,
  );
}

function expiry(value: unknown) {
  const raw = safeText(value, 40);
  const date = new Date(raw);
  const time = date.getTime();
  if (
    !raw || !Number.isFinite(time) || time <= Date.now() ||
    time > Date.now() + 366 * 86400000
  ) return "";
  return date.toISOString();
}

function publicError(req: Request, status = 400) {
  return json(req, status, {
    error: "This secure link or verification request is unavailable.",
    code: "RECIPIENT_LINK_UNAVAILABLE",
  });
}

async function authenticatedUser(req: Request, url: string) {
  const authorization = req.headers.get("authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return null;
  const client = createClient(url, publishableKey(), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const result = await client.auth.getUser();
  return result.data.user ?? null;
}

async function isServiceTest(
  req: Request,
  currentProjectRef: string,
  serviceSecret: string,
) {
  if (currentProjectRef !== STAGING_REF) return false;
  const supplied = req.headers.get("x-atsrs-staging-test") ?? "";
  if (!supplied || supplied.length !== serviceSecret.length) return false;
  const [left, right] = await Promise.all([
    sha256Hex(supplied),
    sha256Hex(serviceSecret),
  ]);
  return left === right;
}

function isSyntheticStagingUser(
  user: { app_metadata?: Record<string, unknown> },
  currentProjectRef: string,
) {
  return currentProjectRef === STAGING_REF &&
    user.app_metadata?.staging_only === true;
}

async function sendOtp(email: string, otp: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("ATSRS_EMAIL_FROM") ??
    "ATSRS <notifications@notify.atsrs.com>";
  if (!apiKey) throw new Error("EMAIL_NOT_CONFIGURED");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Your ATSRS secure-link verification code",
        text:
          `Your ATSRS verification code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes. If you did not request this code, ignore this email.`,
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`EMAIL_${response.status}`);
  } finally {
    clearTimeout(timer);
  }
}

async function ownerFiles(
  admin: AdminClient,
  ownerId: string,
  ids: string[],
) {
  if (!ids.length) return [];
  const result = await admin.from("atsrs_files")
    .select("id,file_name,category,mime_type,size_bytes,metadata,storage_path")
    .eq("user_id", ownerId)
    .eq("account_type", "personal")
    .in("id", ids);
  if (result.error) throw result.error;
  return result.data ?? [];
}

async function ownerRequest(
  req: Request,
  body: JsonObject,
  admin: AdminClient,
  url: string,
  serverSecret: string,
  currentProjectRef: string,
) {
  const user = await authenticatedUser(req, url);
  if (!user) return json(req, 401, { error: "Sign in is required." });
  const action = safeText(body.action, 80);

  if (action === "owner_staging_entitle") {
    const permitted = isSyntheticStagingUser(user, currentProjectRef);
    if (!permitted) return json(req, 404, { error: "Action unavailable." });
    const result = await admin.rpc("atsrs_set_recipient_share_entitlement", {
      p_owner_user_id: user.id,
      p_enabled: true,
      p_active_limit: 5,
      p_source: "canary",
    });
    if (result.error) return json(req, 503, { error: "Canary unavailable." });
    return json(req, 200, { enabled: true, active_limit: 5 });
  }

  if (action === "owner_staging_otp") {
    if (!isSyntheticStagingUser(user, currentProjectRef)) {
      return json(req, 404, { error: "Action unavailable." });
    }
    const challengeId = safeUuid(body.challenge_id);
    if (!challengeId) return json(req, 404, { error: "Action unavailable." });
    const challenge = await admin.from("atsrs_recipient_share_otp_challenges")
      .select("nonce,share_id").eq("id", challengeId).maybeSingle();
    if (!challenge.data?.nonce || !challenge.data?.share_id) {
      return json(req, 404, { error: "Action unavailable." });
    }
    const share = await admin.from("atsrs_recipient_shares").select("id")
      .eq("id", challenge.data.share_id).eq("owner_user_id", user.id)
      .maybeSingle();
    if (!share.data?.id) {
      return json(req, 404, { error: "Action unavailable." });
    }
    const bytes = await hmacBytes(
      serverSecret,
      `atsrs:recipient-otp:v1:${challenge.data.nonce}`,
    );
    const otp = String(
      ((bytes[0] << 16) | (bytes[1] << 8) | bytes[2]) % 1000000,
    ).padStart(6, "0");
    return json(req, 200, { otp });
  }

  if (action === "owner_status") {
    const [entitlement, shares, requests] = await Promise.all([
      admin.rpc("atsrs_get_recipient_share_entitlement", {
        p_owner_user_id: user.id,
      }),
      admin.from("atsrs_recipient_shares")
        .select(
          "id,recipient_type,recipient_label,recipient_email_masked,token_hint,status,allow_preview,allow_download,expires_at,revoked_at,last_activity_at,created_at,updated_at,version",
        )
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: false }),
      admin.from("atsrs_recipient_share_access_requests")
        .select(
          "id,dedicated_share_id,requested_document_ids,status,access_expires_at,decided_at,created_at,updated_at",
        )
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);
    if (entitlement.error || shares.error || requests.error) {
      return json(req, 503, { error: "Recipient links could not be loaded." });
    }
    const shareRows = shares.data ?? [];
    const shareIds = shareRows.map((row) => row.id);
    const documents = shareIds.length
      ? await admin.from("atsrs_recipient_share_documents")
        .select("share_id,document_id").in("share_id", shareIds)
      : { data: [], error: null };
    if (documents.error) {
      return json(req, 503, { error: "Recipient links could not be loaded." });
    }
    const documentMap = new Map<string, string[]>();
    for (const row of documents.data ?? []) {
      const list = documentMap.get(row.share_id) ?? [];
      list.push(row.document_id);
      documentMap.set(row.share_id, list);
    }
    return json(req, 200, {
      entitlement: entitlement.data ?? {
        enabled: false,
        active_limit: 0,
        source: "none",
      },
      shares: shareRows.map((row) => ({
        ...row,
        document_ids: documentMap.get(row.id) ?? [],
        effective_status: row.status === "active" &&
            new Date(row.expires_at).getTime() <= Date.now()
          ? "expired"
          : row.status,
      })),
      requests: requests.data ?? [],
    });
  }

  if (action === "owner_files") {
    const result = await admin.from("atsrs_files")
      .select("id,file_name,category,mime_type,size_bytes,metadata,created_at")
      .eq("user_id", user.id).eq("account_type", "personal")
      .order("created_at", { ascending: false });
    if (result.error) {
      return json(req, 503, { error: "Documents could not be loaded." });
    }
    return json(req, 200, { files: result.data ?? [] });
  }

  if (action === "owner_create") {
    const operationId = safeUuid(body.operation_id);
    const ids = documentIds(body.document_ids);
    const email = safeEmail(body.recipient_email);
    const label = safeText(body.recipient_label, 140);
    const type = safeText(body.recipient_type, 20);
    const expiresAt = expiry(body.expires_at);
    const allowPreview = body.allow_preview === true;
    const allowDownload = body.allow_download === true;
    if (
      !operationId || !ids.length || !email || !label ||
      !["person", "company"].includes(type) || !expiresAt ||
      (!allowPreview && !allowDownload)
    ) return json(req, 400, { error: "Review the recipient link details." });
    const files = await ownerFiles(admin, user.id, ids);
    if (files.length !== ids.length) {
      return json(req, 403, { error: "A selected document is unavailable." });
    }
    const rawToken = await deterministicShareToken(
      serverSecret,
      user.id,
      operationId,
    );
    const [tokenHash, emailHash] = await Promise.all([
      sha256Hex(rawToken),
      domainHmac(serverSecret, "recipient-email", email),
    ]);
    const result = await admin.rpc("atsrs_create_recipient_share", {
      p_owner_user_id: user.id,
      p_idempotency_key: operationId,
      p_recipient_type: type,
      p_recipient_label: label,
      p_recipient_email_hash: emailHash,
      p_recipient_email_masked: maskEmail(email),
      p_token_hash: tokenHash,
      p_token_hint: rawToken.slice(-8),
      p_allow_preview: allowPreview,
      p_allow_download: allowDownload,
      p_expires_at: expiresAt,
      p_document_ids: ids,
    });
    if (result.error) {
      const disabled = /FEATURE_DISABLED|ACTIVE_LIMIT/.test(
        result.error.message ?? "",
      );
      return json(req, disabled ? 403 : 409, {
        error: disabled
          ? "Recipient links are not available for this account."
          : "The recipient link could not be created.",
        code: disabled ? "RECIPIENT_LINK_LIMIT" : "RECIPIENT_LINK_CONFLICT",
      });
    }
    return json(req, 200, {
      share: result.data,
      token: rawToken,
      share_url: `${SITE_URL}/#recipient=${rawToken}`,
    });
  }

  if (action === "owner_update") {
    const shareId = safeUuid(body.share_id);
    const operationId = safeUuid(body.operation_id);
    const ids = documentIds(body.document_ids);
    const expectedVersion = Number(body.expected_version);
    const email = safeEmail(body.recipient_email);
    const label = safeText(body.recipient_label, 140);
    const type = safeText(body.recipient_type, 20);
    const expiresAt = expiry(body.expires_at);
    const allowPreview = body.allow_preview === true;
    const allowDownload = body.allow_download === true;
    if (
      !shareId || !operationId || !ids.length ||
      !Number.isSafeInteger(expectedVersion) || expectedVersion < 1 ||
      !email || !label || !["person", "company"].includes(type) ||
      !expiresAt || (!allowPreview && !allowDownload)
    ) return json(req, 400, { error: "Review the recipient link details." });
    const [existing, files] = await Promise.all([
      admin.from("atsrs_recipient_shares")
        .select("recipient_email_hash")
        .eq("id", shareId).eq("owner_user_id", user.id).maybeSingle(),
      ownerFiles(admin, user.id, ids),
    ]);
    if (existing.error || !existing.data || files.length !== ids.length) {
      return json(req, 403, { error: "The recipient link is unavailable." });
    }
    const emailHash = await domainHmac(
      serverSecret,
      "recipient-email",
      email,
    );
    const rotating = existing.data.recipient_email_hash !== emailHash;
    const newToken = rotating
      ? await deterministicShareToken(serverSecret, user.id, operationId)
      : "";
    const result = await admin.rpc("atsrs_update_recipient_share", {
      p_owner_user_id: user.id,
      p_share_id: shareId,
      p_expected_version: expectedVersion,
      p_operation_id: operationId,
      p_recipient_type: type,
      p_recipient_label: label,
      p_recipient_email_hash: emailHash,
      p_recipient_email_masked: maskEmail(email),
      p_new_token_hash: rotating ? await sha256Hex(newToken) : null,
      p_new_token_hint: rotating ? newToken.slice(-8) : null,
      p_allow_preview: allowPreview,
      p_allow_download: allowDownload,
      p_expires_at: expiresAt,
      p_document_ids: ids,
    });
    if (result.error) {
      return json(req, 409, {
        error: "The link changed in another tab. Refresh and try again.",
        code: "RECIPIENT_LINK_STALE",
      });
    }
    return json(req, 200, {
      share: result.data,
      token: newToken || null,
      share_url: newToken ? `${SITE_URL}/#recipient=${newToken}` : null,
      rotated: rotating,
    });
  }

  if (action === "owner_revoke") {
    const shareId = safeUuid(body.share_id);
    const operationId = safeUuid(body.operation_id);
    if (!shareId || !operationId) {
      return json(req, 400, { error: "The recipient link is unavailable." });
    }
    const result = await admin.rpc("atsrs_revoke_recipient_share", {
      p_owner_user_id: user.id,
      p_share_id: shareId,
      p_operation_id: operationId,
    });
    if (result.error) {
      return json(req, 404, { error: "The recipient link is unavailable." });
    }
    return json(req, 200, { share: result.data });
  }

  if (action === "owner_decide") {
    const requestId = safeUuid(body.request_id);
    const operationId = safeUuid(body.operation_id);
    const decision = safeText(body.decision, 20);
    if (
      !requestId || !operationId || !["approve", "decline"].includes(decision)
    ) return json(req, 400, { error: "The request is unavailable." });
    const result = await admin.rpc("atsrs_decide_recipient_download_request", {
      p_owner_user_id: user.id,
      p_request_id: requestId,
      p_decision: decision,
      p_operation_id: operationId,
    });
    if (result.error) {
      return json(req, 409, { error: "The request could not be updated." });
    }
    return json(req, 200, { request: result.data });
  }

  return json(req, 400, { error: "Unknown recipient-link action." });
}

async function activeShareByToken(
  admin: AdminClient,
  rawToken: string,
) {
  if (!TOKEN_PATTERN.test(rawToken)) return null;
  const tokenHash = await sha256Hex(rawToken);
  const result = await admin.from("atsrs_recipient_shares")
    .select(
      "id,owner_user_id,account_type,recipient_type,recipient_label,recipient_email_hash,recipient_email_masked,token_hash,status,allow_preview,allow_download,expires_at",
    )
    .eq("token_hash", tokenHash).maybeSingle();
  const row = result.data;
  if (
    result.error || !row || row.status !== "active" ||
    new Date(row.expires_at).getTime() <= Date.now()
  ) return null;
  return row;
}

async function validSession(
  admin: AdminClient,
  shareId: string,
  rawSession: string,
) {
  if (!TOKEN_PATTERN.test(rawSession)) return null;
  const sessionHash = await sha256Hex(rawSession);
  const result = await admin.from("atsrs_recipient_share_viewer_sessions")
    .select("id,share_id,email_hash,scope,expires_at,revoked_at")
    .eq("share_id", shareId).eq("session_hash", sessionHash).maybeSingle();
  const row = result.data;
  if (
    result.error || !row || row.revoked_at ||
    new Date(row.expires_at).getTime() <= Date.now()
  ) return null;
  return { ...row, session_hash: sessionHash };
}

async function publicRequest(
  req: Request,
  body: JsonObject,
  admin: AdminClient,
  serverSecret: string,
  currentProjectRef: string,
) {
  const action = safeText(body.action, 80);
  const rawToken = safeText(body.token, 160);
  const share = await activeShareByToken(admin, rawToken);

  if (action === "probe") {
    if (share) {
      await admin.from("atsrs_recipient_share_events").insert({
        share_id: share.id,
        owner_user_id: share.owner_user_id,
        event_type: "opened",
        reason_code: "fragment_opened",
      });
    }
    return json(req, 200, {
      ok: true,
      message: "Enter the recipient email to continue.",
    });
  }

  if (action === "start_otp") {
    const email = safeEmail(body.email);
    if (!share || !email) {
      return json(req, 202, {
        accepted: true,
        challenge_id: crypto.randomUUID(),
      });
    }
    const [emailHash, ipHash] = await Promise.all([
      domainHmac(serverSecret, "recipient-email", email),
      domainHmac(serverSecret, "recipient-ip", requestIp(req)),
    ]);
    if (emailHash !== share.recipient_email_hash) {
      return json(req, 202, {
        accepted: true,
        challenge_id: crypto.randomUUID(),
      });
    }
    const since = new Date(Date.now() - OTP_TTL_MINUTES * 60000).toISOString();
    const recent = await admin.from("atsrs_recipient_share_otp_challenges")
      .select("id", { count: "exact", head: true })
      .eq("share_id", share.id).eq("email_hash", emailHash)
      .eq("ip_hash", ipHash).gte("created_at", since);
    if ((recent.count ?? 0) >= 5) return publicError(req, 429);
    const nonce = crypto.randomUUID();
    const otpBytes = await hmacBytes(
      serverSecret,
      `atsrs:recipient-otp:v1:${nonce}`,
    );
    const otp = String(
      ((otpBytes[0] << 16) | (otpBytes[1] << 8) | otpBytes[2]) % 1000000,
    ).padStart(6, "0");
    const otpHash = await domainHmac(serverSecret, "recipient-otp", otp);
    const expiresAt = new Date(
      Date.now() + OTP_TTL_MINUTES * 60000,
    ).toISOString();
    const inserted = await admin.from("atsrs_recipient_share_otp_challenges")
      .insert({
        share_id: share.id,
        email_hash: emailHash,
        otp_hash: otpHash,
        ip_hash: ipHash,
        expires_at: expiresAt,
        nonce,
      }).select("id").single();
    if (inserted.error) return publicError(req, 503);
    const stagingUser = currentProjectRef === STAGING_REF
      ? await authenticatedUser(
        req,
        Deno.env.get("SUPABASE_URL") ?? "",
      )
      : null;
    const stagingTest = Boolean(
      stagingUser && share.owner_user_id === stagingUser.id &&
        isSyntheticStagingUser(stagingUser, currentProjectRef),
    );
    try {
      if (!stagingTest) await sendOtp(email, otp);
    } catch {
      await admin.from("atsrs_recipient_share_otp_challenges")
        .delete().eq("id", inserted.data.id);
      return publicError(req, 503);
    }
    await admin.from("atsrs_recipient_share_events").insert({
      share_id: share.id,
      owner_user_id: share.owner_user_id,
      event_type: "otp_requested",
      reason_code: stagingTest ? "staging_test" : "email_sent",
    });
    return json(req, 202, {
      accepted: true,
      challenge_id: inserted.data.id,
    });
  }

  if (action === "verify_otp") {
    const email = safeEmail(body.email);
    const challengeId = safeUuid(body.challenge_id);
    const otp = safeText(body.otp, 6);
    if (!share || !email || !challengeId || !/^\d{6}$/.test(otp)) {
      return publicError(req, 400);
    }
    const emailHash = await domainHmac(
      serverSecret,
      "recipient-email",
      email,
    );
    const rawSession = randomToken();
    const result = await admin.rpc("atsrs_verify_recipient_share_otp", {
      p_share_id: share.id,
      p_token_hash: share.token_hash,
      p_email_hash: emailHash,
      p_challenge_id: challengeId,
      p_otp_hash: await domainHmac(serverSecret, "recipient-otp", otp),
      p_session_hash: await sha256Hex(rawSession),
    });
    if (result.error || result.data?.ok !== true) return publicError(req, 400);
    return json(req, 200, {
      verified: true,
      session_token: rawSession,
      expires_at: result.data.expires_at,
      scope: result.data.scope,
    });
  }

  const rawSession = safeText(body.session_token, 160);
  const session = share
    ? await validSession(admin, share.id, rawSession)
    : null;
  if (!share || !session) return publicError(req, 401);

  if (action === "profile") {
    const documents = await admin.from("atsrs_recipient_share_documents")
      .select(
        "document_id,atsrs_files!inner(id,file_name,category,mime_type,size_bytes,metadata,created_at)",
      )
      .eq("share_id", share.id);
    if (documents.error) return publicError(req, 503);
    return json(req, 200, {
      recipient: {
        label: share.recipient_label,
        type: share.recipient_type,
        email: share.recipient_email_masked,
      },
      access: {
        allow_preview: share.allow_preview,
        allow_download: share.allow_download,
        expires_at: share.expires_at,
      },
      documents: (documents.data ?? []).map((row) => row.atsrs_files),
    });
  }

  if (action === "preview") {
    const documentId = safeUuid(body.document_id);
    if (!documentId) return publicError(req, 404);
    const authorized = await admin.rpc("atsrs_authorize_recipient_document", {
      p_share_id: share.id,
      p_token_hash: share.token_hash,
      p_session_hash: session.session_hash,
      p_document_id: documentId,
      p_action: "preview",
      p_request_id: null,
    });
    if (authorized.error || !authorized.data?.storage_path) {
      return publicError(req, 403);
    }
    const ttl = Math.max(
      1,
      Math.min(
        PREVIEW_SECONDS,
        Math.floor(
          (new Date(authorized.data.expires_at).getTime() - Date.now()) / 1000,
        ),
      ),
    );
    const signed = await admin.storage.from(FILE_BUCKET)
      .createSignedUrl(authorized.data.storage_path, ttl, {
        download: false,
      });
    if (signed.error) return publicError(req, 503);
    return json(req, 200, {
      preview_url: signed.data.signedUrl,
      expires_in: ttl,
    });
  }

  if (action === "request_download") {
    const ids = documentIds(body.document_ids);
    const operationId = safeUuid(body.operation_id);
    if (!ids.length || !operationId) return publicError(req, 400);
    const result = await admin.rpc(
      "atsrs_create_recipient_download_request",
      {
        p_share_id: share.id,
        p_token_hash: share.token_hash,
        p_session_hash: session.session_hash,
        p_idempotency_key: operationId,
        p_document_ids: ids,
      },
    );
    if (result.error) return publicError(req, 403);
    return json(req, 200, {
      request: {
        id: result.data.id,
        status: result.data.status,
        created_at: result.data.created_at,
      },
    });
  }

  if (action === "request_status") {
    const requestId = safeUuid(body.request_id);
    if (!requestId) return publicError(req, 404);
    const result = await admin.from("atsrs_recipient_share_access_requests")
      .select("id,status,requested_document_ids,access_expires_at,created_at,updated_at")
      .eq("id", requestId)
      .eq("dedicated_share_id", share.id)
      .eq("viewer_session_id", session.id)
      .maybeSingle();
    if (result.error || !result.data) return publicError(req, 404);
    return json(req, 200, { request: result.data });
  }

  if (action === "download") {
    const documentId = safeUuid(body.document_id);
    const requestId = safeUuid(body.request_id);
    if (!documentId || !requestId) return publicError(req, 404);
    const authorized = await admin.rpc("atsrs_authorize_recipient_document", {
      p_share_id: share.id,
      p_token_hash: share.token_hash,
      p_session_hash: session.session_hash,
      p_document_id: documentId,
      p_action: "download",
      p_request_id: requestId,
    });
    if (authorized.error || !authorized.data?.storage_path) {
      return publicError(req, 403);
    }
    const ttl = Math.max(
      1,
      Math.min(
        DOWNLOAD_SECONDS,
        Math.floor(
          (new Date(authorized.data.expires_at).getTime() - Date.now()) / 1000,
        ),
      ),
    );
    const signed = await admin.storage.from(FILE_BUCKET)
      .createSignedUrl(authorized.data.storage_path, ttl, {
        download: true,
      });
    if (signed.error) return publicError(req, 503);
    return json(req, 200, {
      download_url: signed.data.signedUrl,
      expires_in: ttl,
    });
  }

  return publicError(req, 400);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    if (!allowedOrigin(req)) return json(req, 403, { error: "Origin denied." });
    return new Response(null, { status: 204, headers: headers(req) });
  }
  if (req.method !== "POST" || !allowedOrigin(req)) {
    return json(req, 405, { error: "Request denied." });
  }
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serverSecret = secretKey();
  if (!url || !serverSecret) {
    return json(req, 503, { error: "Recipient links are unavailable." });
  }
  const admin = createClient(url, serverSecret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let body: JsonObject;
  try {
    body = await req.json() as JsonObject;
  } catch {
    return json(req, 400, { error: "Invalid request." });
  }
  try {
    const action = safeText(body.action, 80);
    if (action.startsWith("owner_")) {
      return await ownerRequest(
        req,
        body,
        admin,
        url,
        serverSecret,
        projectRef(url),
      );
    }
    return await publicRequest(
      req,
      body,
      admin,
      serverSecret,
      projectRef(url),
    );
  } catch (error) {
    console.error(
      "recipient-share failed",
      error instanceof Error ? error.name : "UNKNOWN",
    );
    return json(req, 503, {
      error: "Recipient links are temporarily unavailable.",
      code: "RECIPIENT_LINK_SERVICE_ERROR",
    });
  }
});
