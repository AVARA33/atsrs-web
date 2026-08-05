const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const sql = fs.readFileSync(path.join(root, 'supabase/migrations/20260805223324_dedicated_recipient_shares.sql'), 'utf8');
const entitlementAdmin = fs.readFileSync(path.join(root, 'supabase/migrations/20260805225058_recipient_share_entitlement_admin.sql'), 'utf8');
const privateGrant = fs.readFileSync(path.join(root, 'supabase/migrations/20260805225516_recipient_share_private_schema_grant.sql'), 'utf8');
const entitlementRead = fs.readFileSync(path.join(root, 'supabase/migrations/20260805230017_recipient_share_entitlement_read.sql'), 'utf8');
const fkIndexes = fs.readFileSync(path.join(root, 'supabase/migrations/20260805230217_recipient_share_fk_indexes.sql'), 'utf8');
const edge = fs.readFileSync(path.join(root, 'supabase/functions/recipient-share/index.ts'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'js/recipient-links.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/recipient-links.css'), 'utf8');

for (const table of [
  'atsrs_recipient_shares','atsrs_recipient_share_documents',
  'atsrs_recipient_share_otp_challenges','atsrs_recipient_share_viewer_sessions',
  'atsrs_recipient_share_access_requests','atsrs_recipient_share_events'
]) {
  assert.match(sql, new RegExp(`['"]${table}['"]`));
}
assert.match(sql, /alter table public\.%I enable row level security/);
assert.match(sql, /revoke all on table public\.%I from public, anon, authenticated/);
assert.match(sql, /recipient_email_hash text not null/);
assert.match(sql, /token_hash text not null unique/);
assert.match(sql, /unique \(owner_user_id, idempotency_key\)/);
assert.match(sql, /attempt_count between 0 and 5/);
assert.match(sql, /least\(share_row\.expires_at, now\(\) \+ interval '7 days'\)/);
assert.match(sql, /set search_path = ''/);
assert.doesNotMatch(sql, /alter table public\.atsrs_profile_shares|update public\.atsrs_profile_shares|delete from public\.atsrs_profile_shares/);
for (const migration of [entitlementAdmin, entitlementRead]) {
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /revoke all on function[\s\S]*from public, anon, authenticated/);
  assert.match(migration, /grant execute on function[\s\S]*to service_role/);
}
assert.match(privateGrant, /revoke all on schema atsrs_private from public, anon, authenticated/);
assert.match(privateGrant, /grant usage on schema atsrs_private to service_role/);
assert.match(fkIndexes, /viewer_session_id/);
assert.match(fkIndexes, /document_id/);

assert.match(edge, /npm:@supabase\/supabase-js@2\.55\.0/);
assert.match(edge, /auth\.getUser\(\)/);
assert.match(edge, /#recipient=\$\{rawToken\}/);
assert.doesNotMatch(edge, /\?recipient=/);
assert.match(edge, /OTP_TTL_MINUTES = 10/);
assert.match(edge, /OTP_MAX_ATTEMPTS = 5/);
assert.match(edge, /createSignedUrl/);
assert.match(edge, /action === "request_status"/);
assert.match(edge, /\.eq\("viewer_session_id", session\.id\)/);
assert.match(edge, /currentProjectRef !== STAGING_REF/);
assert.doesNotMatch(edge, /console\.(log|error)\([^)]*(email|token|otp|body)/i);

assert.match(html, /id="recipientLinksHeading"/);
assert.match(html, /id="recipientLinkModal"[^>]*aria-modal="true"/);
assert.match(html, /id="recipientViewerEmail"/);
assert.match(ui, /operation_id:uuid\(\)/);
assert.match(ui, /sessionStorage\.setItem\('atsrs_recipient_token_'/);
assert.match(ui, /if\(publicMode\(\)\)\{publicStart\(\);return;\}/);
assert.match(ui, /trapModalFocus/);
assert.match(ui, /requestDedicatedDownloads/);
assert.match(ui, /data-request-decision/);
assert.match(ui, /data-recipient-download/);
assert.match(css, /@media\(max-width:720px\)/);
assert.match(css, /min-height:44px/);

console.log('Dedicated Recipient Links contract tests passed');
