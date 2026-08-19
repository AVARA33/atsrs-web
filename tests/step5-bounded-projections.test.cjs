const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('Candidate directory is a bounded service-only projection', () => {
  const migration = read('supabase/migrations/20260818114009_fix_candidate_certificate_eligibility.sql');
  const edge = read('supabase/functions/talent-profile-actions/index.ts');

  assert.match(migration, /create or replace function public\.atsrs_talent_directory_page/i);
  assert.match(migration, /exists\s*\([\s\S]*from public\.atsrs_personnel_certificates/i);
  assert.match(migration, /join public\.atsrs_files/i);
  assert.match(migration, /limit greatest\(1, least\(coalesce\(p_limit, 31\), 101\)\)/i);
  assert.match(migration, /revoke all on function[\s\S]*from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function[\s\S]*to service_role/i);
  assert.match(edge, /admin\.rpc\("atsrs_talent_directory_page"/);
  assert.doesNotMatch(edge, /const pageSize = 1000/);
});

test('Personnel and report enrichment are limited to one 30-row page', () => {
  const edge = read('supabase/functions/talent-profile-actions/index.ts');
  const client = read('js/talent-directory.js');

  assert.match(edge, /\.range\(offset, offset \+ pageSize\)/);
  assert.match(edge, /count: "exact"/);
  assert.match(edge, /requestedProfessionalIds/);
  assert.match(client, /action:'personnel_links',page_size:30/);
  assert.match(client, /action:'report',professional_user_ids:pageIds/);
  assert.match(client, /personnelLoadMore/);
});

test('Candidate client uses keyset cursor and exposes explicit continuation', () => {
  const client = read('js/talent-directory.js');
  const html = read('index.html');

  assert.match(client, /request=\{action:'directory',page_size:30\}/);
  assert.match(client, /request\.cursor_active_at=directoryCursor\.active_at/);
  assert.match(client, /request\.cursor_user_id=directoryCursor\.user_id/);
  assert.match(client, /directoryMeta\.has_more===true/);
  assert.match(html, /id="talentDirectoryLoadMore"/);
  assert.match(html, /js\/talent-directory\.js\?v=571/);
});

test('Existing sharing activity projections remain explicitly bounded', () => {
  const sharing = read('supabase/functions/share-profile/index.ts');
  assert.match(sharing, /\.limit\(100\)/);
  assert.match(sharing, /\.limit\(500\)/);
});
