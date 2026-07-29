import { writeFile } from "node:fs/promises";

const [projectRef, outputPath] = process.argv.slice(2);
const serviceKey = process.env.ATSRS_READ_ONLY_AUDIT_KEY;

if (!/^[a-z]{20}$/.test(projectRef || "") || !outputPath || !serviceKey) {
  throw new Error("Missing secure shadow-read audit input");
}

const tables = {
  workspace_data: "atsrs_workspace_data",
  personnel: "atsrs_workspace_personnel",
  certificates: "atsrs_personnel_certificates",
  projects: "atsrs_workspace_projects",
  assignments: "atsrs_project_personnel",
};

async function readAll(table) {
  const rows = [];
  const pageSize = 1000;

  for (let offset = 0; ; offset += pageSize) {
    const response = await fetch(
      `https://${projectRef}.supabase.co/rest/v1/${table}?select=*`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Range: `${offset}-${offset + pageSize - 1}`,
          Prefer: "count=exact",
        },
      },
    );
    if (!response.ok) {
      throw new Error(`Read-only Data API audit failed for ${table}: HTTP ${response.status}`);
    }
    const page = await response.json();
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

const output = {};
for (const [key, table] of Object.entries(tables)) {
  output[key] = await readAll(table);
}

await writeFile(outputPath, `${JSON.stringify(output)}\n`, "utf8");
console.log(JSON.stringify({
  project_ref: projectRef,
  read_only: true,
  workspace_rows: output.workspace_data.length,
  personnel: output.personnel.length,
  certificates: output.certificates.length,
  projects: output.projects.length,
  assignments: output.assignments.length,
}));
