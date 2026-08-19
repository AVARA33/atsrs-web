import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://atsrs.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-atsrs-client-build",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Body = {
  action?: string;
  target_user_id?: string;
  company?: string;
  message?: string;
  message_id?: string;
  mailbox?: string;
  professional_user_ids?: string[];
  page_size?: number;
  offset?: number;
  cursor_active_at?: string;
  cursor_user_id?: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clean(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function workspaceProfilePayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return {} as Record<string, unknown>;
  const value = (payload as Record<string, unknown>).value;
  if (value && typeof value === "object") return value as Record<string, unknown>;
  if (typeof value !== "string") return {} as Record<string, unknown>;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch (_) {
    return {} as Record<string, unknown>;
  }
}

function currentPersonnelProfile(
  talentProfile: Record<string, unknown> | null,
  workspaceRow: Record<string, unknown> | null,
) {
  if (!talentProfile && !workspaceRow) return null;
  const profile = { ...(talentProfile || {}) } as Record<string, unknown>;
  const source = workspaceProfilePayload(workspaceRow?.payload);
  const has = (key: string) => Object.prototype.hasOwnProperty.call(source, key);
  const set = (target: string, sourceKey: string, max: number) => {
    if (has(sourceKey)) profile[target] = clean(source[sourceKey], max) || null;
  };
  set("name", "name", 120);
  set("surname", "surname", 120);
  set("position", "position", 160);
  set("country", "country", 120);
  set("company", "company", 160);
  set("avatar_url", "avatarUrl", 4000);
  set("availability_status", "availabilityStatus", 40);
  set("available_from", "availableFrom", 20);
  set("work_preference", "workPreference", 40);
  set("availability_confirmed_at", "availabilityConfirmedAt", 40);
  if (has("workPreferences")) {
    profile.work_preferences = Array.isArray(source.workPreferences)
      ? source.workPreferences.map((value) => clean(value, 40)).filter(Boolean)
      : [];
  }
  if (workspaceRow?.updated_at) profile.updated_at = clean(workspaceRow.updated_at, 40);
  return profile;
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

function complianceExpiry(file: Record<string, unknown>) {
  const metadata = (file.metadata || {}) as Record<string, unknown>;
  const document = (metadata.document || {}) as Record<string, unknown>;
  const expiry = clean(document.expiry, 20);
  if (!expiry) return "current";
  const today = new Date();
  const midnight = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const target = Date.parse(`${expiry}T00:00:00Z`);
  if (!Number.isFinite(target)) return "current";
  const days = Math.ceil((target - midnight) / 86400000);
  if (days < 0) return "expired";
  if (days <= 30) return "expiring_30";
  if (days <= 90) return "expiring_90";
  return "current";
}

function complianceDocument(file: Record<string, unknown>) {
  const metadata = (file.metadata || {}) as Record<string, unknown>;
  const document = (metadata.document || {}) as Record<string, unknown>;
  const expiry = clean(document.expiry, 20);
  return {
    title: clean(document.type || file.category, 200) || "Document",
    provider: clean(document.provider, 200),
    expiry: expiry || null,
    status: documentStatus(expiry),
    uploaded_at: clean(file.created_at, 40) || null,
  };
}

function notificationDocumentKey(userId: unknown, title: unknown, expiry: unknown) {
  return [
    clean(userId, 50).toLowerCase(),
    clean(title, 200).toLowerCase(),
    clean(expiry, 20),
  ].join("|");
}

async function persistedCertificateFileIds(
  admin: ReturnType<typeof createClient>,
  userId: string,
) {
  const certificateResult = await admin
    .from("atsrs_personnel_certificates")
    .select("file_id")
    .eq("workspace_user_id", userId)
    .eq("workspace_account_type", "personal")
    .not("file_id", "is", null)
    .limit(1000);
  if (certificateResult.error) return { ids: [] as string[], error: certificateResult.error };
  const candidateIds = Array.from(new Set(
    (certificateResult.data || [])
      .map((row) => clean(row.file_id, 50))
      .filter((id) => UUID_PATTERN.test(id)),
  ));
  if (!candidateIds.length) return { ids: [] as string[], error: null };

  const fileResult = await admin
    .from("atsrs_files")
    .select("id")
    .in("id", candidateIds)
    .eq("user_id", userId)
    .eq("account_type", "personal")
    .eq("category", "document")
    .limit(1000);
  return {
    ids: (fileResult.data || []).map((row) => clean(row.id, 50)).filter(Boolean),
    error: fileResult.error,
  };
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
    const mailbox = clean(body.mailbox, 20) === "archived" ? "archived" : "active";
    let query = admin
      .from("atsrs_talent_messages")
      .select("id,sender_email,sender_company,body,read_at,archived_at,created_at")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    query = mailbox === "archived" ? query.not("archived_at", "is", null) : query.is("archived_at", null);
    const { data, error } = await query;
    if (error) return json(500, { error: "Messages could not be loaded." });
    return json(200, { messages: data || [] });
  }

  if (action === "mark_read" || action === "archive_message" || action === "restore_message" || action === "delete_message") {
    const messageId = clean(body.message_id, 50);
    if (!messageId) return json(400, { error: "Message is required." });
    if (action === "delete_message") {
      const { data, error } = await admin
        .from("atsrs_talent_messages")
        .delete()
        .eq("id", messageId)
        .eq("recipient_id", user.id)
        .select("id")
        .maybeSingle();
      if (error) return json(500, { error: "Message could not be deleted." });
      if (!data) return json(404, { error: "Message was not found." });
      return json(200, { deleted: true });
    }
    const changes = action === "mark_read"
      ? { read_at: new Date().toISOString() }
      : { archived_at: action === "archive_message" ? new Date().toISOString() : null };
    const { data, error } = await admin
      .from("atsrs_talent_messages")
      .update(changes)
      .eq("id", messageId)
      .eq("recipient_id", user.id)
      .select("id")
      .maybeSingle();
    if (error) return json(500, { error: "Message status could not be updated." });
    if (!data) return json(404, { error: "Message was not found." });
    return json(200, { updated: true });
  }

  // Verify Corporate access with the caller's JWT and the existing RLS policy.
  // The directory itself uses this same authoritative workspace row. Using the
  // service client here made every action fail when the service schema cache
  // could not resolve atsrs_workspaces, even though the signed-in user had a
  // valid Corporate workspace.
  const { data: companyWorkspaces, error: companyWorkspaceError } = await authClient
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
    return json(500, { error: "Your Corporate workspace could not be verified. Refresh the page and try again." });
  }
  if (!companyWorkspaces?.length) {
    return json(403, { error: "Open your ATSRS Corporate workspace to use this function." });
  }

  if (action === "compliance" || action === "report") {
    const requestedProfessionalIds = Array.isArray(body.professional_user_ids)
      ? Array.from(new Set(body.professional_user_ids
        .map((value) => clean(value, 50))
        .filter((value) => UUID_PATTERN.test(value))))
        .slice(0, 30)
      : [];
    let linksQuery = admin
      .from("atsrs_talent_personnel_links")
      .select("professional_user_id,status,updated_at")
      .eq("company_user_id", user.id)
      .eq("status", "linked")
      .order("updated_at", { ascending: false })
      .limit(2000);
    if (requestedProfessionalIds.length) {
      linksQuery = linksQuery.in("professional_user_id", requestedProfessionalIds);
    }
    const { data: links, error: linksError } = await linksQuery;
    if (linksError) return json(500, { error: "Company Personnel could not be loaded." });

    const professionalIds = Array.from(new Set(
      (links || []).map((link) => clean(link.professional_user_id, 50)).filter(Boolean),
    ));
    if (!professionalIds.length) {
      const empty = {
        generated_at: new Date().toISOString(),
        summary: { personnel: 0, ready: 0, review: 0, documents: 0, expired: 0, expiring: 0 },
        rows: [],
      };
      return json(200, action === "report" ? { report: empty } : { compliance: empty });
    }

    const [profileResult, fileResult, notificationResult] = await Promise.all([
      admin
        .from("atsrs_talent_profiles")
        .select("user_id,name,surname,position,country,company")
        .in("user_id", professionalIds)
        .limit(2000),
      admin
        .from("atsrs_files")
        .select("user_id,category,metadata,created_at")
        .eq("account_type", "personal")
        .in("user_id", professionalIds)
        .limit(10000),
      admin
        .from("atsrs_notifications")
        .select("id,user_id,document_type,expiry_date,created_at")
        .eq("account_type", "personal")
        .in("user_id", professionalIds)
        .order("created_at", { ascending: false })
        .limit(10000),
    ]);
    if (profileResult.error) return json(500, { error: "Personnel profiles could not be loaded." });
    if (fileResult.error) return json(500, { error: "Personnel documents could not be loaded." });
    if (notificationResult.error) return json(500, { error: "Personnel notification status could not be loaded." });

    const notificationIds = (notificationResult.data || []).map((item) => clean(item.id, 50)).filter(Boolean);
    const sentOutboxRows: Record<string, unknown>[] = [];
    for (let offset = 0; offset < notificationIds.length; offset += 100) {
      const { data: outboxPage, error: outboxError } = await admin
        .from("atsrs_notification_outbox")
        .select("notification_id,status,sent_at,created_at")
        .eq("account_type", "personal")
        .eq("channel", "email")
        .eq("status", "sent")
        .in("notification_id", notificationIds.slice(offset, offset + 100))
        .order("sent_at", { ascending: false });
      if (outboxError) return json(500, { error: "Personnel email notification status could not be loaded." });
      sentOutboxRows.push(...((outboxPage || []) as Record<string, unknown>[]));
    }
    const sentAtByNotification = new Map<string, string>();
    sentOutboxRows.forEach((item) => {
      const notificationId = clean(item.notification_id, 50);
      if (!notificationId || sentAtByNotification.has(notificationId)) return;
      sentAtByNotification.set(notificationId, clean(item.sent_at || item.created_at, 40));
    });
    const sentEmailByDocument = new Map<string, { status: string; sent_at: string; count: number }>();
    (notificationResult.data || []).forEach((item) => {
      const sentAt = sentAtByNotification.get(clean(item.id, 50));
      if (!sentAt) return;
      const key = notificationDocumentKey(item.user_id, item.document_type, item.expiry_date);
      const existing = sentEmailByDocument.get(key);
      if (existing) existing.count += 1;
      else sentEmailByDocument.set(key, { status: "sent", sent_at: sentAt, count: 1 });
    });

    const filesByOwner = new Map<string, Record<string, unknown>[]>();
    (fileResult.data || []).forEach((file) => {
      const owner = clean(file.user_id, 50);
      if (!filesByOwner.has(owner)) filesByOwner.set(owner, []);
      filesByOwner.get(owner)?.push(file as Record<string, unknown>);
    });
    const profileMap = new Map((profileResult.data || []).map((profile) => [clean(profile.user_id, 50), profile]));
    const rows = professionalIds.map((professionalId) => {
      const profile = (profileMap.get(professionalId) || {}) as Record<string, unknown>;
      const files = filesByOwner.get(professionalId) || [];
      const expiry = files.reduce((counts, file) => {
        const bucket = complianceExpiry(file);
        counts[bucket] += 1;
        return counts;
      }, { current: 0, expiring_30: 0, expiring_90: 0, expired: 0 } as Record<string, number>);
      const status = expiry.expired > 0 || expiry.expiring_30 > 0 || expiry.expiring_90 > 0
          ? "review"
          : "ready";
      return {
        professional_user_id: professionalId,
        name: clean(profile.name, 120),
        surname: clean(profile.surname, 120),
        position: clean(profile.position, 160),
        country: clean(profile.country, 120),
        company: clean(profile.company, 160),
        status,
        document_count: files.length,
        current_count: expiry.current,
        expiring_30_count: expiry.expiring_30,
        expiring_90_count: expiry.expiring_90,
        expired_count: expiry.expired,
        documents: files.map((file) => {
          const document = complianceDocument(file);
          const emailNotification = sentEmailByDocument.get(
            notificationDocumentKey(professionalId, document.title, document.expiry),
          );
          return { ...document, email_notification: emailNotification || null };
        }),
      };
    });
    const summary = rows.reduce((totals, row) => {
      totals.personnel += 1;
      totals[row.status] += 1;
      totals.documents += row.document_count;
      totals.expired += row.expired_count;
      totals.expiring += row.expiring_30_count + row.expiring_90_count;
      return totals;
    }, { personnel: 0, ready: 0, review: 0, documents: 0, expired: 0, expiring: 0 } as Record<string, number>);
    const payload = { generated_at: new Date().toISOString(), summary, rows };
    return json(200, action === "report" ? { report: payload } : { compliance: payload });
  }

  if (action === "directory") {
    const pageSize = Math.max(1, Math.min(Number(body.page_size) || 30, 50));
    const cursorActiveAt = clean(body.cursor_active_at, 40) || null;
    const cursorUserId = clean(body.cursor_user_id, 50) || null;
    if ((cursorActiveAt && Number.isNaN(Date.parse(cursorActiveAt))) || (cursorUserId && !UUID_PATTERN.test(cursorUserId))) {
      return json(400, { error: "The Candidate page cursor is invalid." });
    }
    const directoryResult = await admin.rpc("atsrs_talent_directory_page", {
      p_limit: pageSize + 1,
      p_before_active_at: cursorActiveAt,
      p_before_user_id: cursorUserId,
    });
    if (directoryResult.error) return json(500, { error: "Candidate profiles could not be loaded." });
    const pageRows = (directoryResult.data || []) as Record<string, unknown>[];
    const hasMore = pageRows.length > pageSize;
    const profiles = pageRows.slice(0, pageSize).map((row) => {
      const profile = { ...row };
      delete profile.total_count;
      return profile;
    });
    const lastProfile = profiles[profiles.length - 1] || null;
    const totalCount = Number(pageRows[0]?.total_count || 0);
    console.info("talent-profile-actions directory", {
      eligible_profiles: totalCount,
      returned_profiles: profiles.length,
      has_more: hasMore,
    });
    return json(200, {
      profiles,
      meta: {
        eligible_profiles: totalCount,
        document_owners: totalCount,
        returned_profiles: profiles.length,
        has_more: hasMore,
        next_cursor: hasMore && lastProfile ? {
          active_at: lastProfile.last_active_at,
          user_id: lastProfile.user_id,
        } : null,
      },
    });
  }

  if (action === "personnel_links") {
    const pageSize = Math.max(1, Math.min(Number(body.page_size) || 30, 50));
    const offset = Math.max(0, Math.floor(Number(body.offset) || 0));
    const { data: linkPage, error: linksError, count } = await admin
      .from("atsrs_talent_personnel_links")
      .select("id,professional_user_id,status,source,created_at,updated_at", { count: "exact" })
      .eq("company_user_id", user.id)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + pageSize);
    if (linksError) return json(500, { error: "Company Personnel could not be loaded." });
    const hasMore = (linkPage || []).length > pageSize;
    const links = (linkPage || []).slice(0, pageSize);
    const professionalIds = (links || []).map((link) => link.professional_user_id);
    if (!professionalIds.length) return json(200, { personnel: [], meta: { total: count || 0, has_more: false, next_offset: offset } });
    const [profilesResult, workspaceProfilesResult, filesResult] = await Promise.all([
      admin
        .from("atsrs_talent_profiles")
        .select("user_id,name,surname,position,country,company,avatar_url,availability_status,available_from,work_preference,work_preferences,availability_confirmed_at,last_active_at,updated_at")
        .in("user_id", professionalIds),
      admin
        .from("atsrs_workspace_data")
        .select("user_id,payload,updated_at")
        .eq("account_type", "personal")
        .like("data_key", "%_personal_profile")
        .in("user_id", professionalIds)
        .order("updated_at", { ascending: false }),
      admin
        .from("atsrs_files")
        .select("user_id,created_at")
        .in("user_id", professionalIds)
        .eq("account_type", "personal")
        .eq("category", "document")
        .order("created_at", { ascending: false }),
    ]);
    const { data: linkedProfiles, error: profilesError } = profilesResult;
    if (profilesError) return json(500, { error: "Linked profiles could not be loaded." });
    if (workspaceProfilesResult.error) return json(500, { error: "Current Personnel profile details could not be loaded." });
    if (filesResult.error) return json(500, { error: "Personnel document activity could not be loaded." });
    const profileMap = new Map((linkedProfiles || []).map((item) => [item.user_id, item]));
    const workspaceProfileMap = new Map<string, Record<string, unknown>>();
    (workspaceProfilesResult.data || []).forEach((row) => {
      const ownerId = clean(row.user_id, 50);
      if (ownerId && !workspaceProfileMap.has(ownerId)) {
        workspaceProfileMap.set(ownerId, row as Record<string, unknown>);
      }
    });
    const recentSince = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const documentActivity = new Map<string, { count: number; recent: number; latest: string | null }>();
    (filesResult.data || []).forEach((file) => {
      const ownerId = String(file.user_id || "");
      const current = documentActivity.get(ownerId) || { count: 0, recent: 0, latest: null };
      current.count += 1;
      const uploadedAt = clean(file.created_at, 40) || null;
      if (uploadedAt && new Date(uploadedAt).getTime() >= recentSince) current.recent += 1;
      if (!current.latest && uploadedAt) current.latest = uploadedAt;
      documentActivity.set(ownerId, current);
    });
    const personnel = (links || []).map((link) => ({
      ...link,
      profile: currentPersonnelProfile(
        (profileMap.get(link.professional_user_id) || null) as Record<string, unknown> | null,
        workspaceProfileMap.get(link.professional_user_id) || null,
      ),
      document_count: documentActivity.get(link.professional_user_id)?.count || 0,
      recent_document_count: documentActivity.get(link.professional_user_id)?.recent || 0,
      latest_document_uploaded_at: documentActivity.get(link.professional_user_id)?.latest || null,
    }));
    return json(200, {
      personnel,
      meta: {
        total: count || personnel.length,
        has_more: hasMore,
        next_offset: offset + personnel.length,
      },
    });
  }

  const targetUserId = clean(body.target_user_id, 50);
  if (!targetUserId) return json(400, { error: "A profile is required." });

  const { data: profile } = await admin
    .from("atsrs_talent_profiles")
    .select("user_id,name,surname,position,country,company,avatar_url,availability_status,available_from,work_preference,work_preferences,last_active_at,discoverable,profile_visibility")
    .eq("user_id", targetUserId)
    .maybeSingle();
  if (!profile) return json(404, { error: "This profile is unavailable." });
  const certificateFiles = await persistedCertificateFileIds(admin, targetUserId);
  if (certificateFiles.error) return json(500, { error: "Candidate eligibility could not be verified." });
  if (!certificateFiles.ids.length) return json(404, { error: "This profile has not uploaded a certificate." });

  const isPublicProfile = profile.discoverable === true && profile.profile_visibility === "Public";
  if (!isPublicProfile) {
    const { data: personnelLink, error: personnelLinkError } = await admin
      .from("atsrs_talent_personnel_links")
      .select("id")
      .eq("company_user_id", user.id)
      .eq("professional_user_id", targetUserId)
      .maybeSingle();
    if (personnelLinkError) return json(500, { error: "Profile access could not be verified." });
    if (!personnelLink || action === "add_to_personnel") {
      return json(404, { error: "This profile is unavailable." });
    }
  }

  if (action === "add_to_personnel") {
    const now = new Date().toISOString();
    const { data: link, error } = await admin
      .from("atsrs_talent_personnel_links")
      .upsert({
        company_user_id: user.id,
        professional_user_id: targetUserId,
        status: "linked",
        source: "talent_directory",
        updated_at: now,
      }, { onConflict: "company_user_id,professional_user_id" })
      .select("id,professional_user_id,status,source,created_at,updated_at")
      .single();
    if (error) return json(500, { error: "This profile could not be added to Company Personnel." });
    return json(200, { added: true, link, profile });
  }

  if (action === "remove_from_personnel") {
    const { error } = await admin
      .from("atsrs_talent_personnel_links")
      .delete()
      .eq("company_user_id", user.id)
      .eq("professional_user_id", targetUserId);
    if (error) return json(500, { error: "This profile could not be removed from Company Personnel." });
    return json(200, { removed: true });
  }

  if (action === "summary") {
    const { data: files, error } = await admin
      .from("atsrs_files")
      .select("category,file_name,metadata,created_at")
      .in("id", certificateFiles.ids)
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
        uploaded_at: clean(file.created_at, 40) || null,
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
    if (!cv) return json(404, { error: "This profile has not added a CV yet." });
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
