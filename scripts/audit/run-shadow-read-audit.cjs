const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const shadow = require('../../js/shadow-read.js');
const adapter = require('../../js/normalized-read-adapter.js');

function hash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function parseInput(file) {
  const text = fs.readFileSync(file, 'utf8');
  const start = text.indexOf('{');
  if (start < 0) throw new Error('Audit input does not contain JSON');
  return JSON.parse(text.slice(start));
}

function parsePayload(row) {
  const value = row?.payload?.value;
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function suffixKind(key) {
  if (/_personal_profile$/.test(key)) return 'profile';
  if (/_company_personnel$/.test(key)) return 'personnel';
  if (/_personal_certs$/.test(key) || /_company_certs$/.test(key)) return 'certificates';
  if (/_personal_projects$/.test(key) || /_company_projects$/.test(key)) return 'projects';
  return 'non_entity';
}

async function main() {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (!inputPath || !outputPath) {
    throw new Error('Usage: node run-shadow-read-audit.cjs <input.json> <output.json>');
  }
  const input = parseInput(inputPath);
  const workspaceRows = [];
  for (const row of input.workspace_data || []) {
    const next = { ...row, payload: row.payload ? { ...row.payload } : row.payload };
    if (typeof next.payload?.value === 'string') {
      next.payload.value = await shadow.hydrateStableValue(row.data_key, next.payload.value);
    }
    workspaceRows.push(next);
  }
  const scopeKeys = Array.from(new Set(workspaceRows.map(
    (row) => `${row.user_id}::${row.account_type}`,
  ))).sort();

  const report = {
    format: 1,
    authoritative_source: 'legacy_json',
    read_only: true,
    workspace_row_count: workspaceRows.length,
    audited_scope_count: scopeKeys.length,
    mapped_row_count: workspaceRows.filter((row) => suffixKind(row.data_key) !== 'non_entity').length,
    non_entity_row_count: workspaceRows.filter((row) => suffixKind(row.data_key) === 'non_entity').length,
    mismatch_count: 0,
    skipped_count: 0,
    canary_candidate_count: 0,
    entity_totals: {
      personnel: { source: 0, target: 0, mismatches: 0 },
      certificates: { source: 0, target: 0, mismatches: 0 },
      projects: { source: 0, target: 0, mismatches: 0 },
      assignments: { source: 0, target: 0, mismatches: 0 },
    },
    scopes: [],
  };

  for (const scopeKey of scopeKeys) {
    const [userId, accountType] = scopeKey.split('::');
    const rows = workspaceRows.filter(
      (row) => row.user_id === userId && row.account_type === accountType,
    );
    const valueFor = (kind) => {
      const row = rows.find((item) => suffixKind(item.data_key) === kind);
      return row ? parsePayload(row) : null;
    };
    const legacy = {
      profile: accountType === 'personal' ? valueFor('profile') : null,
      personnel: accountType === 'company' ? valueFor('personnel') || [] : [],
      certificates: valueFor('certificates') || [],
      projects: valueFor('projects') || [],
    };
    const normalized = {
      personnel: (input.personnel || []).filter(
        (row) => row.workspace_user_id === userId && row.workspace_account_type === accountType,
      ),
      certificates: (input.certificates || []).filter(
        (row) => row.workspace_user_id === userId && row.workspace_account_type === accountType,
      ),
      projects: (input.projects || []).filter(
        (row) => row.workspace_user_id === userId && row.workspace_account_type === accountType,
      ),
      assignments: (input.assignments || []).filter(
        (row) => row.workspace_user_id === userId && row.workspace_account_type === accountType,
      ),
    };
    const owner = normalized.personnel.find(
      (row) => row.source === 'workspace_data_personal_profile',
    );
    const comparisonInput = {
      legacy,
      normalized,
      email: owner?.email || '',
      workspace: { userId, accountType },
    };
    const result = await shadow.compare(comparisonInput);
    const canary = await adapter.evaluate({
      ...comparisonInput,
      featureFlag: 'canary',
    });
    if (canary.normalized_candidate) report.canary_candidate_count += 1;
    report.mismatch_count += result.mismatch_count;
    report.skipped_count += result.skipped_count;
    for (const entity of Object.keys(report.entity_totals)) {
      report.entity_totals[entity].source += result.entities[entity].source_count;
      report.entity_totals[entity].target += result.entities[entity].target_count;
      report.entity_totals[entity].mismatches += result.entities[entity].mismatch_count;
    }
    report.scopes.push({
      scope_hash: hash(scopeKey).slice(0, 16),
      source_row_count: rows.length,
      mapped_categories: Array.from(new Set(rows.map((row) => suffixKind(row.data_key)))).sort(),
      status: result.status,
      normalized_candidate: canary.normalized_candidate,
      selected_source: canary.selected_source,
      fallback_reason: canary.fallback_reason,
      mismatch_count: result.mismatch_count,
      skipped_count: result.skipped_count,
      mismatch_fields: Object.fromEntries(
        Object.entries(result.entities).map(([entity, detail]) => [
          entity,
          detail.mismatches.map((item) => ({
            category: item.category,
            fields: item.fields,
            source_hash: item.source_hash,
            target_hash: item.target_hash,
          })),
        ]),
      ),
    });
  }

  report.status = report.mismatch_count || report.skipped_count ? 'mismatch' : 'match';
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    workspace_rows: report.workspace_row_count,
    audited_scopes: report.audited_scope_count,
    mapped_rows: report.mapped_row_count,
    non_entity_rows: report.non_entity_row_count,
    mismatch_count: report.mismatch_count,
    skipped_count: report.skipped_count,
    canary_candidate_count: report.canary_candidate_count,
    status: report.status,
    entity_totals: report.entity_totals,
  }));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
