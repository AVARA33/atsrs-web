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

test('file metadata uses a short scoped cache with mutation invalidation', () => {
  assert.match(runtime, /FILE_LIST_CACHE_TTL=30000/);
  assert.match(runtime, /fileListCacheKey\(wantedScope,categories,offset,limit\)/);
  assert.match(runtime, /cached&&cached\.expiresAt>Date\.now\(\)/);
  assert.match(runtime, /function cachedFileById\(id\)/);
  assert.match(runtime, /if\(cached\)return cached/);
  assert.match(runtime, /invalidateFileMetadata\(scope\(\)\)/);
  assert.match(runtime, /fileListCache\.clear\(\)/);
});

test('file-backed routes page metadata lazily without fetching file bodies', () => {
  assert.match(runtime, /FILE_PAGE_SIZE=30/);
  assert.match(runtime, /limit:FILE_PAGE_SIZE\+1/);
  assert.match(runtime, /renderCloudFiles\(\{page:pageName,categories:categories,force:true,loadMore:true\}\)/);
  assert.match(runtime, /Load more files/);
  assert.match(runtime, /createSignedUrl\(/);
  assert.doesNotMatch(runtime, /renderCloudFiles[\s\S]{0,1200}\.storage\.from\([^)]*\)\.download\(/);
});

test('database has ordered account and category indexes for file metadata', () => {
  assert.match(migration, /\(user_id, account_type, created_at desc\)/i);
  assert.match(migration, /\(user_id, account_type, category, created_at desc\)/i);
});
