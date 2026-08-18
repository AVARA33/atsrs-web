import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { normalizeRepoPath } from "../_shared/developer-editor-policy.ts";

const PREVIEW_ORIGIN = "https://atsrs.com";
const SAFE_RESOURCE = /^(?:tests\/fixtures\/[a-z0-9._-]+\.html|css\/[a-z0-9._/-]+\.css|js\/[a-z0-9._/-]+\.js|assets\/[a-z0-9._/-]+\.(?:png|jpg|jpeg|webp|svg|gif|woff2?))$/i;

function response(status: number, body: string, contentType = "text/plain; charset=utf-8") {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
      "Content-Security-Policy": `default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors ${PREVIEW_ORIGIN}; form-action 'none'; connect-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:`,
    },
  });
}

function pemBytes(pem: string) {
  const base64 = pem.replace(/\\n/g, "\n").replace(/-----BEGIN [^-]+-----|-----END [^-]+-----|\s/g, "");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

async function appToken() {
  const appId = Deno.env.get("ATSRS_GITHUB_APP_ID") || "";
  const privateKey = Deno.env.get("ATSRS_GITHUB_APP_PRIVATE_KEY") || "";
  const installationId = Deno.env.get("ATSRS_GITHUB_INSTALLATION_ID") || "";
  if (!appId || !privateKey || !installationId) return "";
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const head = encode({ alg: "RS256", typ: "JWT" });
  const payload = encode({ iat: now - 60, exp: now + 540, iss: appId });
  const key = await crypto.subtle.importKey("pkcs8", pemBytes(privateKey), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${head}.${payload}`)));
  let binary = "";
  signature.forEach((byte) => binary += String.fromCharCode(byte));
  const jwt = `${head}.${payload}.${btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")}`;
  const result = await fetch(`https://api.github.com/app/installations/${encodeURIComponent(installationId)}/access_tokens`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "ATSRS-Developer-Preview" },
  });
  if (!result.ok) return "";
  return String((await result.json()).token || "");
}

async function sha256(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))))
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function mime(path: string) {
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  if (path.endsWith(".css")) return "text/css; charset=utf-8";
  if (path.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".png")) return "image/png";
  if (/\.jpe?g$/i.test(path)) return "image/jpeg";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".woff2")) return "font/woff2";
  if (path.endsWith(".woff")) return "font/woff";
  return "application/octet-stream";
}

Deno.serve(async (req: Request) => {
  if (req.method !== "GET") return response(405, "Method not allowed");
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const marker = parts.indexOf("developer-editor-preview");
  const token = marker >= 0 ? parts[marker + 1] || "" : "";
  const path = normalizeRepoPath(parts.slice(marker + 2).map(decodeURIComponent).join("/"));
  if (!/^[0-9a-f]{64}$/.test(token) || !path || !SAFE_RESOURCE.test(path)) return response(404, "Preview unavailable");
  const url = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !serviceKey) return response(503, "Preview unavailable");
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const digest = await sha256(token);
  const grant = await admin.from("atsrs_developer_preview_tokens").select("id,change_id,entry_path,expires_at,revoked_at").eq("token_hash", digest).is("revoked_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (grant.error || !grant.data) return response(404, "Preview expired or unavailable");
  if (path.endsWith(".html") && path !== grant.data.entry_path) return response(403, "Preview entry denied");
  const change = await admin.from("atsrs_developer_changes").select("branch_name").eq("id", grant.data.change_id).maybeSingle();
  if (change.error || !change.data) return response(404, "Preview unavailable");
  const githubToken = await appToken();
  if (!githubToken) return response(503, "Preview integration unavailable");
  const owner = Deno.env.get("ATSRS_GITHUB_REPOSITORY_OWNER") || "AVARA33";
  const repo = Deno.env.get("ATSRS_GITHUB_REPOSITORY_NAME") || "atsrs-web";
  const file = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(change.data.branch_name)}`, {
    headers: { Authorization: `Bearer ${githubToken}`, Accept: "application/vnd.github.raw+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "ATSRS-Developer-Preview" },
  });
  if (!file.ok) return response(404, "Preview resource unavailable");
  const bytes = await file.arrayBuffer();
  return new Response(bytes, { status: 200, headers: response(200, "", mime(path)).headers });
});
