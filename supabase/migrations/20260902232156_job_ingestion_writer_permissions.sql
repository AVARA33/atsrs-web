begin;
-- Server-only ingestion writer. No DELETE, no user-data access, no client grants.
grant insert(title,company,location,country,work_type,summary,description,requirements,source_type,source_url,application_url,external_id,source_posted_at,status,expires_at), update(title,company,location,country,work_type,summary,description,requirements,source_type,source_url,application_url,external_id,source_posted_at,status,expires_at) on public.atsrs_jobs to service_role;
commit;
