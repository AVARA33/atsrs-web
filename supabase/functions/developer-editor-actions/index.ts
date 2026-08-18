import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import {
  SAFE_PREVIEW_ENTRIES,
  classifyFiles,
  classifyPath,
  isDeveloperBranch,
  normalizeRepoPath,
  publicPolicy,
} from "../_shared/developer-editor-policy.ts";

const ORIGIN = "https://atsrs.com";
const cors = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const json = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const clean = (value: unknown, max: number) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA = /^[0-9a-f]{40}$/;

type Actor = { id: string; email: string; owner: boolean; developer: boolean; status: string; aal2: boolean; membership: Record<string, unknown> | null };
type AdminClient = ReturnType<typeof createClient>;
type Input = Record<string, unknown>;

function decodePayload(token: string): Record<string, unknown> {
  try {
    const raw = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(raw.padEnd(Math.ceil(raw.length / 4) * 4, "=")));
  } catch (_) { return {}; }
}

async function audit(admin: AdminClient, actor: Partial<Actor>, action: string, result: string, metadata: Record<string, unknown> = {}, changeId?: string, files: string[] = []) {
  const safeMetadata = { ...metadata };
  for (const key of Object.keys(safeMetadata)) if (/token|secret|authorization|content/i.test(key)) delete safeMetadata[key];
  await admin.from("atsrs_developer_audit").insert({
    actor_id: actor.id || null,
    actor_role: actor.owner ? "owner" : actor.developer ? "developer_editor" : "unknown",
    action: clean(action, 80), result, change_id: changeId || null,
    files: files.slice(0, 100), metadata: safeMetadata,
  });
}

function requireMfa(actor: Actor) {
  return actor.aal2 ? null : json(403, { code: "MFA_REQUIRED", error: "Verify your ATSRS authenticator before this privileged action." });
}

function pemBytes(pem: string) {
  const base64 = pem.replace(/\\n/g, "\n").replace(/-----BEGIN [^-]+-----|-----END [^-]+-----|\s/g, "");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

async function appJwt(appId: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const head = encode({ alg: "RS256", typ: "JWT" });
  const payload = encode({ iat: now - 60, exp: now + 540, iss: appId });
  const key = await crypto.subtle.importKey("pkcs8", pemBytes(privateKey), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${head}.${payload}`)));
  let binary = "";
  signature.forEach((byte) => binary += String.fromCharCode(byte));
  return `${head}.${payload}.${btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")}`;
}

async function githubContext() {
  const appId = Deno.env.get("ATSRS_GITHUB_APP_ID") || "";
  const privateKey = Deno.env.get("ATSRS_GITHUB_APP_PRIVATE_KEY") || "";
  const installationId = Deno.env.get("ATSRS_GITHUB_INSTALLATION_ID") || "";
  const owner = Deno.env.get("ATSRS_GITHUB_REPOSITORY_OWNER") || "AVARA33";
  const repo = Deno.env.get("ATSRS_GITHUB_REPOSITORY_NAME") || "atsrs-web";
  if (!appId || !privateKey || !installationId) return null;
  const jwt = await appJwt(appId, privateKey);
  const tokenResponse = await fetch(`https://api.github.com/app/installations/${encodeURIComponent(installationId)}/access_tokens`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "ATSRS-Developer-Editor" },
  });
  if (!tokenResponse.ok) throw new Error(`GitHub App token failed (${tokenResponse.status})`);
  const tokenData = await tokenResponse.json();
  return { owner, repo, token: String(tokenData.token) };
}

async function gh(ctx: NonNullable<Awaited<ReturnType<typeof githubContext>>>, path: string, init: RequestInit = {}) {
  const response = await fetch(`https://api.github.com/repos/${ctx.owner}/${ctx.repo}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${ctx.token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "ATSRS-Developer-Editor",
      ...(init.headers || {}),
    },
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`GitHub ${response.status}: ${clean(data?.message, 240)}`);
  return data;
}

function encodeContent(text: string) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => binary += String.fromCharCode(byte));
  return btoa(binary);
}
function decodeContent(value: string) {
  const binary = atob(value.replace(/\s/g, ""));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

async function getActor(req: Request, admin: AdminClient, url: string, anonKey: string): Promise<Actor | null> {
  const authorization = req.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();
  const auth = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const result = await auth.auth.getUser(token);
  if (result.error || !result.data.user) return null;
  const user = result.data.user;
  const [ownerResult, membershipResult] = await Promise.all([
    admin.from("atsrs_admin_users").select("user_id").eq("user_id", user.id).maybeSingle(),
    admin.from("atsrs_developer_memberships").select("*").eq("user_id", user.id).maybeSingle(),
  ]);
  const membership = membershipResult.data as Record<string, unknown> | null;
  const developer = membership?.status === "active";
  const payload = decodePayload(token);
  return { id: user.id, email: user.email || "", owner: !!ownerResult.data, developer, status: clean(membership?.status, 20), aal2: payload.aal === "aal2", membership };
}

async function findChange(admin: AdminClient, actor: Actor, id: unknown) {
  const changeId = clean(id, 50);
  if (!UUID.test(changeId)) return null;
  let query = admin.from("atsrs_developer_changes").select("*").eq("id", changeId);
  if (!actor.owner) query = query.eq("developer_id", actor.id);
  const result = await query.maybeSingle();
  return result.data as Record<string, unknown> | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed." });
  const origin = req.headers.get("Origin");
  if (origin && origin !== ORIGIN) return json(403, { error: "Origin denied." });
  const url = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !anonKey || !serviceKey) return json(503, { error: "Developer service is unavailable." });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const actor = await getActor(req, admin, url, anonKey);
  if (!actor) return json(401, { error: "Authentication is required." });
  let body: Input;
  try { body = await req.json(); } catch (_) { return json(400, { error: "Invalid request." }); }
  const action = clean(body.action, 60);

  if (action === "status") {
    if (!actor.owner && !actor.developer) {
      await audit(admin, actor, "route_access", "denied", { reason: actor.status || "no_role" });
      return json(403, { code: "DEVELOPER_ACCESS_DENIED", error: "Developer Editor access is not assigned." });
    }
    if (actor.developer) await admin.from("atsrs_developer_memberships").update({ last_login_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("user_id", actor.id);
    await audit(admin, actor, "route_access", "allowed");
    const githubReady = !!(Deno.env.get("ATSRS_GITHUB_APP_ID") && Deno.env.get("ATSRS_GITHUB_APP_PRIVATE_KEY") && Deno.env.get("ATSRS_GITHUB_INSTALLATION_ID"));
    return json(200, { role: actor.owner ? "owner" : "developer_editor", identity: { id: actor.id, email: actor.email, display_name: actor.membership?.display_name || "Owner" }, mfa: actor.aal2 ? "verified" : "required", github_ready: githubReady, policy: publicPolicy() });
  }

  if (!actor.owner && !actor.developer) {
    await audit(admin, actor, action || "unknown", "denied", { reason: actor.status || "no_role" });
    return json(403, { code: "DEVELOPER_ACCESS_DENIED", error: "Developer Editor access is not assigned." });
  }
  const mfaResponse = requireMfa(actor);
  if (mfaResponse) return mfaResponse;

  if (action === "owner_list_developers") {
    if (!actor.owner) return json(403, { error: "Owner access is required." });
    const result = await admin.from("atsrs_developer_memberships").select("user_id,email,display_name,role,status,access_scope,invited_at,activated_at,last_login_at,disabled_at,revoked_at,updated_at").order("updated_at", { ascending: false }).limit(100);
    return result.error ? json(500, { error: "Developer access could not be loaded." }) : json(200, { developers: result.data || [] });
  }

  if (action === "owner_invite") {
    if (!actor.owner) return json(403, { error: "Owner access is required." });
    const email = clean(body.email, 254).toLowerCase();
    const displayName = clean(body.display_name, 120);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || displayName.length < 2) return json(400, { error: "Valid email and display name are required." });
    let invitedUser: { id: string } | null = null;
    for (let page = 1; page <= 10 && !invitedUser; page += 1) {
      const users = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (users.error) return json(500, { error: "Existing ATSRS accounts could not be checked safely." });
      invitedUser = users.data.users.find((item) => String(item.email || "").toLowerCase() === email) || null;
      if (users.data.users.length < 1000) break;
    }
    let invitationSent = false;
    if (!invitedUser) {
      const invite = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${ORIGIN}/developer/`, data: { atsrs_invite: "developer_editor", display_name: displayName } });
      if (invite.error || !invite.data.user) {
        await audit(admin, actor, "developer_invite", "failed", { email, reason: clean(invite.error?.message, 160) });
        return json(400, { error: "The developer invitation could not be created." });
      }
      invitedUser = invite.data.user;
      invitationSent = true;
    }
    const write = await admin.from("atsrs_developer_memberships").upsert({ user_id: invitedUser.id, email, display_name: displayName, status: "invited", access_scope: { profiles: ["frontend_safe"] }, invited_by: actor.id, invited_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (write.error) return json(500, { error: "Developer membership could not be stored." });
    await audit(admin, actor, "developer_invite", "completed", { email, user_id: invitedUser.id, invitation_sent: invitationSent });
    return json(200, { invited: true, invitation_sent: invitationSent, user_id: invitedUser.id });
  }

  if (action === "owner_update_developer") {
    if (!actor.owner) return json(403, { error: "Owner access is required." });
    const userId = clean(body.user_id, 50), status = clean(body.status, 20);
    if (!UUID.test(userId) || !["active", "disabled", "revoked"].includes(status)) return json(400, { error: "Invalid developer update." });
    const currentMembership = await admin.from("atsrs_developer_memberships").select("session_revision").eq("user_id", userId).maybeSingle();
    if (currentMembership.error || !currentMembership.data) return json(404, { error: "Developer was not found." });
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { status, updated_at: now, session_revision: Number(currentMembership.data.session_revision || 0) + 1 };
    if (status === "active") { updates.activated_at = now; updates.disabled_at = null; updates.revoked_at = null; }
    if (status === "disabled") updates.disabled_at = now;
    if (status === "revoked") updates.revoked_at = now;
    const result = await admin.from("atsrs_developer_memberships").update(updates).eq("user_id", userId).select("user_id,status").maybeSingle();
    if (result.error || !result.data) return json(404, { error: "Developer was not found." });
    // Every Developer API call re-reads this server-side status. Disabling or
    // revoking therefore invalidates Developer privileges immediately without
    // destroying the person's unrelated Personal/Corporate ATSRS session.
    await audit(admin, actor, status === "revoked" ? "developer_revoke" : "developer_status", "completed", { target_user_id: userId, status });
    return json(200, { updated: true, status });
  }

  if (action === "audit_log") {
    let query = admin.from("atsrs_developer_audit").select("id,actor_id,actor_role,action,result,change_id,files,metadata,created_at").order("created_at", { ascending: false }).limit(200);
    if (!actor.owner) query = query.eq("actor_id", actor.id);
    const result = await query;
    return result.error ? json(500, { error: "Audit history could not be loaded." }) : json(200, { audit: result.data || [] });
  }

  let github: Awaited<ReturnType<typeof githubContext>> = null;
  try { github = await githubContext(); } catch (error) { return json(503, { code: "DEVELOPER_GITHUB_UNAVAILABLE", error: clean(error instanceof Error ? error.message : error, 240) }); }
  if (!github) return json(503, { code: "DEVELOPER_GITHUB_NOT_CONFIGURED", error: "Owner must install the restricted ATSRS GitHub App before repository actions are enabled." });

  if (action === "list_changes" || action === "history") {
    let query = admin.from("atsrs_developer_changes").select("*").order("updated_at", { ascending: false }).limit(100);
    if (!actor.owner) query = query.eq("developer_id", actor.id);
    const result = await query;
    return result.error ? json(500, { error: "Changes could not be loaded." }) : json(200, { changes: result.data || [] });
  }

  if (action === "create_change") {
    const title = clean(body.title, 140), description = clean(body.description, 2000), bug = clean(body.bug_summary, 1000), area = clean(body.affected_area, 80);
    if (title.length < 3 || description.length < 10 || bug.length < 3 || area.length < 2) return json(400, { error: "Complete the change summary before creating a branch." });
    const main = await gh(github, "/git/ref/heads/main");
    const baseSha = clean(main?.object?.sha, 40);
    if (!SHA.test(baseSha)) return json(503, { error: "Main branch could not be resolved." });
    const shortUser = actor.id.slice(0, 8), slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 44) || "change";
    const branch = `developer-editor/${shortUser}/${slug}-${crypto.randomUUID().slice(0, 8)}`;
    await gh(github, "/git/refs", { method: "POST", body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }) });
    const insert = await admin.from("atsrs_developer_changes").insert({ developer_id: actor.id, title, description, bug_summary: bug, affected_area: area, branch_name: branch, base_sha: baseSha, head_sha: baseSha }).select("*").single();
    if (insert.error) return json(500, { error: "Change record could not be created." });
    await audit(admin, actor, "change_created", "completed", { branch }, insert.data.id);
    return json(200, { change: insert.data });
  }

  const change = await findChange(admin, actor, body.change_id);
  if (!change) return json(404, { error: "Change was not found." });
  const changeId = String(change.id), branch = String(change.branch_name);
  if (!isDeveloperBranch(branch)) return json(409, { error: "Invalid isolated branch." });

  if (action === "list_files") {
    const tree = await gh(github, `/git/trees/${encodeURIComponent(branch)}?recursive=1`);
    const files = (tree?.tree || []).filter((item: Record<string, unknown>) => item.type === "blob" && classifyPath(item.path) !== "DENIED").map((item: Record<string, unknown>) => ({ path: item.path, risk: classifyPath(item.path), size: item.size })).slice(0, 1000);
    return json(200, { files, policy: publicPolicy() });
  }

  if (action === "open_file") {
    const path = normalizeRepoPath(body.path), classification = classifyPath(path);
    if (classification === "DENIED") { await audit(admin, actor, "file_open", "denied", { code: "DEVELOPER_SCOPE_VIOLATION" }, changeId, [path]); return json(403, { code: "DEVELOPER_SCOPE_VIOLATION", error: "This file is outside the Developer Editor scope." }); }
    const file = await gh(github, `/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(branch)}`);
    await audit(admin, actor, "file_open", "allowed", { risk: classification }, changeId, [path]);
    return json(200, { path, risk: classification, sha: file.sha, content: decodeContent(file.content || "") });
  }

  if (action === "save_file") {
    const path = normalizeRepoPath(body.path), classification = classifyPath(path), content = String(body.content ?? "");
    if (classification === "DENIED") { await audit(admin, actor, "file_save", "denied", { code: "DEVELOPER_SCOPE_VIOLATION" }, changeId, [path]); return json(403, { code: "DEVELOPER_SCOPE_VIOLATION", error: "This file is outside the Developer Editor scope." }); }
    if (content.length > 750000 || content.includes("BEGIN PRIVATE KEY") || /SUPABASE_SERVICE_ROLE_KEY|CLOUDFLARE_API_TOKEN|GITHUB_TOKEN/.test(content)) return json(400, { error: "The content is too large or contains a forbidden secret marker." });
    const existing = await gh(github, `/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(branch)}`);
    const saved = await gh(github, `/contents/${path.split("/").map(encodeURIComponent).join("/")}`, { method: "PUT", body: JSON.stringify({ message: `Developer Editor: ${clean(change.title, 100)}`, content: encodeContent(content), sha: existing.sha, branch }) });
    const headSha = clean(saved?.commit?.sha, 40);
    const compare = await gh(github, `/compare/${encodeURIComponent(String(change.base_sha))}...${encodeURIComponent(branch)}`);
    const files = (compare?.files || []).map((item: Record<string, unknown>) => String(item.filename));
    const risk = classifyFiles(files);
    if (risk === "DENIED") { await audit(admin, actor, "scope_validation", "denied", { code: "DEVELOPER_SCOPE_VIOLATION" }, changeId, files); return json(409, { code: "DEVELOPER_SCOPE_VIOLATION", error: "The branch contains an unauthorised file and is blocked." }); }
    await admin.from("atsrs_developer_changes").update({ head_sha: headSha, modified_files: files, risk_class: risk, status: "draft", checks: {}, updated_at: new Date().toISOString() }).eq("id", changeId);
    await audit(admin, actor, "file_save", "completed", { risk }, changeId, [path]);
    return json(200, { saved: true, head_sha: headSha, files, risk });
  }

  if (action === "diff") {
    const compare = await gh(github, `/compare/${encodeURIComponent(String(change.base_sha))}...${encodeURIComponent(branch)}`);
    const files = (compare?.files || []).map((item: Record<string, unknown>) => ({ filename: item.filename, status: item.status, additions: item.additions, deletions: item.deletions, changes: item.changes, patch: String(item.patch || "").slice(0, 100000) }));
    return json(200, { ahead_by: compare.ahead_by, behind_by: compare.behind_by, files, risk: classifyFiles(files.map((item: Record<string, unknown>) => item.filename)) });
  }

  if (action === "create_preview") {
    const entry = normalizeRepoPath(body.entry_path);
    if (!SAFE_PREVIEW_ENTRIES.has(entry)) return json(403, { code: "DEVELOPER_SCOPE_VIOLATION", error: "Only safe fixture previews are allowed." });
    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)))).map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await admin.from("atsrs_developer_preview_tokens").insert({ change_id: changeId, token_hash: digest, entry_path: entry, expires_at: expires, created_by: actor.id });
    await audit(admin, actor, "preview_created", "completed", { entry, expires_at: expires }, changeId, [entry]);
    return json(200, { preview_url: `${url}/functions/v1/developer-editor-preview/${token}/${entry}`, expires_at: expires });
  }

  if (action === "sync_change") {
    const main = await gh(github, "/git/ref/heads/main");
    const mainSha = clean(main?.object?.sha, 40);
    if (!SHA.test(mainSha)) return json(503, { error: "Main branch could not be resolved." });
    if (mainSha === change.base_sha) return json(200, { synced: false, head_sha: change.head_sha });
    const upstream = await gh(github, `/compare/${encodeURIComponent(branch)}...${encodeURIComponent(mainSha)}`);
    const upstreamFiles = (upstream?.files || []).map((item: Record<string, unknown>) => String(item.filename));
    const ownFiles = ((change.modified_files || []) as string[]);
    const overlap = upstreamFiles.filter((path: string) => ownFiles.includes(path));
    if (overlap.length) {
      await admin.from("atsrs_developer_changes").update({ status: "blocked_by_main", updated_at: new Date().toISOString() }).eq("id", changeId);
      await audit(admin, actor, "sync_change", "denied", { code: "DEVELOPER_EDITOR_BLOCKED_BY_MAIN", overlap }, changeId, overlap);
      return json(409, { code: "DEVELOPER_EDITOR_BLOCKED_BY_MAIN", error: "Main changed a file used by this change. Main Developer must resolve it.", files: overlap });
    }
    let merged: Record<string, unknown>;
    try {
      merged = await gh(github, "/merges", { method: "POST", body: JSON.stringify({ base: branch, head: mainSha, commit_message: `Developer Editor: sync ${changeId} with main` }) }) as Record<string, unknown>;
    } catch (_) {
      await admin.from("atsrs_developer_changes").update({ status: "blocked_by_main", updated_at: new Date().toISOString() }).eq("id", changeId);
      return json(409, { code: "DEVELOPER_EDITOR_BLOCKED_BY_MAIN", error: "The change could not sync cleanly with Main." });
    }
    const headSha = clean(merged.sha, 40);
    await admin.from("atsrs_developer_changes").update({ base_sha: mainSha, head_sha: headSha, status: "draft", checks: {}, updated_at: new Date().toISOString() }).eq("id", changeId);
    await audit(admin, actor, "sync_change", "completed", { base_sha: mainSha, head_sha: headSha }, changeId, ownFiles);
    return json(200, { synced: true, base_sha: mainSha, head_sha: headSha });
  }

  if (action === "run_checks") {
    await gh(github, "/actions/workflows/developer-editor-checks.yml/dispatches", { method: "POST", body: JSON.stringify({ ref: branch, inputs: { change_id: changeId } }) });
    const now = new Date().toISOString();
    await admin.from("atsrs_developer_changes").update({ status: "checking", checks: { requested_at: now, head_sha: change.head_sha }, updated_at: now }).eq("id", changeId);
    await audit(admin, actor, "checks_run", "requested", { head_sha: change.head_sha }, changeId, (change.modified_files as string[]) || []);
    return json(200, { requested: true });
  }

  if (action === "checks_status") {
    const runs = await gh(github, `/actions/workflows/developer-editor-checks.yml/runs?branch=${encodeURIComponent(branch)}&event=workflow_dispatch&per_page=5`);
    const run = (runs?.workflow_runs || []).find((item: Record<string, unknown>) => item.head_sha === change.head_sha) || null;
    if (!run) return json(200, { status: "pending" });
    const passed = run.status === "completed" && run.conclusion === "success";
    const failed = run.status === "completed" && run.conclusion !== "success";
    const status = passed ? "ready" : failed ? "checks_failed" : "checking";
    const checks = { run_id: run.id, url: run.html_url, status: run.status, conclusion: run.conclusion, head_sha: run.head_sha, completed_at: run.updated_at };
    await admin.from("atsrs_developer_changes").update({ status, checks, updated_at: new Date().toISOString() }).eq("id", changeId);
    return json(200, { status, checks });
  }

  if (action === "request_approval" || action === "publish") {
    const current = await findChange(admin, actor, changeId) as Record<string, unknown>;
    const files = (current.modified_files as string[]) || [], risk = classifyFiles(files);
    const checks = (current.checks || {}) as Record<string, unknown>;
    if (!files.length || risk === "DENIED") return json(409, { code: "DEVELOPER_SCOPE_VIOLATION", error: "Publication scope is invalid." });
    if (checks.conclusion !== "success" || checks.head_sha !== current.head_sha) return json(409, { code: "PUBLISH_BLOCKED", error: "Checks must pass for the exact current commit." });
    const branchRef = await gh(github, `/git/ref/heads/${branch.split("/").map(encodeURIComponent).join("/")}`);
    if (branchRef?.object?.sha !== current.head_sha) return json(409, { code: "PUBLISH_BLOCKED", error: "The branch changed after checks completed. Run checks again." });
    const prs = await gh(github, `/pulls?head=${encodeURIComponent(`${github.owner}:${branch}`)}&state=open`);
    const pr = prs?.[0] || await gh(github, "/pulls", { method: "POST", body: JSON.stringify({ title: `[Developer Editor] ${current.title}`, head: branch, base: "main", body: `${current.description}\n\nRisk: ${risk}\nChange: ${changeId}` }) });
    if (risk === "OWNER_APPROVAL_REQUIRED" || action === "request_approval") {
      await admin.from("atsrs_developer_changes").update({ status: "approval_requested", approval: { requested_at: new Date().toISOString(), pull_request: pr.html_url, number: pr.number }, updated_at: new Date().toISOString() }).eq("id", changeId);
      await audit(admin, actor, "publish_requested", "requested", { risk, pull_request: pr.html_url }, changeId, files);
      return json(200, { approval_required: true, pull_request: pr.html_url });
    }
    const merge = await gh(github, `/pulls/${pr.number}/merge`, { method: "PUT", body: JSON.stringify({ merge_method: "squash", commit_title: `[Developer Editor] ${current.title}`, sha: current.head_sha }) });
    if (!merge?.merged) return json(409, { code: "DEVELOPER_EDITOR_BLOCKED_BY_MAIN", error: "The change could not be merged cleanly." });
    const deployedAt = new Date().toISOString();
    await gh(github, "/actions/workflows/developer-editor-post-deploy.yml/dispatches", { method: "POST", body: JSON.stringify({ ref: "main", inputs: { change_id: changeId, commit_sha: merge.sha } }) });
    await admin.from("atsrs_developer_changes").update({ status: "rollback_ready", deployment: { commit_sha: merge.sha, pull_request: pr.html_url, deployed_at: deployedAt, post_deploy: "requested" }, rollback: { eligible: true, source_commit: merge.sha }, deployed_at: deployedAt, updated_at: deployedAt }).eq("id", changeId);
    await audit(admin, actor, "production_deployed", "completed", { commit_sha: merge.sha, pull_request: pr.html_url }, changeId, files);
    return json(200, { deployed: true, commit_sha: merge.sha, pull_request: pr.html_url, post_deploy: "pending" });
  }

  if (action === "owner_decide") {
    if (!actor.owner) return json(403, { error: "Owner access is required." });
    const current = await findChange(admin, actor, changeId) as Record<string, unknown>;
    const decision = clean(body.decision, 20), approval = (current.approval || {}) as Record<string, unknown>, prNumber = Number(approval.number);
    if (!["approve", "reject", "request_changes"].includes(decision) || !prNumber) return json(400, { error: "Invalid approval decision." });
    if (decision !== "approve") {
      await admin.from("atsrs_developer_changes").update({ status: "rejected", approval: { ...approval, decision, decided_by: actor.id, decided_at: new Date().toISOString(), note: clean(body.note, 1000) }, updated_at: new Date().toISOString() }).eq("id", changeId);
      await audit(admin, actor, "approval_decision", "completed", { decision }, changeId, (current.modified_files as string[]) || []);
      return json(200, { decision });
    }
    const files = (current.modified_files as string[]) || [], risk = classifyFiles(files), checks = (current.checks || {}) as Record<string, unknown>;
    if (!files.length || risk === "DENIED") return json(409, { code: "DEVELOPER_SCOPE_VIOLATION", error: "Approval scope is invalid." });
    if (checks.conclusion !== "success" || checks.head_sha !== current.head_sha) return json(409, { code: "PUBLISH_BLOCKED", error: "Checks must pass for the exact current commit." });
    const branchRef = await gh(github, `/git/ref/heads/${branch.split("/").map(encodeURIComponent).join("/")}`);
    if (branchRef?.object?.sha !== current.head_sha) return json(409, { code: "PUBLISH_BLOCKED", error: "The branch changed after checks completed. Run checks again." });
    const merge = await gh(github, `/pulls/${prNumber}/merge`, { method: "PUT", body: JSON.stringify({ merge_method: "squash", commit_title: `[Owner approved] ${current.title}`, sha: current.head_sha }) });
    if (!merge?.merged) return json(409, { code: "DEVELOPER_EDITOR_BLOCKED_BY_MAIN", error: "The approved change could not be merged cleanly." });
    const now = new Date().toISOString();
    await gh(github, "/actions/workflows/developer-editor-post-deploy.yml/dispatches", { method: "POST", body: JSON.stringify({ ref: "main", inputs: { change_id: changeId, commit_sha: merge.sha } }) });
    await admin.from("atsrs_developer_changes").update({ status: "rollback_ready", approval: { ...approval, decision: "approved", decided_by: actor.id, decided_at: now }, deployment: { commit_sha: merge.sha, pull_request: approval.pull_request, deployed_at: now, post_deploy: "requested" }, rollback: { eligible: false, owner_required: true, source_commit: merge.sha }, deployed_at: now, updated_at: now }).eq("id", changeId);
    await audit(admin, actor, "approval_decision", "completed", { decision: "approved", commit_sha: merge.sha }, changeId, files);
    return json(200, { decision: "approved", commit_sha: merge.sha });
  }

  if (action === "rollback") {
    const rollback = (change.rollback || {}) as Record<string, unknown>, deployment = (change.deployment || {}) as Record<string, unknown>;
    if (!rollback.eligible || change.developer_id !== actor.id || !deployment.commit_sha) return json(403, { error: "This rollback requires Owner or Main Developer." });
    await gh(github, "/actions/workflows/developer-editor-rollback.yml/dispatches", { method: "POST", body: JSON.stringify({ ref: "main", inputs: { change_id: changeId, source_sha: deployment.commit_sha } }) });
    const now = new Date().toISOString();
    await admin.from("atsrs_developer_changes").update({ status: "rollback_ready", rollback: { ...rollback, requested_at: now, workflow: "developer-editor-rollback.yml", status: "requested" }, updated_at: now }).eq("id", changeId);
    await audit(admin, actor, "rollback", "requested", { source_commit: deployment.commit_sha }, changeId, (change.modified_files as string[]) || []);
    return json(202, { rollback_requested: true, status: "protected_workflow_requested" });
  }

  return json(400, { error: "Unknown action." });
});
