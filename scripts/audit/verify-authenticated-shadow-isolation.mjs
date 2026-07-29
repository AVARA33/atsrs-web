import { randomBytes, randomUUID } from "node:crypto";

const [projectRef] = process.argv.slice(2);
const serviceKey = process.env.ATSRS_AUDIT_SERVICE_KEY;
const publishableKey = process.env.ATSRS_AUDIT_PUBLISHABLE_KEY;
const productionRef = "hwtjuqyxzivymofamwxl";

if (
  !/^[a-z]{20}$/.test(projectRef || "") ||
  projectRef === productionRef ||
  !serviceKey ||
  !publishableKey
) {
  throw new Error("Staging authentication guard refused the audit");
}

const base = `https://${projectRef}.supabase.co`;
const email = `shadow-audit-${randomUUID()}@example.invalid`;
const password = randomBytes(32).toString("base64url");
let userId = null;

async function expectJson(response, stage) {
  if (!response.ok) throw new Error(`${stage} failed: HTTP ${response.status}`);
  return response.json();
}

try {
  const created = await expectJson(
    await fetch(`${base}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        app_metadata: { staging_only: true, shadow_read_audit: true },
      }),
    }),
    "Synthetic staging user creation",
  );
  userId = created.id;

  const session = await expectJson(
    await fetch(`${base}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: publishableKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    }),
    "Synthetic staging sign-in",
  );

  const tables = [
    "atsrs_workspace_personnel",
    "atsrs_personnel_certificates",
    "atsrs_workspace_projects",
    "atsrs_project_personnel",
  ];
  const results = [];
  for (const table of tables) {
    const response = await fetch(
      `${base}/rest/v1/${table}?select=id&limit=1`,
      {
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${session.access_token}`,
        },
      },
    );
    const body = await expectJson(response, `Authenticated RLS read for ${table}`);
    results.push({ table, visible_rows: Array.isArray(body) ? body.length : null });
  }
  const visible = results.reduce((total, item) => total + Number(item.visible_rows || 0), 0);
  console.log(JSON.stringify({
    project_ref: projectRef,
    synthetic_user: true,
    read_only_business_data: true,
    visible_other_workspace_rows: visible,
    results,
    status: visible === 0 ? "PASS" : "FAIL",
  }));
  if (visible !== 0) process.exitCode = 2;
} finally {
  if (userId) {
    const response = await fetch(`${base}/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });
    if (!response.ok && !process.exitCode) {
      throw new Error(`Synthetic staging cleanup failed: HTTP ${response.status}`);
    }
  }
}
