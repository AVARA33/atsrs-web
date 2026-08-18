const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (value) => fs.readFileSync(path.join(root, value), 'utf8');
const migration = read('supabase/migrations/20260817182000_secure_developer_editor_workspace.sql');
const actions = read('supabase/functions/developer-editor-actions/index.ts');
const preview = read('supabase/functions/developer-editor-preview/index.ts');
const policy = read('supabase/functions/_shared/developer-editor-policy.ts');
const page = read('developer/index.html');
const client = read('developer/developer.js');
const config = read('supabase/config.toml');
const { pathToFileURL } = require('node:url');

test('Developer Editor role tables are server-only and RLS protected', () => {
  assert.match(migration, /role text not null default 'developer_editor'/);
  for (const table of ['atsrs_developer_memberships', 'atsrs_developer_changes', 'atsrs_developer_preview_tokens', 'atsrs_developer_audit']) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(migration, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`));
  }
  assert.match(migration, /session_revision bigint not null/);
  assert.doesNotMatch(client, /service[_-]?role|private key|github_token/i);
});

test('Edge broker enforces role, MFA, scope and protected GitHub App credentials', () => {
  assert.match(config, /\[functions\.developer-editor-actions\][\s\S]*verify_jwt = true/);
  assert.match(actions, /auth\.getUser\(token\)/);
  assert.match(actions, /MFA_REQUIRED/);
  assert.match(actions, /DEVELOPER_SCOPE_VIOLATION/);
  assert.match(actions, /DEVELOPER_GITHUB_NOT_CONFIGURED/);
  assert.match(actions, /ATSRS_GITHUB_APP_PRIVATE_KEY/);
  assert.match(actions, /invalidates Developer privileges immediately/);
  assert.match(actions, /auth\.admin\.listUsers/);
  assert.match(actions, /inviteUserByEmail/);
  assert.doesNotMatch(actions, /reset --hard|force:\s*true|rm -rf/);
});

test('allowlist is exact, protected infrastructure is denied and branches are isolated', () => {
  assert.match(policy, /\^css\\\//);
  assert.match(policy, /\^supabase\\\//);
  assert.match(policy, /\^\\\.github\\\//);
  assert.match(policy, /\^developer-editor\\\//);
  assert.match(actions, /refs\/heads\/\$\{branch\}/);
  assert.doesNotMatch(policy, /\.\*\.js|\.\*\.css/);
});

test('path policy classifies representative safe, approval and denied paths', async () => {
  const imported = await import(pathToFileURL(path.join(root, 'supabase/functions/_shared/developer-editor-policy.ts')).href);
  assert.equal(imported.classifyPath('css/jobs-prototype.css'), 'LOW_RISK_MINOR_FIX');
  assert.equal(imported.classifyPath('js/jobs-prototype.js'), 'OWNER_APPROVAL_REQUIRED');
  for (const denied of ['supabase/config.toml', '.github/workflows/x.yml', '../index.html', 'js/auth.js', '.env.production', 'package.json']) {
    assert.equal(imported.classifyPath(denied), 'DENIED', denied);
  }
  assert.equal(imported.isDeveloperBranch('developer-editor/abc/fix-123'), true);
  assert.equal(imported.isDeveloperBranch('main'), false);
});

test('workspace exposes controlled editor workflow without shell or database console', () => {
  for (const section of ['Overview', 'Issues / Bugs', 'Code Changes', 'Preview', 'Tests', 'Releases', 'History', 'Developer Access']) assert.ok(page.includes(section));
  assert.match(page, /sandbox="allow-scripts"/);
  assert.match(page, /Desktop required/);
  assert.match(client, /create_change/);
  assert.match(client, /open_file/);
  assert.match(client, /save_file/);
  assert.match(client, /run_checks/);
  assert.match(client, /request_approval/);
  assert.match(client, /owner_decide/);
  assert.match(client, /audit_log/);
  assert.match(client, /rollback/);
  assert.match(client, /sync_change/);
  assert.ok(page.indexOf('<template id="workspaceTemplate">') < page.indexOf('<div id="workspace"'), 'Developer UI must remain inert before server access succeeds');
  assert.doesNotMatch(page + client, /database console|powershell|terminal|force push/i);
  assert.match(page, /atsrs-mark-green\.png/);
  assert.match(page, /theme-button/);
  assert.match(client, /localStorage\.getItem\('atsrs_theme'\)/);
  assert.match(client, /atsrs-mark-blue\.png/);
});

test('preview uses a short-lived hashed token and blocks external data access', () => {
  assert.match(config, /\[functions\.developer-editor-preview\][\s\S]*verify_jwt = false/);
  assert.match(actions, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(actions, /15 \* 60 \* 1000/);
  assert.match(preview, /connect-src 'none'/);
  assert.match(preview, /frame-ancestors \$\{PREVIEW_ORIGIN\}/);
  assert.match(preview, /SAFE_RESOURCE/);
});

test('publish gate requires exact successful head commit and risk classification', () => {
  assert.match(actions, /checks\.conclusion !== "success"/);
  assert.match(actions, /checks\.head_sha !== current\.head_sha/);
  assert.match(actions, /OWNER_APPROVAL_REQUIRED/);
  assert.match(actions, /PUBLISH_BLOCKED/);
  assert.match(actions, /merge_method: "squash"/);
  assert.match(actions, /sha: current\.head_sha/);
  assert.match(actions, /branch changed after checks completed/i);
  assert.match(actions, /developer-editor-post-deploy\.yml/);
});
