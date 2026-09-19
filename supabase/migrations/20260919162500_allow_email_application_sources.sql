-- Some recruiter-supplied vacancies are sourced directly from email or a
-- private recruiter message and therefore have no public listing URL.
-- Keep the publication gate strict while accepting a verified recruiter
-- email as the source for manual vacancies.
alter table public.atsrs_jobs
  drop constraint if exists atsrs_jobs_published_content_quality;

alter table public.atsrs_jobs
  add constraint atsrs_jobs_published_content_quality
  check (
    status <> 'published'
    or (
      description is not null
      and char_length(btrim(description)) >= 80
      and (
        nullif(btrim(source_url), '') is not null
        or (
          source_type = 'manual'
          and recruiter_email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
        )
      )
      and nullif(btrim(application_url), '') is not null
    )
  ) not valid;

comment on constraint atsrs_jobs_published_content_quality on public.atsrs_jobs is
  'Published jobs require an 80-character description and application destination. Public listings require a source URL; manual recruiter-supplied listings may use a verified recruiter email as their source.';
