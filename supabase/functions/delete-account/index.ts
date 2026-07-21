import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://atsrs.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

  const authClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser();
  const user = userData.user;
  if (userError || !user) return json(401, { error: "The session is invalid or expired." });

  let body: { email?: string; confirmation?: string } = {};
  try { body = await req.json(); } catch (_) { return json(400, { error: "Invalid request." }); }
  if (body.confirmation !== "DELETE MY ATSRS ACCOUNT") {
    return json(400, { error: "Permanent deletion was not confirmed." });
  }
  if (!body.email || body.email.trim().toLowerCase() !== (user.email || "").trim().toLowerCase()) {
    return json(400, { error: "The confirmation email does not match this account." });
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Auth deletion cascades the ATSRS database records. Storage objects are not
  // covered by those database foreign keys, so remove the user's private files
  // first and abort if that cleanup cannot be completed.
  const { data: fileRows, error: filesError } = await admin
    .from("atsrs_files")
    .select("storage_path")
    .eq("user_id", user.id);
  if (filesError) {
    console.error("delete-account could not list files", { userId: user.id, message: filesError.message });
    return json(500, { error: "Your documents could not be prepared for deletion." });
  }
  const storagePaths = (fileRows || [])
    .map((row: { storage_path?: string }) => row.storage_path)
    .filter((path: string | undefined): path is string => Boolean(path));
  for (let offset = 0; offset < storagePaths.length; offset += 100) {
    const { error: storageError } = await admin.storage
      .from("atsrs-user-files")
      .remove(storagePaths.slice(offset, offset + 100));
    if (storageError) {
      console.error("delete-account could not remove files", { userId: user.id, message: storageError.message });
      return json(500, { error: "Your stored documents could not be deleted safely." });
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("delete-account failed", { userId: user.id, message: deleteError.message });
    return json(500, { error: "The account could not be deleted." });
  }
  return json(200, { deleted: true });
});
