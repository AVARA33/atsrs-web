const assert = require('node:assert/strict');
const fs = require('node:fs');

const frontend = fs.readFileSync('js/share-profile.js', 'utf8');
const backend = fs.readFileSync('supabase/functions/share-profile/index.ts', 'utf8');
const migration = fs.readFileSync(
  'supabase/migrations/20260827164031_allow_repeat_share_downloads.sql',
  'utf8',
);
const html = fs.readFileSync('index.html', 'utf8');

assert.match(migration, /drop index if exists public\.atsrs_share_events_one_download_per_request_file_idx/);
assert.doesNotMatch(backend, /consumedRequestIds/);
assert.doesNotMatch(backend, /already been downloaded/);
assert.match(backend, /const accessExpires = decision === "approve" \? share!\.expires_at : null/);
assert.match(backend, /const accessExpires = existing!\.expires_at/);
assert.match(backend, /download_status: approved \? "approved"/);
assert.match(backend, /repeat_downloads: true/);
assert.match(backend, /shareResumeValue/);
assert.match(backend, /Open shared files/);
assert.match(backend, /loadResumeRequest\(admin, secretKey/);
assert.match(backend, /const quietRefresh = requestUrl\.searchParams\.get\("refresh"\) === "1"/);
assert.match(backend, /if \(!quietRefresh\) \{[\s\S]*?insertEvent\(admin, share, "link_opened"\)/);

assert.match(frontend, /access\.textContent='Download'/);
assert.match(frontend, /downloads remain available until the share link expires/);
assert.match(frontend, /item\.download_status==='pending'[\s\S]*?\},5000\)/);
assert.match(frontend, /if\(options\.quiet\)params\.set\('refresh','1'\)/);
assert.match(frontend, /publicResumeRequest=publicParams\.get\('share_request'\)/);
assert.match(frontend, /body=Object\.assign\(\{token:publicToken,request_id:publicResumeRequest,resume:publicResumeToken\}/);
assert.doesNotMatch(frontend, /All Files Downloaded/);
assert.match(html, /js\/share-profile\.js\?v=429/);
assert.match(html, /atsrsEntryParams\.has\('share_request'\).*atsrsEntryParams\.has\('resume'\)/);

console.log('repeat share download contracts passed');
