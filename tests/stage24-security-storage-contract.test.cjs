const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const jsDir = path.join(root, 'js');
const browserSources = fs.readdirSync(jsDir)
  .filter(name => name.endsWith('.js'))
  .map(name => fs.readFileSync(path.join(jsDir, name), 'utf8'))
  .join('\n');
const profileMigration = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '20260723140000_profile_photos.sql'),
  'utf8'
);
const synthetic = fs.readFileSync(
  path.join(root, 'supabase', 'audit', 'staging-stage24-storage-rls-synthetic.sql'),
  'utf8'
);

assert.doesNotMatch(browserSources, /service[_-]?role/i);
assert.match(profileMigration, /for select to authenticated/i);
assert.match(profileMigration, /for insert to authenticated/i);
assert.match(profileMigration, /for update to authenticated/i);
assert.match(profileMigration, /for delete to authenticated/i);
assert.match(profileMigration, /storage\.foldername\(name\)/i);
assert.match(profileMigration, /auth\.uid\(\)/i);
assert.match(profileMigration, /with check/i);

assert.match(synthetic, /^begin;/m);
assert.match(synthetic, /^rollback;/m);
assert.match(synthetic, /set local role authenticated/i);
assert.match(synthetic, /set local role anon/i);
assert.match(synthetic, /cross_user_select/);
assert.match(synthetic, /cross_user_update/);
assert.match(synthetic, /cross_user_delete/);
assert.match(synthetic, /owner_select/);
assert.match(synthetic, /anon_select/);
assert.match(synthetic, /relation\.relrowsecurity/);
assert.match(synthetic, /requires the atsrs-user-files bucket metadata/);
assert.match(synthetic, /requires the authenticated owner-path Storage policies/);
assert.doesNotMatch(synthetic, /create policy/i);
assert.doesNotMatch(synthetic, /alter table storage\.objects/i);
assert.doesNotMatch(synthetic, /^\s*commit\s*;/mi);

console.log('Stage 24 security and Storage contracts passed');
