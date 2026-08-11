const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const edge = fs.readFileSync(path.join(root, 'supabase', 'functions', 'talent-profile-actions', 'index.ts'), 'utf8');
const client = fs.readFileSync(path.join(root, 'js', 'talent-directory.js'), 'utf8');

assert.match(edge, /\.eq\("discoverable", true\)\s*\.eq\("profile_visibility", "Public"\)/,
  'Candidate Directory must only query discoverable Public profiles');
assert.match(edge, /discoverable: visibility === "Public"/,
  'fallback profiles must never make Private or Link Only profiles discoverable');
assert.match(edge, /\.filter\(\(profile\) => profile\.discoverable === true && profile\.profile_visibility === "Public"\)/,
  'Candidate Directory response must enforce visibility before returning profiles');
assert.match(client, /profile\.discoverable===true&&profile\.profile_visibility==='Public'/,
  'the browser must reject non-public profiles returned by a stale server response');

const personnelBlock = edge.slice(edge.indexOf('if (action === "personnel_links")'), edge.indexOf('const targetUserId'));
assert.match(personnelBlock, /atsrs_talent_personnel_links/,
  'Personnel must remain based on explicit company links');
assert.doesNotMatch(personnelBlock, /profile_visibility|discoverable/,
  'linked Personnel must not disappear when the owner makes their Candidate profile Private');
assert.match(edge, /if \(!isPublicProfile\)[\s\S]*atsrs_talent_personnel_links[\s\S]*action === "add_to_personnel"/,
  'private profiles must only remain accessible through an existing Personnel link');

console.log('talent directory privacy tests passed');
