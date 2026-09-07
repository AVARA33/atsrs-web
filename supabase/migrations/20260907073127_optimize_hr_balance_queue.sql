begin;

-- The former selector recomputed full queue totals and scanned attempted IDs for
-- every AI call. With 45k pending rows that exceeded the API statement timeout.
-- Reduce the candidate set to one indexed row per specialty before ranking it.
create or replace function public.atsrs_hr_next_balanced_job(
  p_run uuid,
  p_exclude text[] default '{}'
) returns setof public.atsrs_job_ingestion_queue
language sql stable set search_path='' as $$
 with
 valid_lease as (
   select 1
   from public.atsrs_job_ingestion_config c
   where c.enabled and c.lease_id=p_run and c.lease_until>now()
 ),
 excluded as (
   select split_part(v,':',1) board,
          substring(v from strpos(v,':')+1) external_id
   from unnest(p_exclude) v
 ),
 attempted_specialties as (
   select distinct q.specialty
   from excluded e
   join public.atsrs_job_ingestion_queue q
     on q.board=e.board and q.external_id=e.external_id
 ),
 categories as (
   select distinct q.specialty
   from public.atsrs_job_ingestion_queue q
   join public.atsrs_job_sources s using(board)
   where q.state='pending' and s.enabled
 ),
 publication_totals as (
   select q.specialty,
          count(*) filter (
            where j.created_at >= date_trunc('day',now() at time zone 'Asia/Baku') at time zone 'Asia/Baku'
          )::bigint published_today,
          max(j.created_at) last_published_at
   from public.atsrs_job_ingestion_queue q
   join public.atsrs_jobs j on j.id=q.job_id
   group by q.specialty
 ),
 candidates as (
   select picked.*
   from categories c
   cross join lateral (
     select q.*
     from public.atsrs_job_ingestion_queue q
     join public.atsrs_job_sources s using(board)
     where q.state='pending'
       and q.specialty=c.specialty
       and s.enabled
       and not exists (
         select 1 from excluded e
         where e.board=q.board and e.external_id=q.external_id
       )
     order by (q.job_id is not null),
       case when left(q.payload->>'releasedDate',10) between
         ((now() at time zone 'Asia/Baku')::date-14)::text
         and ((now() at time zone 'Asia/Baku')::date)::text then 0 else 1 end,
       q.discovered_at,q.board,q.external_id
     limit 1
   ) picked
 )
 select q.*
 from candidates q
 left join publication_totals t using(specialty)
 where exists(select 1 from valid_lease)
 order by exists(select 1 from attempted_specialties a where a.specialty=q.specialty),
   coalesce(t.published_today,0),t.last_published_at nulls first,
   q.discovered_at,q.board,q.external_id
 limit 1;
$$;

revoke all on function public.atsrs_hr_next_balanced_job(uuid,text[]) from public,anon,authenticated;
grant execute on function public.atsrs_hr_next_balanced_job(uuid,text[]) to service_role;

commit;
