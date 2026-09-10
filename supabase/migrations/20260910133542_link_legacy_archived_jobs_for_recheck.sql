begin;

-- Link older imported rows to an exact queue item only when both records use
-- the same enabled source account and the same official posting/apply URL.
with unlinked_jobs as (
  select j.id, j.source_url, j.application_url
  from public.atsrs_jobs j
  where j.status = 'archived'
    and not exists (
      select 1 from public.atsrs_job_ingestion_queue linked where linked.job_id = j.id
    )
), candidate_boards as (
  select distinct j.id, j.source_url, j.application_url, s.board
  from unlinked_jobs j
  join public.atsrs_job_sources s on s.enabled
  cross join lateral jsonb_array_elements_text(
    coalesce(s.source_config->'prefixes', '[]'::jsonb)
  ) prefix
  where j.source_url = prefix
     or starts_with(j.source_url, rtrim(prefix, '/') || '/')
     or j.application_url = prefix
     or starts_with(j.application_url, rtrim(prefix, '/') || '/')
), exact_matches as (
  select c.id, q.board, q.external_id,
         count(*) over (partition by c.id) as job_match_count
  from candidate_boards c
  join public.atsrs_job_ingestion_queue q
    on q.board = c.board
   and q.job_id is null
   and (
     q.payload->>'postingUrl' in (c.source_url, c.application_url)
     or q.payload->>'applyUrl' in (c.source_url, c.application_url)
   )
), unique_matches as (
  select id, board, external_id
  from exact_matches
  where job_match_count = 1
)
update public.atsrs_job_ingestion_queue q
set job_id = m.id,
    state = 'recheck',
    checked_at = null,
    recheck_attempts = 0,
    reason = 'Official source revalidation requested before restoration'
from unique_matches m
where q.board = m.board
  and q.external_id = m.external_id
  and q.job_id is null;

commit;
