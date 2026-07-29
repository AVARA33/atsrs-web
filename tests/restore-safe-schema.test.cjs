const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  TARGET_PREFIX,
  sha256,
  transformSql,
} = require('../scripts/staging/build-restore-safe-schema.cjs');

const fixture = [
  '-- keep this comment',
  'CREATE FUNCTION public.fixture() RETURNS text LANGUAGE sql AS $body$',
  'ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" GRANT ALL ON TABLES TO anon;',
  '$body$;',
  `SELECT '${TARGET_PREFIX} GRANT ALL ON TABLES TO anon;'::text;`,
  `${TARGET_PREFIX} IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";`,
  'ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";',
  `${TARGET_PREFIX} IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";`,
  '',
].join('\n');

const fixtureResult = transformSql(fixture);
assert.equal(fixtureResult.removed.length, 2);
assert.match(fixtureResult.output, /CREATE FUNCTION public\.fixture/);
assert.match(fixtureResult.output, /SELECT 'ALTER DEFAULT PRIVILEGES/);
assert.match(fixtureResult.output, /FOR ROLE "postgres"/);
assert.equal(transformSql(fixtureResult.output).removed.length, 0);
for (const statement of fixtureResult.removed) {
  assert.match(statement.text, /^ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin"/);
  assert.match(statement.text, /;\r?\n?$/);
  assert.equal(statement.sha256, sha256(statement.text));
}

const rawPath = process.env.ATSRS_RAW_SCHEMA_BACKUP;
const safePath = process.env.ATSRS_RESTORE_SAFE_SCHEMA_BACKUP;
if (rawPath || safePath) {
  assert.ok(rawPath && safePath, 'both artifact paths are required');
  const raw = fs.readFileSync(path.resolve(rawPath), 'utf8');
  const safe = fs.readFileSync(path.resolve(safePath), 'utf8');
  const result = transformSql(raw);

  assert.equal(result.output, safe, 'restore-safe diff must be exactly reproducible');
  assert.ok(result.removed.length > 0);
  assert.equal(
    (raw.match(/^ALTER DEFAULT PRIVILEGES FOR ROLE "postgres"/gm) || []).length,
    (safe.match(/^ALTER DEFAULT PRIVILEGES FOR ROLE "postgres"/gm) || []).length
  );
  assert.equal(transformSql(safe).removed.length, 0);
  assert.equal((safe.match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$;$/gm) || []).length, 14);
  assert.equal((safe.match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$$/gm) || []).length, 0);
  assert.doesNotMatch(safe, /sbp_[A-Za-z0-9]|eyJhbGciOi|PGPASSWORD|service_role_key/i);
}

console.log('restore-safe schema parser and diff contract tests passed');
