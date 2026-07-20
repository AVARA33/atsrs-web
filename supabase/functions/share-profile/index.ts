import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.55.0";

const FILE_BUCKET = "atsrs-user-files";
const SITE_URL = "https://atsrs.com";
const SIGNED_URL_SECONDS = 900;
const MAX_SHARED_FILES = 50;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,128}$/;

type JsonObject = Record<string, unknown>;
type ShareRow = {
  id: string;
  user_id: string;
  account_type: string;
  token_hint: string;
  selected_file_ids: string[];
  enabled: boolean;
  expires_at: string | null;
  view_count: number | string;
  last_viewed_at: string | null;
  created_at: string;
  updated_at: string;
};

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

function allowedOrigin(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  if (!origin) return SITE_URL;
  if (origin === SITE_URL || origin === "https://www.atsrs.com") return origin;
  if (/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) return origin;
  return null;
}

function responseHeaders(req: Request) {
  const origin = allowedOrigin(req) ?? SITE_URL;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
    "Referrer-Policy": "no-referrer",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
  };
}

function json(req: Request, status: number, body: JsonObject) {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(req),
  });
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  bytes.forEach((value) => binary += String.fromCharCode(value));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function uniqueFileIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => UUID_PATTERN.test(item)),
  )).slice(0, MAX_SHARED_FILES);
}

function publicShareStatus(row: ShareRow | null) {
  if (!row) return null;
  return {
    id: row.id,
    active: Boolean(row.enabled) &&
      (!row.expires_at || new Date(row.expires_at).getTime() > Date.now()),
    token_hint: row.token_hint,
    selected_file_ids: row.selected_file_ids ?? [],
    view_count: Number(row.view_count ?? 0),
    last_viewed_at: row.last_viewed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
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

function safeText(value: unknown, maxLength = 180) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function documentDetails(file: JsonObject) {
  const metadata = file.metadata && typeof file.metadata === "object"
    ? file.metadata as JsonObject
    : {};
  const document = metadata.document && typeof metadata.document === "object"
    ? metadata.document as JsonObject
    : {};
  const category = safeText(file.category, 40) || "document";
  const fileName = safeText(file.file_name, 180) || "ATSRS document";

  return {
    id: safeText(file.id, 40),
    category,
    file_name: fileName,
    document_type: safeText(document.type, 120) ||
      (category === "cv" ? "Curriculum Vitae" : fileName),
    provider: safeText(document.provider, 160),
    issue_date: safeText(document.issue, 20),
    expiry_date: safeText(document.expiry, 20),
    mime_type: safeText(file.mime_type, 120),
    size_bytes: Number(file.size_bytes ?? 0),
  };
}

async function authenticatedUser(admin: ReturnType<typeof createClient>, req: Request) {
  const authorization = req.headers.get("authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return null;
  const token = authorization.slice(7).trim();
  if (!token) return null;
  const result = await admin.auth.getUser(token);
  if (result.error) return null;
  return result.data.user ?? null;
}

async function validateOwnedFiles(
  admin: ReturnType<typeof createClient>,
  userId: string,
  fileIds: string[],
) {
  if (!fileIds.length) return false;
  const result = await admin
    .from("atsrs_files")
    .select("id")
    .eq("user_id", userId)
    .eq("account_type", "personal")
    .in("id", fileIds);
  if (result.error) throw result.error;
  const found = new Set((result.data ?? []).map((row) => String(row.id)));
  return fileIds.every((id) => found.has(id));
}

async function ownerRequest(
  req: Request,
  admin: ReturnType<typeof createClient>,
) {
  const user = await authenticatedUser(admin, req);
  if (!user) return json(req, 401, { error: "Authentication required." });

  let body: JsonObject;
  try {
    body = await req.json() as JsonObject;
  } catch {
    return json(req, 400, { error: "Invalid request body." });
  }

  const action = safeText(body.action, 30);
  const existingResult = await admin
    .from("atsrs_profile_shares")
    .select("id,user_id,account_type,token_hint,selected_file_ids,enabled,expires_at,view_count,last_viewed_at,created_at,updated_at")
    .eq("user_id", user.id)
    .eq("account_type", "personal")
    .maybeSingle();
  if (existingResult.error) throw existingResult.error;
  const existing = existingResult.data as ShareRow | null;

  if (action === "status") {
    return json(req, 200, { share: publicShareStatus(existing) });
  }

  if (action === "revoke") {
    if (!existing) return json(req, 200, { share: null });
    const update = await admin
      .from("atsrs_profile_shares")
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select("id,user_id,account_type,token_hint,selected_file_ids,enabled,expires_at,view_count,last_viewed_at,created_at,updated_at")
      .single();
    if (update.error) throw update.error;
    return json(req, 200, { share: publicShareStatus(update.data as ShareRow) });
  }

  if (action !== "create") {
    return json(req, 400, { error: "Unsupported action." });
  }

  const fileIds = uniqueFileIds(body.file_ids);
  if (!fileIds.length) {
    return json(req, 400, { error: "Select at least one server document." });
  }
  if (!await validateOwnedFiles(admin, user.id, fileIds)) {
    return json(req, 403, { error: "One or more selected files are not available." });
  }

  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const now = new Date().toISOString();
  const upsert = await admin
    .from("atsrs_profile_shares")
    .upsert({
      user_id: user.id,
      account_type: "personal",
      token_hash: tokenHash,
      token_hint: token.slice(-8),
      selected_file_ids: fileIds,
      enabled: true,
      expires_at: null,
      updated_at: now,
    }, { onConflict: "user_id,account_type" })
    .select("id,user_id,account_type,token_hint,selected_file_ids,enabled,expires_at,view_count,last_viewed_at,created_at,updated_at")
    .single();
  if (upsert.error) throw upsert.error;

  return json(req, 200, {
    share: publicShareStatus(upsert.data as ShareRow),
    token,
    share_url: `${SITE_URL}/?share=${encodeURIComponent(token)}`,
  });
}

async function publicRequest(
  req: Request,
  admin: ReturnType<typeof createClient>,
) {
  let stage = "token";
  try {
    const token = new URL(req.url).searchParams.get("token")?.trim() ?? "";
    if (!TOKEN_PATTERN.test(token)) {
      return json(req, 404, { error: "Shared profile was not found." });
    }

    stage = "share_lookup";
    const tokenHash = await sha256Hex(token);
    const shareResult = await admin
      .from("atsrs_profile_shares")
      .select("id,user_id,account_type,token_hint,selected_file_ids,enabled,expires_at,view_count,last_viewed_at,created_at,updated_at")
      .eq("token_hash", tokenHash)
      .eq("enabled", true)
      .maybeSingle();
    if (shareResult.error) throw shareResult.error;
    const share = shareResult.data as ShareRow | null;
    if (
      !share ||
      (share.expires_at && new Date(share.expires_at).getTime() <= Date.now())
    ) {
      return json(req, 404, { error: "Shared profile was not found or is no longer active." });
    }

    stage = "workspace";
    const workspaceResult = await admin
      .from("atsrs_workspace_data")
      .select("data_key,payload")
      .eq("user_id", share.user_id)
      .eq("account_type", share.account_type);
    if (workspaceResult.error) throw workspaceResult.error;
    const workspaceRows = workspaceResult.data ?? [];
    const profileRow = workspaceRows.find((row) =>
      String(row.data_key ?? "").endsWith(`_${share.account_type}_profile`)
    );
    const profileValue = parseWorkspaceValue(profileRow?.payload) as JsonObject;

    stage = "files";
    const selectedFileIds = Array.isArray(share.selected_file_ids)
      ? share.selected_file_ids
      : [];
    let files: JsonObject[] = [];
    if (selectedFileIds.length) {
      const filesResult = await admin
        .from("atsrs_files")
        .select("id,category,file_name,mime_type,size_bytes,storage_path,metadata")
        .eq("user_id", share.user_id)
        .eq("account_type", share.account_type)
        .in("id", selectedFileIds);
      if (filesResult.error) throw filesResult.error;
      const positions = new Map(selectedFileIds.map((id, index) => [id, index]));
      files = (filesResult.data ?? [])
        .slice()
        .sort((a, b) =>
          (positions.get(String(a.id)) ?? 9999) -
          (positions.get(String(b.id)) ?? 9999)
        );
    }

    stage = "signed_urls";
    const documents = await Promise.all(files.map(async (file) => {
      const details = documentDetails(file);
      const preview = await admin.storage
        .from(FILE_BUCKET)
        .createSignedUrl(String(file.storage_path), SIGNED_URL_SECONDS);
      if (preview.error) throw preview.error;
      const download = await admin.storage
        .from(FILE_BUCKET)
        .createSignedUrl(String(file.storage_path), SIGNED_URL_SECONDS, {
          download: details.file_name,
        });
      if (download.error) throw download.error;
      return {
        ...details,
        preview_url: preview.data.signedUrl,
        download_url: download.data.signedUrl,
      };
    }));

    stage = "view_count";
    await admin
      .from("atsrs_profile_shares")
      .update({
        view_count: Number(share.view_count ?? 0) + 1,
        last_viewed_at: new Date().toISOString(),
      })
      .eq("id", share.id);

    return json(req, 200, {
      profile: {
        name: safeText(profileValue.name, 100),
        surname: safeText(profileValue.surname, 100),
        position: safeText(profileValue.position, 140),
        company: safeText(profileValue.company, 140),
        country: safeText(profileValue.country, 100),
      },
      documents,
      access: {
        signed_url_seconds: SIGNED_URL_SECONDS,
        shared_at: share.updated_at,
      },
    });
  } catch (error) {
    console.error(`share-profile public stage failed: ${stage}`, error);
    throw new Error(`public_stage:${stage}`);
  }
}

Deno.serve(async (req: Request) => {
  if (!allowedOrigin(req)) {
    return json(req, 403, { error: "Origin is not allowed." });
  }
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: responseHeaders(req) });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secretKey = getSupabaseSecretKey();
  if (!supabaseUrl || !secretKey) {
    return json(req, 500, { error: "Server configuration is incomplete." });
  }
  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    if (req.method === "GET") return await publicRequest(req, admin);
    if (req.method === "POST") return await ownerRequest(req, admin);
    return json(req, 405, { error: "Method not allowed." });
  } catch (error) {
    console.error("share-profile failed", error);
    return json(req, 500, {
      error: "Shared profile service is temporarily unavailable.",
    });
  }
});
