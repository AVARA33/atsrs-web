-- Read-only repair queue for published vacancy data-quality exceptions.
-- Source-backed rows can be re-fetched from their verified source. Rows without
-- a usable source URL stay in manual review; this query never mutates job data.
select
  id,
  title,
  company,
  case
    when source_url ~* '^https?://[^[:space:]]+$' then 'source_backed_repair'
    else 'manual_review'
  end as repair_status,
  array_remove(array[
    case when nullif(btrim(description), '') is null then 'missing_description'
         when char_length(btrim(description)) < 80 then 'short_description' end,
    case when nullif(btrim(source_url), '') is null then 'missing_source_url' end,
    case when nullif(btrim(application_url), '') is null then 'missing_application_url' end
  ], null) as quality_issues
from public.atsrs_jobs
where status = 'published'
  and (
    nullif(btrim(description), '') is null
    or char_length(btrim(description)) < 80
    or nullif(btrim(source_url), '') is null
    or nullif(btrim(application_url), '') is null
  )
order by repair_status, company, title;
