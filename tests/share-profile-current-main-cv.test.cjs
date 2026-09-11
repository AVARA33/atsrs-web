const assert = require('node:assert/strict');
const fs = require('node:fs');

const edge = fs.readFileSync('supabase/functions/share-profile/index.ts', 'utf8');

assert.match(edge, /function currentMainCv\(files: JsonObject\[\]\)/,
  'shared profiles must resolve the current Main CV');
assert.match(edge, /fileMetadata\(file\)\.is_main === true/,
  'an explicitly selected Main CV must win');
assert.match(edge, /sharedCvIds\.has\(id\) \? mainId : id/,
  'a stale shared CV id must be replaced without changing other shared documents');
assert.match(edge, /share\.selected_file_ids = await refreshSharedMainCv\(admin, share\)/g,
  'public rendering and public actions must use the same resolved file ids');
assert.match(edge, /selected_file_ids: resolved/,
  'the repaired file selection must persist on the share link');

console.log('Shared profile current Main CV contracts passed');
