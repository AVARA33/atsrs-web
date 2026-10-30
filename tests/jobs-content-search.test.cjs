const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations',
  '20261030071500_expand_jobsearch_content_search.sql'), 'utf8');
const indexMigration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations',
  '20261030073000_index_jobsearch_content_tokens.sql'), 'utf8');
const optimizedFeedMigration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations',
  '20261030074500_optimize_jobs_feed_v2_content_search.sql'), 'utf8');
const indexedCandidateMigration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations',
  '20261030080000_use_indexed_jobsearch_candidates.sql'), 'utf8');
const splitPathMigration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations',
  '20261030081500_split_jobsearch_query_paths.sql'), 'utf8');
const accessPathMigration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations',
  '20261030083000_remove_full_feed_visibility_or.sql'), 'utf8');

assert.match(migration, /add column if not exists search_tokens text\[\]/i);
assert.match(migration, /private\.atsrs_job_search_tokens\(concat_ws\(' ',[\s\S]*new\.title/i);
assert.match(migration, /new\.equipment, new\.summary, new\.description/i);
assert.match(migration, /new\.requirements, new\.recruiter_name, new\.recruiter_company/i);
assert.match(migration, /after insert or update of[\s\S]*equipment[\s\S]*description[\s\S]*requirements/i);
assert.match(migration, /join atsrs_private\.atsrs_job_semantic_keys as semantic[\s\S]*semantic\.job_id = job\.id/i);
assert.match(migration, /job\.search_tokens @> v_search_tokens/i);
assert.doesNotMatch(migration, /atsrs_job_title_matches_terms\(job\.title/i);
assert.match(migration, /security definer[\s\S]*set search_path = ''/i);
assert.match(migration, /revoke all on function public\.atsrs_jobs_feed_v2[\s\S]*from public, anon, authenticated, service_role/i);
assert.match(migration, /grant execute on function public\.atsrs_jobs_feed_v2[\s\S]*to anon, authenticated/i);
assert.match(indexMigration, /create index if not exists atsrs_job_semantic_keys_search_tokens_gin/i);
assert.match(indexMigration, /using gin \(search_tokens\)/i);
assert.match(optimizedFeedMigration, /with available_ids as materialized/i);
assert.match(optimizedFeedMigration, /select job\.id, job\.updated_at/i);
assert.match(optimizedFeedMigration, /semantic\.search_tokens @> v_search_tokens/i);
assert.match(optimizedFeedMigration, /from page_ids as page[\s\S]*join public\.atsrs_jobs as job on job\.id = page\.id/i);
assert.doesNotMatch(optimizedFeedMigration, /select job\.\*[\s\S]*from public\.atsrs_jobs/i);
assert.match(optimizedFeedMigration, /set work_mem = '32MB'/i);
assert.match(indexedCandidateMigration, /with limited_ids as materialized/i);
assert.match(indexedCandidateMigration, /limit case when v_full then 0 else 30 end/i);
assert.match(indexedCandidateMigration, /from atsrs_private\.atsrs_job_semantic_keys as semantic/i);
assert.match(indexedCandidateMigration, /semantic\.search_tokens @> v_search_tokens/i);
assert.match(indexedCandidateMigration, /v_full or job\.id in \(select limited\.id from limited_ids as limited\)/i);
assert.match(splitPathMigration, /if cardinality\(v_search_tokens\) = 0 then/i);
assert.match(splitPathMigration, /else[\s\S]*from atsrs_private\.atsrs_job_semantic_keys as semantic/i);
assert.match(splitPathMigration, /from unnest\(v_page_ids\) with ordinality as page/i);
assert.doesNotMatch(splitPathMigration, /select job\.\*/i);
assert.match(accessPathMigration, /if v_full and cardinality\(v_search_tokens\) = 0 then/i);
assert.match(accessPathMigration, /elsif v_full then/i);
assert.match(accessPathMigration, /else[\s\S]*with limited_ids as materialized/i);
assert.doesNotMatch(accessPathMigration, /v_full or job\.id in/i);

console.log('JobSearch complete-vacancy search contract passed.');

