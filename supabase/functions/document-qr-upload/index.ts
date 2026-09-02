import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.55.0";

const SITE_URL = "https://atsrs.com";
const FILE_BUCKET = "atsrs-user-files";
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const SESSION_MINUTES = 10;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,128}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type JsonObject = Record<string, unknown>;

function secretKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const source = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!source) return "";
  try {
    const keys = JSON.parse(source) as Record<string, unknown>;
    if (typeof keys.default === "string") return keys.default;
    return Object.values(keys).find((value): value is string => typeof value === "string" && Boolean(value)) ?? "";
  } catch {
    return "";
  }
}

function publishableKey() {
  return Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
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
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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

function safeText(value: unknown, max = 180) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function safeUuid(value: unknown) {
  const result = safeText(value, 40);
  return UUID_PATTERN.test(result) ? result : "";
}

function safeToken(value: unknown) {
  const result = safeText(value, 128);
  return TOKEN_PATTERN.test(result) ? result : "";
}

function safeTheme(value: unknown) {
  return value === "light" ? "light" : "dark";
}

function safeFileName(value: unknown) {
  const name = safeText(value, 180).replace(/[^a-zA-Z0-9._ -]/g, "_").replace(/\s+/g, " ");
  return name && name !== "." && name !== ".." ? name : "ATSRS-document";
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((value) => binary += String.fromCharCode(value));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
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

function unavailable(req: Request, status = 400) {
  return json(req, status, {
    error: "This QR upload session is unavailable or has expired.",
    code: "QR_SESSION_UNAVAILABLE",
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: responseHeaders(req) });
  if (req.method !== "POST" || !allowedOrigin(req)) return json(req, 405, { error: "Method not allowed." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceSecret = secretKey();
  if (!supabaseUrl || !serviceSecret || !publishableKey()) return json(req, 503, { error: "QR upload is not configured." });

  let body: JsonObject;
  try {
    body = await req.json() as JsonObject;
  } catch {
    return json(req, 400, { error: "Invalid request." });
  }

  const action = safeText(body.action, 24);
  const admin = createClient(supabaseUrl, serviceSecret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    if (action === "create") {
      const user = await authenticatedUser(req, supabaseUrl);
      if (!user) return json(req, 401, { error: "Sign in is required." });

      await admin.from("atsrs_document_upload_sessions")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .in("status", ["pending", "uploading"])
        .lt("expires_at", new Date().toISOString());

      const rawToken = base64Url(crypto.getRandomValues(new Uint8Array(32)));
      const theme = safeTheme(body.theme);
      const expiresAt = new Date(Date.now() + SESSION_MINUTES * 60_000).toISOString();
      const inserted = await admin.from("atsrs_document_upload_sessions").insert({
        user_id: user.id,
        account_type: "personal",
        token_hash: await sha256Hex(rawToken),
        token_hint: rawToken.slice(-8),
        expires_at: expiresAt,
      }).select("id,expires_at,status").single();
      if (inserted.error) throw inserted.error;

      const origin = allowedOrigin(req) ?? SITE_URL;
      return json(req, 200, {
        session: inserted.data,
        ttl_seconds: SESSION_MINUTES * 60,
        upload_url: `${origin}/qr-upload.html?theme=${theme}#token=${rawToken}`,
      });
    }

    if (action === "status" || action === "cancel") {
      const user = await authenticatedUser(req, supabaseUrl);
      const sessionId = safeUuid(body.session_id);
      if (!user || !sessionId) return json(req, 401, { error: "Sign in is required." });

      if (action === "cancel") {
        const cancelled = await admin.from("atsrs_document_upload_sessions")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("id", sessionId).eq("user_id", user.id)
          .in("status", ["pending", "uploading"])
          .select("id,status").maybeSingle();
        if (cancelled.error) throw cancelled.error;
        return json(req, 200, { session: cancelled.data ?? { id: sessionId, status: "cancelled" } });
      }

      const result = await admin.from("atsrs_document_upload_sessions")
        .select("id,status,expires_at,file_id,file_name,mime_type,size_bytes,uploaded_at")
        .eq("id", sessionId).eq("user_id", user.id).maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) return unavailable(req, 404);

      if (["pending", "uploading"].includes(result.data.status) && new Date(result.data.expires_at).getTime() <= Date.now()) {
        await admin.from("atsrs_document_upload_sessions")
          .update({ status: "expired", updated_at: new Date().toISOString() })
          .eq("id", sessionId).eq("user_id", user.id);
        result.data.status = "expired";
      }

      let file = null;
      if (result.data.file_id) {
        const fileResult = await admin.from("atsrs_files")
          .select("id,file_name,mime_type,size_bytes,created_at,metadata")
          .eq("id", result.data.file_id).eq("user_id", user.id).eq("account_type", "personal").maybeSingle();
        if (fileResult.error) throw fileResult.error;
        file = fileResult.data;
      }
      return json(req, 200, { session: result.data, file });
    }

    const token = safeToken(body.token);
    if (!token) return unavailable(req);
    const tokenHash = await sha256Hex(token);
    const sessionResult = await admin.from("atsrs_document_upload_sessions")
      .select("id,user_id,status,expires_at,storage_path,file_id,file_name,mime_type,size_bytes,attempt_count")
      .eq("token_hash", tokenHash).maybeSingle();
    if (sessionResult.error) throw sessionResult.error;
    const session = sessionResult.data;
    if (!session || session.status === "cancelled" || session.status === "expired") return unavailable(req, 404);
    if (new Date(session.expires_at).getTime() <= Date.now()) {
      await admin.from("atsrs_document_upload_sessions").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", session.id);
      return unavailable(req, 410);
    }

    if (action === "inspect") {
      return json(req, 200, { session: { status: session.status, expires_at: session.expires_at } });
    }

    if (action === "prepare") {
      if (session.status !== "pending" || session.attempt_count >= 8) return unavailable(req, 409);
      const fileName = safeFileName(body.file_name);
      const mimeType = safeText(body.mime_type, 100).toLowerCase();
      const sizeBytes = Number(body.size_bytes);
      if (!ALLOWED_MIME_TYPES.has(mimeType) || !Number.isInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_FILE_BYTES) {
        return json(req, 400, { error: "Choose a PDF, JPG, PNG, or WebP file up to 15 MB.", code: "QR_FILE_INVALID" });
      }

      const objectId = crypto.randomUUID();
      const allowance = await admin.rpc("atsrs_service_upload_access", { p_user_id: session.user_id, p_bytes: sizeBytes, p_category: "document" });
      if (allowance.error) throw allowance.error;
      if (!allowance.data) return json(req, 403, { error: "Your plan upload limit has been reached.", code: "PLAN_UPLOAD_LIMIT" });
      const storagePath = `${session.user_id}/personal/document/${objectId}-${fileName}`;
      const signed = await admin.storage.from(FILE_BUCKET).createSignedUploadUrl(storagePath);
      if (signed.error) throw signed.error;
      const claimed = await admin.from("atsrs_document_upload_sessions").update({
        status: "uploading",
        storage_path: storagePath,
        file_name: fileName,
        mime_type: mimeType,
        size_bytes: sizeBytes,
        attempt_count: session.attempt_count + 1,
        updated_at: new Date().toISOString(),
      }).eq("id", session.id).eq("status", "pending").select("id").maybeSingle();
      if (claimed.error) throw claimed.error;
      if (!claimed.data) return unavailable(req, 409);
      return json(req, 200, {
        path: signed.data.path,
        signed_url: signed.data.signedUrl,
      });
    }

    if (action === "finalize") {
      if (session.status === "uploaded" && session.file_id) return json(req, 200, { uploaded: true, file_id: session.file_id });
      if (session.status !== "uploading" || !session.storage_path) return unavailable(req, 409);

      const lastSlash = session.storage_path.lastIndexOf("/");
      const folder = session.storage_path.slice(0, lastSlash);
      const objectName = session.storage_path.slice(lastSlash + 1);
      const listed = await admin.storage.from(FILE_BUCKET).list(folder, { limit: 20, search: objectName });
      if (listed.error) throw listed.error;
      const object = listed.data.find((item) => item.name === objectName);
      if (!object) return json(req, 409, { error: "Upload has not reached the server yet.", code: "QR_UPLOAD_INCOMPLETE" });
      const actualSize = Number(object.metadata?.size ?? session.size_bytes ?? 0);
      if (actualSize <= 0 || actualSize > MAX_FILE_BYTES) {
        await admin.storage.from(FILE_BUCKET).remove([session.storage_path]);
        return json(req, 400, { error: "Uploaded file is invalid.", code: "QR_FILE_INVALID" });
      }

      const finalized = await admin.rpc("atsrs_finalize_document_qr_upload", {
        p_session_id: session.id,
        p_actual_size: actualSize,
      });
      if (finalized.error) throw finalized.error;
      return json(req, 200, { uploaded: true, file: finalized.data });
    }

    return json(req, 400, { error: "Unsupported QR upload action." });
  } catch (error) {
    console.error("ATSRS document QR upload failed", { action, message: error instanceof Error ? error.message : String(error) });
    return json(req, 500, { error: "QR upload could not be completed." });
  }
});
