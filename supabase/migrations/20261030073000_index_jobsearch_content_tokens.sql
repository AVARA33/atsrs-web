-- Make complete-vacancy token searches index-backed.

begin;
set local lock_timeout = '10s';
set local statement_timeout = '120s';

create index if not exists atsrs_job_semantic_keys_search_tokens_gin
  on atsrs_private.atsrs_job_semantic_keys
  using gin (search_tokens);

commit;

