const [projectRef] = process.argv.slice(2);
const publishableKey = process.env.ATSRS_AUDIT_PUBLISHABLE_KEY;

if (!/^[a-z]{20}$/.test(projectRef || "") || !publishableKey) {
  throw new Error("Missing anonymous RLS audit input");
}

const tables = [
  "atsrs_workspace_personnel",
  "atsrs_personnel_certificates",
  "atsrs_workspace_projects",
  "atsrs_project_personnel",
];
const results = [];

for (const table of tables) {
  const response = await fetch(
    `https://${projectRef}.supabase.co/rest/v1/${table}?select=id&limit=1`,
    { headers: { apikey: publishableKey } },
  );
  let visibleRows = null;
  if (response.ok) {
    const body = await response.json();
    visibleRows = Array.isArray(body) ? body.length : null;
  }
  results.push({ table, status: response.status, visible_rows: visibleRows });
}

const leaked = results.filter((item) => item.visible_rows > 0);
console.log(JSON.stringify({
  project_ref: projectRef,
  read_only: true,
  anonymous_visible_rows: leaked.reduce((total, item) => total + item.visible_rows, 0),
  results,
  status: leaked.length ? "FAIL" : "PASS",
}));
if (leaked.length) process.exitCode = 2;
