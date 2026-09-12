-- Refresh existing ROV descriptions from their verified official detail pages.
-- The worker recognizes this reason and updates only source-backed description fields.
update public.atsrs_job_ingestion_queue q
set state = 'pending',
    reason = 'Refresh official description formatting',
    checked_at = null
from public.atsrs_jobs j
where q.job_id = j.id
  and q.specialty = 'rov_roc'
  and q.state = 'published'
  and j.status = 'published';
