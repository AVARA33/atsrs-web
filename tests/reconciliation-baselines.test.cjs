const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const extractBody = sql => {
  const match = sql.match(/as \$function\$\n([\s\S]*?)\n\$function\$/i);
  assert.ok(match, 'notification function body must be present');
  return `\n${match[1]}\n`;
};
const md5 = value => crypto.createHash('md5').update(value).digest('hex');

const v242Source = read('supabase/v242_detailed_expiry_notifications.sql');
const v242Baseline = read(
  'supabase/migrations/20260729105130_baseline_v242_detailed_expiry_notifications.sql'
);
const shareBaseline = read(
  'supabase/migrations/20260729105131_baseline_secure_share_live_delta.sql'
);

assert.equal(md5(extractBody(v242Baseline)), md5(extractBody(v242Source)));
assert.equal(md5(extractBody(v242Baseline)), '6580d4330f1f405bdbf14183b41aa37e');
assert.match(v242Baseline, /\bbegin;/i);
assert.match(v242Baseline, /\bcommit;\s*$/i);
assert.match(v242Baseline, /create or replace function private\.atsrs_queue_due_notifications/i);
assert.match(v242Baseline, /security definer/i);
assert.match(v242Baseline, /set search_path = ''/i);
assert.match(
  v242Baseline,
  /revoke all on function private\.atsrs_queue_due_notifications\(date\)\s+from public, anon, authenticated/i
);
assert.doesNotMatch(v242Baseline, /grant execute[\s\S]+?(public|anon|authenticated)/i);

assert.match(shareBaseline, /\bbegin;/i);
assert.match(shareBaseline, /\bcommit;\s*$/i);
assert.match(shareBaseline, /where enabled\s+and expires_at is null/i);
assert.match(shareBaseline, /add column if not exists share_token_hash text/i);
assert.match(shareBaseline, /invalid existing rows/i);
assert.match(
  shareBaseline,
  /atsrs_share_access_requests_share_token_hash_check[\s\S]+?check \(share_token_hash ~ '\^\[0-9a-f\]\{64\}\$'\)/i
);
assert.match(shareBaseline, /create index if not exists atsrs_share_requests_viewer_token_idx/i);
assert.match(shareBaseline, /\(share_id, share_token_hash, viewer_token_hash\)/i);
assert.match(shareBaseline, /create index if not exists atsrs_share_events_request_idx/i);
assert.doesNotMatch(shareBaseline, /\b(delete from|truncate table|drop table|drop column)\b/i);

const stableVersion = '20260729041619';
const v242Version = '20260729105130';
const shareVersion = '20260729105131';
assert.ok(stableVersion < v242Version && v242Version < shareVersion);

console.log('reconciliation baseline migration tests passed');
