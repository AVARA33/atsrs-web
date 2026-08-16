const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'server-data.js'), 'utf8');
const migration = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '20260816122807_file_metadata_pagination_indexes.sql'),
  'utf8'
);

test('cloud file metadata is loaded only for file-backed routes', () => {
  assert.match(runtime, /if\(page==='certificates'\)return \['document'\]/);
  assert.match(runtime, /if\(page==='refs'\)return \['appraisal','reference','recommendation','coverLetter','cv'\]/);
  assert.match(runtime, /if\(!categories\.length&&!options\.force\)return/);
});

test('file metadata query supports category filtering and server-side ranges', () => {
  assert.match(runtime, /query=query\.in\('category',categories\)/);
  assert.match(runtime, /query=query\.range\(offset,offset\+limit-1\)/);
  assert.match(runtime, /categories\.join\(','\).*offset.*limit/s);
});

test('database has ordered account and category indexes for file metadata', () => {
  assert.match(migration, /\(user_id, account_type, created_at desc\)/i);
  assert.match(migration, /\(user_id, account_type, category, created_at desc\)/i);
});
