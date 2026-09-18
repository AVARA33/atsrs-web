-- Existing published rows are audited separately. NOT VALID preserves them while
-- enforcing the quality gate for every new or updated published vacancy.
alter table public.atsrs_jobs
  drop constraint if exists atsrs_jobs_published_content_quality;

alter table public.atsrs_jobs
  add constraint atsrs_jobs_published_content_quality
  check (
    status <> 'published'
    or (
      description is not null
      and char_length(btrim(description)) >= 80
      and nullif(btrim(source_url), '') is not null
      and nullif(btrim(application_url), '') is not null
    )
  ) not valid;

comment on constraint atsrs_jobs_published_content_quality on public.atsrs_jobs is
  'Published jobs require an 80-character description, listing source URL, and application URL. Existing exceptions remain for source-backed repair or manual review.';
