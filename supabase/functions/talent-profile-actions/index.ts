import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://atsrs.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Body = {
  action?: string;
  target_user_id?: string;
  company?: string;
  message?: string;
  message_id?: string;
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clean(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function documentStatus(expiry: string | null | undefined) {
  if (!expiry) return "No expiry";
  const today = new Date();
  const midnight = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const target = Date.parse(`${expiry}T00:00:00Z`);
  if (!Number.isFinite(target)) return "Date not confirmed";
  const days = Math.ceil((target - midnight) / 86400000);
  if (days < 0) return "Expired";
  if (days === 0) return "Expires today";
  if (days <= 30) return `${days} days remaining`;
  if (days <= 90) return `Expires within ${days} days`;
  return "Valid";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed." });

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("Authorization") || "";
  if (!url || !anonKey || !serviceKey || !authorization.startsWith("Bearer ")) {
    return json(401, { error: "Authentication is required." });
  }

  const token = authorization.slice(7).trim();
  const authClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  const user = userData.user;
  if (userError || !user) return json(401, { error: "The session is invalid or expired." });

  let body: Body;
  try { body = await req.json(); } catch (_) { return json(400, { error: "Invalid request." }); }
  const action = clean(body.action, 40);
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (action === "inbox") {
    const { data, error } = await admin
      .from("atsrs_talent_messages")
      .select("id,sender_email,sender_company,body,read_at,created_at")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return json(500, { error: "Messages could not be loaded." });
    return json(200, { messages: data || [] });
  }

  if (action === "mark_read") {
    const messageId = clean(body.message_id, 50);
    if (!messageId) return json(400, { error: "Message is required." });
    const { error } = await admin
      .from("atsrs_talent_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("id", messageId)
      .eq("recipient_id", user.id);
    if (error) return json(500, { error: "Message status could not be updated." });
    return json(200, { updated: true });
  }

  const targetUserId = clean(body.target_user_id, 50);
  if (!targetUserId) return json(400, { error: "Professional profile is required." });

  const { data: companyWorkspaces, error: companyWorkspaceError } = await admin
    .from("atsrs_workspaces")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("account_type", "company")
    .limit(1);
  if (companyWorkspaceError) {
    console.error("talent-profile-actions workspace lookup failed", {
      user_id: user.id,
      code: companyWorkspaceError.code,
      message: companyWorkspaceError.message,
    });
    return json(500, { error: "Your Corporate workspace could not be verified. Please try again." });
  }
  if (!companyWorkspaces?.length) {
    return json(403, { error: "Open your ATSRS Corporate workspace to use this function." });
  }

  const { data: profile } = await admin
    .from("atsrs_talent_profiles")
    .select("user_id,name,surname,discoverable")
    .eq("user_id", targetUserId)
    .eq("discoverable", true)
    .maybeSingle();
  if (!profile) return json(404, { error: "This professional profile is unavailable." });

  if (action === "summary") {
    const { data: files, error } = await admin
      .from("atsrs_files")
      .select("category,file_name,metadata,created_at")
      .eq("user_id", targetUserId)
      .eq("account_type", "personal")
      .eq("category", "document")
      .order("created_at", { ascending: false });
    if (error) return json(500, { error: "Document summary could not be loaded." });
    const documents = (files || []).map((file: Record<string, unknown>) => {
      const metadata = (file.metadata || {}) as Record<string, unknown>;
      const document = (metadata.document || {}) as Record<string, unknown>;
      const expiry = clean(document.expiry, 20) || null;
      return {
        title: clean(document.type, 160) || clean(file.file_name, 160) || "Document",
        provider: clean(document.provider, 140) || "Provider not listed",
        expiry,
        status: documentStatus(expiry),
      };
    });
    const counts = documents.reduce((value, document) => {
      value.total += 1;
      if (document.status === "Expired") value.expired += 1;
      else if (document.status.includes("remaining") || document.status.includes("within") || document.status === "Expires today") value.expiryRisk += 1;
      else value.current += 1;
      return value;
    }, { total: 0, current: 0, expiryRisk: 0, expired: 0 });
    return json(200, { professional: `${profile.name} ${profile.surname}`, counts, documents });
  }

  if (action === "cv") {
    const { data: cv, error } = await admin
      .from("atsrs_files")
      .select("file_name,mime_type,storage_path")
      .eq("user_id", targetUserId)
      .eq("account_type", "personal")
      .eq("category", "cv")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return json(500, { error: "CV could not be loaded." });
    if (!cv) return json(404, { error: "This professional has not added a CV yet." });
    const signed = await admin.storage.from("atsrs-user-files").createSignedUrl(cv.storage_path, 300);
    if (signed.error || !signed.data?.signedUrl) return json(500, { error: "CV preview could not be prepared." });
    return json(200, { file_name: cv.file_name, mime_type: cv.mime_type, url: signed.data.signedUrl });
  }

  if (action === "send_message") {
    const company = clean(body.company, 140);
    const message = clean(body.message, 1200);
    if (company.length < 2) return json(400, { error: "Enter your company name." });
    if (message.length < 10) return json(400, { error: "Write a message of at least 10 characters." });
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("atsrs_talent_messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", user.id)
      .gte("created_at", since);
    if ((count || 0) >= 10) return json(429, { error: "Daily message limit reached. Try again later." });
    const { error } = await admin.from("atsrs_talent_messages").insert({
      sender_id: user.id,
      recipient_id: targetUserId,
      sender_email: clean(user.email, 254),
      sender_company: company,
      body: message,
    });
    if (error) return json(500, { error: "Your message could not be sent." });
    return json(200, { sent: true });
  }

  return json(400, { error: "Unknown action." });
});
