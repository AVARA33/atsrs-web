const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migration = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '20260820150000_grant_candidate_summary_certificate_read.sql'),
  'utf8'
);
const edge = fs.readFileSync(
  path.join(root, 'supabase', 'functions', 'talent-profile-actions', 'index.ts'),
  'utf8'
);

assert.match(
  migration,
  /grant\s+select\s+on\s+table\s+public\.atsrs_personnel_certificates\s+to\s+service_role\s*;/i,
  'the server-side Candidate Summary path must be able to read canonical certificate links'
);
assert.doesNotMatch(
  migration,
  /\b(?:insert|update|delete|truncate|alter|drop)\b/i,
  'the repair must remain a read-only, least-privilege service grant'
);
assert.match(
  edge,
  /async function persistedCertificateFileIds[\s\S]*?\.from\("atsrs_personnel_certificates"\)[\s\S]*?\.select\("file_id"\)/,
  'the grant must cover the exact Edge Function read that verifies Candidate Summary eligibility'
);
assert.match(
  edge,
  /\.from\("atsrs_talent_personnel_links"\)[\s\S]*?\.eq\("company_user_id", user\.id\)[\s\S]*?\.eq\("professional_user_id", targetUserId\)[\s\S]*?\.eq\("status", "linked"\)[\s\S]*?\.maybeSingle\(\)/,
  'a private profile must require the caller\'s active linked Personnel relationship'
);
assert.ok(
  edge.indexOf('.eq("status", "linked")') < edge.indexOf('const certificateFiles = await persistedCertificateFileIds(admin, targetUserId);'),
  'private-profile authorization must complete before the privileged certificate lookup'
);
assert.match(
  edge,
  /if \(action === "summary"\)[\s\S]*?\.from\("atsrs_files"\)[\s\S]*?return json\(200, \{ professional: `\$\{profile\.name\} \$\{profile\.surname\}`, counts, documents \}\)/,
  'the summary response must remain bounded to the existing safe document projection'
);

console.log('Candidate Document Summary permission regression tests passed');
