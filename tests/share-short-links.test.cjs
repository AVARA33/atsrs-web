const assert=require('node:assert/strict');
const fs=require('node:fs');

const client=fs.readFileSync('js/share-profile.js','utf8');
const edge=fs.readFileSync('supabase/functions/share-profile/index.ts','utf8');
const migration=fs.readFileSync('supabase/migrations/20260918174500_profile_share_short_codes.sql','utf8');
const redirects=fs.readFileSync('_redirects','utf8');

assert.match(redirects,/^\/s\/\* \/index\.html 200$/m,'Cloudflare Pages must route short links into the SPA.');
assert.match(client,/function shortShareUrl\(shortCode\)\{return shortCode\?'https:\/\/atsrs\.com\/s\/'/);
assert.match(client,/location\.pathname\|\|''\)\.match\(\/\^\\\/s\\\/\(\[A-Za-z0-9_-\]\{22\}\)/,'The public page must read a 22-character short code from the path.');
assert.match(client,/action:'short_link',share_id:shareId/,'Old active links must be able to obtain their short alias.');
assert.match(client,/ClipboardItem/,'Rich clipboard targets must receive the localized linked label.');
assert.match(client,/ATSRS profilinə təhlükəsiz baxış/);
assert.match(client,/ATSRS — secure profile view/);
assert.match(client,/ATSRS — безопасный просмотр профиля/);
const labelFunction=client.split('\n').find((line)=>line.includes('function shareCopyLabel'))||'';
const localizedLabels=[...labelFunction.matchAll(/return'([^']+)'/g)].map((match)=>match[1]);
assert.equal(localizedLabels.length,3);
assert.ok(localizedLabels.every((label)=>label.startsWith('ATSRS')),'Every localized rich-link label must begin with ATSRS.');

assert.match(edge,/const SHORT_CODE_PATTERN = \/\^\[A-Za-z0-9_-\]\{22\}\$\//);
assert.match(edge,/atsrs:profile-share-short:v1:/,'Aliases must be deterministically derived from the server secret and share id.');
assert.match(edge,/short_code_hash: shortCodeHash/,'Only the alias hash may be stored.');
assert.match(edge,/if \(action === "short_link"\)/,'The owner API must support existing links.');
assert.match(edge,/loadShareByShortCode/,'Public access must resolve the alias server-side.');
assert.match(edge,/share_url: `\$\{SITE_URL\}\/s\/\$\{encodeURIComponent\(shortCode\)\}`/);

assert.match(migration,/add column if not exists short_code_hash text/i);
assert.match(migration,/create unique index if not exists atsrs_profile_shares_short_code_hash_key/i);
assert.doesNotMatch(migration,/short_code\s+text/i,'The raw bearer alias must not be stored.');

console.log('Secure short profile share link contracts passed');
