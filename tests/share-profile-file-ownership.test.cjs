const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const client = read('js/share-profile.js');
const edge = read('supabase/functions/share-profile/index.ts');
const html = read('index.html');

assert.match(client, /auth\.getUser\(\)/, 'owner list must resolve the authenticated user');
assert.match(client, /\.eq\('user_id',owner\.id\)\.eq\('account_type','personal'\)/, 'owner list must explicitly scope the metadata query');
assert.match(client, /metadata\.document_registered!==false/, 'unfinished QR uploads must not be listed');

assert.match(edge, /function isShareEligibleFile\(file: JsonObject\)/);
assert.match(edge, /select\("id,metadata"\)[\s\S]*?\.eq\("user_id", user\.id\)[\s\S]*?isShareEligibleFile/, 'link creation must reject unfinished files at the server boundary');
assert.match(edge, /select\("id,file_name,storage_path,metadata"\)[\s\S]*?!isShareEligibleFile\(file\.data as JsonObject\)/, 'download must re-check share eligibility');
assert.match(edge, /fileResult\.data \?\? \[\]\)\.filter\(\(file\) =>[\s\S]*?isShareEligibleFile/, 'public profile rendering must hide stale unfinished files');
assert.match(edge, /if \(preview\.error \|\| !preview\.data\?\.signedUrl\) return null;[\s\S]*?documentResults\.filter\(\(document\) => document !== null\)/, 'a stale Storage object must be skipped instead of breaking the entire shared profile');
assert.match(html, /js\/share-profile\.js\?v=427/);
assert.match(edge, /route=profile&tab=sharing&request=/, 'owner email must deep-link to Profile Sharing');
assert.match(edge, />Review request<\/a>/, 'owner email must provide a clear review action');
assert.match(edge, />Approve all files<\/a>/, 'owner email must provide a safe approve-all intent');
assert.match(edge, /Verified email<\/td>/, 'owner email must separate verified requester identity');

console.log('Share profile ownership and registration contracts passed');
