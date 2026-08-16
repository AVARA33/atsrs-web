const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const edge = fs.readFileSync(path.join(root, 'supabase', 'functions', 'talent-profile-actions', 'index.ts'), 'utf8');
const client = fs.readFileSync(path.join(root, 'js', 'talent-directory.js'), 'utf8');
const directoryProjection = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20260816184500_bounded_talent_directory_page.sql'), 'utf8');

assert.match(edge, /admin\.rpc\("atsrs_talent_directory_page"/,
  'Candidate Directory must use the bounded server projection');
assert.match(directoryProjection, /profile\.discoverable = true\s*and profile\.profile_visibility = 'Public'/,
  'Candidate Directory projection must only return discoverable Public profiles');
assert.match(directoryProjection, /exists\s*\([\s\S]*from public\.atsrs_files/,
  'Candidate Directory projection must retain certificate eligibility');
assert.match(client, /profile\.discoverable===true&&profile\.profile_visibility==='Public'/,
  'the browser must reject non-public profiles returned by a stale server response');

const personnelBlock = edge.slice(edge.indexOf('if (action === "personnel_links")'), edge.indexOf('const targetUserId'));
assert.match(personnelBlock, /atsrs_talent_personnel_links/,
  'Personnel must remain based on explicit company links');
assert.doesNotMatch(personnelBlock, /profile_visibility|discoverable/,
  'linked Personnel must not disappear when the owner makes their Candidate profile Private');
assert.match(personnelBlock, /atsrs_workspace_data/,
  'Personnel must read the authoritative saved Personal profile instead of relying on a stale directory row');
assert.match(personnelBlock, /currentPersonnelProfile/,
  'Personnel cards must overlay current saved profile fields onto their linked directory record');
assert.match(edge, /if \(!isPublicProfile\)[\s\S]*atsrs_talent_personnel_links[\s\S]*action === "add_to_personnel"/,
  'private profiles must only remain accessible through an existing Personnel link');

console.log('talent directory privacy tests passed');
