create or replace function public.atsrs_hr_next_balanced_job(p_run uuid,p_exclude text[] default '{}')
returns setof public.atsrs_job_ingestion_queue
language sql stable set search_path='' as $$
 select q.* from public.atsrs_job_ingestion_queue q
 join public.atsrs_job_sources s using(board)
 join public.atsrs_hr_specialty_totals() t on t.specialty=q.specialty
 where q.state='pending' and s.enabled
 and not (q.board||':'||q.external_id=any(p_exclude))
 and exists(select 1 from public.atsrs_job_ingestion_config c where c.enabled and c.lease_id=p_run and c.lease_until>now())
 order by (q.job_id is not null),
 (q.specialty in (select x.specialty from public.atsrs_job_ingestion_queue x where x.board||':'||x.external_id=any(p_exclude))),
 t.published_today,t.last_published_at nulls first,
 -- Prefer apparently fresh source dates within a specialty. Runtime still
 -- parses and verifies the exact timestamp; this lexical rank grants no approval.
 case when left(q.payload->>'releasedDate',10) between
   ((now() at time zone 'Asia/Baku')::date-14)::text and ((now() at time zone 'Asia/Baku')::date)::text then 0 else 1 end,
 q.discovered_at,q.board,q.external_id limit 1;
$$;
