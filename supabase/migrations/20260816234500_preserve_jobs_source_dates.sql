begin;

alter table public.atsrs_jobs
  add column display_posted_date date,
  add column closing_date date;

comment on column public.atsrs_jobs.display_posted_date is
  'Verified concrete date displayed by the official application page when the LinkedIn source timestamp is unavailable.';
comment on column public.atsrs_jobs.closing_date is
  'Verified advertised closing calendar date, separate from the server enforcement timestamp expires_at.';

commit;
