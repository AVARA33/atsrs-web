#!/usr/bin/env node
'use strict';

const fs = require('node:fs');

const dumpPath = process.argv[2];
if (!dumpPath) {
  throw new Error('Usage: node inspect-scoped-dump-auth.cjs <data-dump.sql> [ids-output.json]');
}

const authColumns = new Map([
  ['atsrs_admin_users', ['user_id']],
  ['atsrs_ai_cv_usage', ['user_id']],
  ['atsrs_ai_scan_usage', ['user_id']],
  ['atsrs_ai_usage', ['user_id']],
  ['atsrs_files', ['user_id']],
  ['atsrs_notification_outbox', ['user_id']],
  ['atsrs_notification_preferences', ['user_id']],
  ['atsrs_notifications', ['user_id']],
  ['atsrs_profile_shares', ['user_id']],
  ['atsrs_share_access_requests', ['owner_id', 'requester_user_id']],
  ['atsrs_share_events', ['owner_id']],
  ['atsrs_subscriptions', ['user_id']],
  ['atsrs_talent_messages', ['sender_id', 'recipient_id']],
  ['atsrs_talent_personnel_links', ['company_user_id', 'professional_user_id']],
  ['atsrs_talent_profiles', ['user_id']],
  ['atsrs_workspace_data', ['user_id']],
  ['atsrs_workspaces', ['user_id']],
]);

function splitSqlValues(text) {
  const values = [];
  let current = '';
  let quoted = false;
  let depth = 0;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      current += char;
      if (char === "'" && text[i + 1] === "'") {
        current += text[i + 1];
        i += 1;
      } else if (char === "'") {
        quoted = false;
      }
      continue;
    }
    if (char === "'") {
      quoted = true;
      current += char;
    } else if (char === '(' || char === '[' || char === '{') {
      depth += 1;
      current += char;
    } else if (char === ')' || char === ']' || char === '}') {
      depth -= 1;
      current += char;
    } else if (char === ',' && depth === 0) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function sqlScalar(value) {
  if (/^null$/i.test(value)) return null;
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  return value;
}

const sql = fs.readFileSync(dumpPath, 'utf8');
const insertPattern =
  /^INSERT INTO "public"\."([^"]+)" \(([^)]+)\) VALUES \((.*)\);$/gm;
const authIds = new Set();
const workspaceIds = new Set();
let workspaceRows = 0;
let matchedRows = 0;
let match;

while ((match = insertPattern.exec(sql)) !== null) {
  matchedRows += 1;
  const table = match[1];
  const columns = [...match[2].matchAll(/"([^"]+)"/g)].map((item) => item[1]);
  const values = splitSqlValues(match[3]).map(sqlScalar);
  if (columns.length !== values.length) {
    throw new Error(`Column/value count mismatch in ${table}`);
  }
  const row = Object.fromEntries(columns.map((column, index) => [column, values[index]]));
  if (table === 'atsrs_workspaces') {
    workspaceRows += 1;
    if (row.user_id) workspaceIds.add(row.user_id);
  }
  for (const column of authColumns.get(table) || []) {
    if (row[column]) authIds.add(row[column]);
  }
}

if (matchedRows === 0) throw new Error('No INSERT statements found');

const externalIds = [...authIds].filter((id) => !workspaceIds.has(id));
const report = {
  insertRows: matchedRows,
  workspaceRows,
  distinctWorkspaceUsers: workspaceIds.size,
  distinctReferencedAuthUsers: authIds.size,
  referencedUsersOutsideWorkspaces: externalIds.length,
};

if (process.argv[3]) {
  fs.writeFileSync(process.argv[3], JSON.stringify([...authIds].sort()), {
    encoding: 'utf8',
    mode: 0o600,
    flag: 'wx',
  });
}

process.stdout.write(`${JSON.stringify(report)}\n`);
