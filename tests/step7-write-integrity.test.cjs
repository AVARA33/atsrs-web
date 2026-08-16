const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const migration = read('supabase/migrations/20260816211500_atomic_qr_upload_finalization.sql');
const edge = read('supabase/functions/document-qr-upload/index.ts');

test('QR finalization locks one session and commits metadata plus state together', () => {
  assert.match(migration, /from public\.atsrs_document_upload_sessions[\s\S]*for update/);
  assert.match(migration, /insert into public\.atsrs_files/);
  assert.match(migration, /update public\.atsrs_document_upload_sessions/);
  assert.match(migration, /status = 'uploaded'/);
});

test('QR finalization is idempotent for browser and network retries', () => {
  assert.match(migration, /if v_session\.status = 'uploaded' and v_session\.file_id is not null/);
  assert.match(migration, /where storage_path = v_session\.storage_path/);
  assert.match(migration, /return jsonb_build_object/);
});

test('only the service role may execute the write-integrity RPC', () => {
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /revoke all on function[\s\S]*from public, anon, authenticated/);
  assert.match(migration, /grant execute on function[\s\S]*to service_role/);
});

test('Edge finalization uses the atomic RPC instead of split table writes', () => {
  const finalizeBlock = edge.slice(edge.indexOf('if (action === "finalize")'));
  assert.match(finalizeBlock, /admin\.rpc\("atsrs_finalize_document_qr_upload"/);
  assert.doesNotMatch(finalizeBlock, /from\("atsrs_files"\)\.insert/);
  assert.doesNotMatch(finalizeBlock, /from\("atsrs_document_upload_sessions"\)\.update/);
});
