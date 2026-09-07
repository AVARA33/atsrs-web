begin;

-- Source occupation/function, never employer industry. ROV is an explicit lane.
create function public.atsrs_hr_specialty(p jsonb) returns text
language sql immutable parallel safe set search_path='' as $$
 select case when coalesce(p->>'name','') ~* '\mROV\M|remotely operated vehicle|remote operations (cent(re|er)|operator)' then 'rov_roc'
 else coalesce(nullif(regexp_replace(lower(p#>>'{function,id}'),'[^a-z0-9_]+','_','g'),''),'unclassified') end;
$$;
revoke all on function public.atsrs_hr_specialty(jsonb) from public,anon,authenticated;
grant execute on function public.atsrs_hr_specialty(jsonb) to service_role;

alter table public.atsrs_job_ingestion_queue add column specialty text
 generated always as (public.atsrs_hr_specialty(payload)) stored;
create index atsrs_hr_pending_specialty on public.atsrs_job_ingestion_queue(specialty,discovered_at,board,external_id) where state='pending';
create index atsrs_hr_queue_job on public.atsrs_job_ingestion_queue(job_id) where job_id is not null;

create function public.atsrs_hr_specialty_totals()
returns table(specialty text,published_today bigint,pending bigint,review bigint,last_published_at timestamptz)
language sql stable set search_path='' as $$
 with categories as (select distinct q.specialty from public.atsrs_job_ingestion_queue q union select 'rov_roc'),
 counts as (
 select q.specialty,count(distinct j.id) filter(where j.created_at>=date_trunc('day',now() at time zone 'Asia/Baku') at time zone 'Asia/Baku') as published_today,
 count(*) filter(where q.state='pending' and s.enabled) as pending,
 count(*) filter(where q.state='review') as review,max(j.created_at) as last_published_at
 from public.atsrs_job_ingestion_queue q join public.atsrs_job_sources s using(board)
 left join public.atsrs_jobs j on j.id=q.job_id group by q.specialty
 ) select c.specialty,coalesce(t.published_today,0),coalesce(t.pending,0),coalesce(t.review,0),t.last_published_at
 from categories c left join counts t using(specialty);
$$;
revoke all on function public.atsrs_hr_specialty_totals() from public,anon,authenticated;
grant execute on function public.atsrs_hr_specialty_totals() to service_role;

-- One global choice after every successful write. Today's existing skew is
-- counted, so low-volume occupations catch up before dominant ones get more.
create function public.atsrs_hr_next_balanced_job(p_run uuid,p_exclude text[] default '{}')
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
 t.published_today,t.last_published_at nulls first,q.discovered_at,q.board,q.external_id limit 1;
$$;
revoke all on function public.atsrs_hr_next_balanced_job(uuid,text[]) from public,anon,authenticated;
grant execute on function public.atsrs_hr_next_balanced_job(uuid,text[]) to service_role;

create or replace function public.atsrs_get_hr_scope() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; begin
 perform 1 from public.atsrs_get_developer_registrations();
 select jsonb_build_object('scope',(select coalesce(jsonb_agg(to_jsonb(s) order by name),'[]') from public.atsrs_hr_source_scope s),
 'sources',(select coalesce(jsonb_agg(to_jsonb(s) order by board),'[]') from public.atsrs_job_sources s),
 'pending',(select count(*) from public.atsrs_job_ingestion_queue where state='pending'),
 'review',(select count(*) from public.atsrs_job_ingestion_queue where state='review'),
 'balance_policy','least_published_specialty_first',
 'schedule','Daily 09:00–17:00 Baku; every 5 minutes',
 'specialties',(select jsonb_agg(to_jsonb(t)||jsonb_build_object('supply_status',case when pending>0 then 'queued_for_validation' when review>0 then 'review_or_source_gap' else 'no_connected_candidates' end) order by specialty) from public.atsrs_hr_specialty_totals() t)) into result;
 return result;
end $$;

-- Only the requested HR schedule; budgets, keys and unrelated jobs are unchanged.
select cron.schedule('atsrs-hr-weekday-ingestion','*/5 5-12 * * *','select public.atsrs_dispatch_job_ingestion();');
select cron.schedule('atsrs-hr-final-daily-ingestion','0 13 * * *','select public.atsrs_dispatch_job_ingestion();');
CREATE OR REPLACE FUNCTION public.atsrs_sync_hr_directory(p_run uuid, p_job uuid, p_board text, p_contact text, p_contact_state text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare j record; official text; company_key text; rid uuid; matched integer; ca boolean:=false; ra boolean:=false; state text:=p_contact_state;
begin
 if not exists(select 1 from public.atsrs_job_ingestion_config where enabled and lease_id=p_run and lease_until>now()) then raise exception 'Active run required'; end if;
 select official_url into official from public.atsrs_job_sources where board=p_board and enabled;
 select id,company,source_url into j from public.atsrs_jobs where id=p_job;
 if official is null or j.company is null or not exists(select 1 from public.atsrs_job_ingestion_queue where job_id=p_job and board=p_board) or not (j.source_url like 'https://jobs.smartrecruiters.com/'||p_board||'/%' or (p_board='DOF' and j.company='DOF' and j.source_url ~ '^https://apply[.]workable[.]com/(dof/)?j/[A-F0-9]{10}/?$')) then raise exception 'Verified source required'; end if;
 company_key:=lower(regexp_replace(btrim(j.company),'\s+',' ','g'));
 perform pg_advisory_xact_lock(hashtextextended(company_key,0));
 insert into public.atsrs_hr_companies(name_key,name,careers_url,source_url) values(company_key,j.company,official,j.source_url) on conflict do nothing;
 ca:=found;
 if state not in ('not_provided','review','verified') then raise exception 'Invalid contact state'; end if;
 if state='verified' and p_contact is not null and length(p_contact) between 3 and 120 and position(' ' in btrim(p_contact))>0 then
  select count(*),(array_agg(id))[1] into matched,rid from public.atsrs_recruiters where lower(btrim(name))=lower(btrim(p_contact)) and lower(regexp_replace(btrim(company),'\s+',' ','g'))=company_key;
  if matched>1 then rid:=null;state:='review';
  elsif matched=0 then
   insert into public.atsrs_recruiters(name,company,role_title,linkedin_url,source,status,profile_source_url,profile_source_type)
   values(p_contact,j.company,'Job posting contact',null,'official_job_contact','active',j.source_url,'official_job_post') returning id into rid;
   ra:=true;
  end if;
  if rid is not null then update public.atsrs_jobs set recruiter_name=p_contact,recruiter_company=j.company where id=p_job; end if;
 elsif state='verified' then state:='review';
 end if;
 insert into public.atsrs_hr_directory_links(job_id,company_key,recruiter_id,contact_state,source_url)
 values(p_job,company_key,rid,state,j.source_url)
 on conflict(job_id) do update set company_key=excluded.company_key,recruiter_id=coalesce(excluded.recruiter_id,atsrs_hr_directory_links.recruiter_id),contact_state=excluded.contact_state,checked_at=now(),source_url=excluded.source_url;
 return jsonb_build_object('company_added',ca,'recruiter_added',ra,'contact_state',state);
end $function$;
commit;
