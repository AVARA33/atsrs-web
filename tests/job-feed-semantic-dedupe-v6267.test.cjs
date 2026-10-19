const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const sql = fs.readFileSync('supabase/migrations/20261019090000_job_feed_semantic_dedupe.sql', 'utf8');

test('feed collapses only semantically identical live vacancies', () => {
  assert.match(sql, /row_number\(\) over/);
  assert.match(sql, /coalesce\(job\.description, job\.summary, ''\)/);
  assert.match(sql, /coalesce\(job\.requirements, ''\)/);
  assert.match(sql, /where job\.semantic_rank = 1/);
});

test('dedupe preserves a user favorite as the visible canonical row', () => {
  assert.match(sql, /favorite\.user_id = v_user_id[\s\S]*favorite\.job_id = job\.id[\s\S]*\) desc/);
});

test('dedupe happens before limited-plan clipping and pagination', () => {
  assert.ok(sql.indexOf('where job.semantic_rank = 1') < sql.indexOf('limit case when v_full then null else 30 end'));
  assert.ok(sql.indexOf('limit case when v_full then null else 30 end') < sql.indexOf('offset ((v_page - 1) * v_page_size)'));
});
