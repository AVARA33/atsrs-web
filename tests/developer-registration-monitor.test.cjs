const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'js', 'admin-overview.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'developer-registration-v5895.css'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20260828004100_include_incomplete_developer_registrations.sql'), 'utf8');

assert.match(index, /id="navDeveloper"[^>]+hidden/);
assert.match(index, /id="developerPage"/);
assert.match(index, /id="developerRegistrationRows"/);
assert.ok(index.indexOf('id="adminOverviewPanel"') > index.indexOf('id="developerPage"'));
assert.ok(index.indexOf('id="adminOverviewPanel"') > index.indexOf('class="developer-registrations-head"'));
assert.doesNotMatch(index.slice(index.indexOf('id="dashboardPage"')), /id="adminOverviewPanel"/);
assert.match(js, /atsrs_get_developer_registrations/);
assert.match(js, /days left/);
assert.match(js, /developerNav\.classList\.remove\('hidden'\)/);
assert.match(js, /get\('route'\) === 'developer'/);
assert.match(js, /window\.showPage\('developer', developerNav\)/);
assert.match(css, /\.developer-registration-rows\{max-height:480px;overflow-y:auto/);
assert.match(css, /grid-template-columns:minmax\(180px,auto\) minmax\(460px,1fr\) auto/);
assert.match(css, /\.developer-page \.developer-admin-overview\{[\s\S]*?position:static!important/);
assert.match(css, /#app \.nav #navDeveloper\.hidden\{display:none!important\}/);
assert.match(migration, /ATSRS_ADMIN_REQUIRED/);
assert.match(migration, /subscription\.trial_ends_at - now\(\)/);
assert.match(migration, /order by auth_user\.created_at desc/);

console.log('developer-registration-monitor: PASS');
