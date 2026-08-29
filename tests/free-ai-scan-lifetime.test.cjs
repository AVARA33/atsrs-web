const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20260829173344_free_ai_scan_lifetime.sql'), 'utf8');
const edge = fs.readFileSync(path.join(root, 'supabase/functions/scan-document/index.ts'), 'utf8');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');

assert.match(migration, /where plan_key = 'free'/i);
assert.match(migration, /ai_scan_monthly_limit = 1/i);
assert.match(migration, /when v_plan = 'free' then date '1970-01-01'/i);
assert.match(migration, /then 'lifetime_limit'/i);
assert.match(migration, /on conflict \(user_id, period_start\)/i);
assert.match(migration, /greatest\(public\.atsrs_ai_scan_usage\.scan_count, 1\)/i);
assert.match(migration, /revoke all on function public\.atsrs_reserve_ai_scan\(uuid\)[\s\S]*from public, anon, authenticated/i);
assert.match(migration, /grant execute on function public\.atsrs_reserve_ai_scan\(uuid\) to service_role/i);
assert.match(edge, /one lifetime AI Document Scan/i);
assert.match(app, /one-time Free AI Document Scan has now been used/i);

console.log('free-ai-scan-lifetime.test.cjs: PASS');
