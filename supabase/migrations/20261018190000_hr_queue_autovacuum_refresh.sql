begin;

-- The owner dashboard counts pending and review rows on every refresh. The
-- queue changes continuously, so PostgreSQL's default 20% vacuum threshold
-- leaves too many heap pages non-visible and turns index-only counts into slow
-- heap reads. Keep this high-churn table vacuumed at roughly 2% churn instead.
alter table public.atsrs_job_ingestion_queue set (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_vacuum_threshold = 500,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_analyze_threshold = 500
);

commit;
