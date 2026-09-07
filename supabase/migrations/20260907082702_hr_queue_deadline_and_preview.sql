begin;

create index atsrs_hr_pending_deadline_candidate
on public.atsrs_job_ingestion_queue (
  specialty,
  ((job_id is not null)),
  (nullif(left(payload->>'releasedDate',10),'')) asc nulls last,
  discovered_at,
  board,
  external_id
)
where state='pending';

drop index public.atsrs_hr_pending_balanced_candidate;

create or replace function public.atsrs_hr_next_balanced_job(p_run uuid,p_exclude text[] default '{}')
returns setof public.atsrs_job_ingestion_queue
language sql stable set search_path='' as $$
 with valid_lease as (
   select 1 from public.atsrs_job_ingestion_config c where c.enabled and c.lease_id=p_run and c.lease_until>now()
 ), excluded as (
   select split_part(v,':',1) board,substring(v from strpos(v,':')+1) external_id from unnest(p_exclude) v
 ), attempted_specialties as (
   select distinct q.specialty from excluded e join public.atsrs_job_ingestion_queue q on q.board=e.board and q.external_id=e.external_id
 ), categories as (
   select distinct q.specialty from public.atsrs_job_ingestion_queue q join public.atsrs_job_sources s using(board) where q.state='pending' and s.enabled
 ), publication_totals as (
   select q.specialty,count(*) filter(where j.created_at>=date_trunc('day',now() at time zone 'Asia/Baku') at time zone 'Asia/Baku')::bigint published_today,max(j.created_at) last_published_at
   from public.atsrs_job_ingestion_queue q join public.atsrs_jobs j on j.id=q.job_id group by q.specialty
 ), candidates as (
   select picked.* from categories c cross join lateral (
     select q.* from public.atsrs_job_ingestion_queue q join public.atsrs_job_sources s using(board)
     where q.state='pending' and q.specialty=c.specialty and s.enabled
       and not exists(select 1 from excluded e where e.board=q.board and e.external_id=q.external_id)
     order by (q.job_id is not null),nullif(left(q.payload->>'releasedDate',10),'') asc nulls last,q.discovered_at,q.board,q.external_id limit 1
   ) picked
 )
 select q.* from candidates q left join publication_totals t using(specialty)
 where exists(select 1 from valid_lease)
 order by exists(select 1 from attempted_specialties a where a.specialty=q.specialty),coalesce(t.published_today,0),t.last_published_at nulls first,q.discovered_at,q.board,q.external_id limit 1;
$$;
revoke all on function public.atsrs_hr_next_balanced_job(uuid,text[]) from public,anon,authenticated;
grant execute on function public.atsrs_hr_next_balanced_job(uuid,text[]) to service_role;

create or replace function public.atsrs_job_reserve(p_run uuid,p_board text,p_external text) returns uuid
language plpgsql security invoker set search_path='' as $$
declare cap numeric;day_cap numeric;month_used numeric;day_used numeric;result uuid;
 day_start timestamptz:=date_trunc('day',now() at time zone 'Asia/Baku') at time zone 'Asia/Baku';
begin
 select monthly_limit,daily_limit into cap,day_cap from public.atsrs_job_ingestion_config where id=true and enabled and lease_id=p_run and lease_until>now() for update;
 if not found then return null;end if;
 if not exists(select 1 from public.atsrs_job_ingestion_runs where id=p_run and billing_scope='hr_management') then return null;end if;
 if (select count(*) from public.atsrs_job_ai_calls where run_id=p_run)>=30 then return null;end if;
 select coalesce(sum(coalesce(c.cost_usd,c.reserved_usd)),0),coalesce(sum(coalesce(c.cost_usd,c.reserved_usd)) filter(where c.created_at>=day_start),0)
 into month_used,day_used from public.atsrs_job_ai_calls c join public.atsrs_job_ingestion_runs r on r.id=c.run_id
 where r.billing_scope='hr_management' and c.created_at>=date_trunc('month',now() at time zone 'Asia/Baku') at time zone 'Asia/Baku';
 insert into public.atsrs_hr_budget_days(day,daily_limit) values((now() at time zone 'Asia/Baku')::date,day_cap) on conflict(day) do update set daily_limit=excluded.daily_limit;
 if day_used+0.02>day_cap or month_used+0.02>cap then
  update public.atsrs_hr_budget_days set first_paused_at=coalesce(first_paused_at,now()),pause_reason=coalesce(pause_reason,case when day_used+0.02>day_cap then 'daily' else 'monthly' end) where day=(now() at time zone 'Asia/Baku')::date;
  return null;
 end if;
 insert into public.atsrs_job_ai_calls(run_id,board,external_id) values(p_run,p_board,p_external) returning id into result;
 return result;
end $$;
revoke all on function public.atsrs_job_reserve(uuid,text,text) from public,anon,authenticated;
grant execute on function public.atsrs_job_reserve(uuid,text,text) to service_role;

create or replace function public.atsrs_get_hr_scope() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 perform 1 from public.atsrs_get_developer_registrations();
 select jsonb_build_object(
  'scope',(select coalesce(jsonb_agg(to_jsonb(s) order by name),'[]') from public.atsrs_hr_source_scope s),
  'sources',(select coalesce(jsonb_agg(to_jsonb(s) order by board),'[]') from public.atsrs_job_sources s),
  'pending',(select count(*) from public.atsrs_job_ingestion_queue where state='pending'),
  'review',(select count(*) from public.atsrs_job_ingestion_queue where state='review'),
  'pending_recent',(select count(*) from public.atsrs_job_ingestion_queue where state='pending' and left(payload->>'releasedDate',10) between ((now() at time zone 'Asia/Baku')::date-14)::text and (now() at time zone 'Asia/Baku')::date::text),
  'pending_no_date',(select count(*) from public.atsrs_job_ingestion_queue where state='pending' and coalesce(payload->>'releasedDate','')=''),
  'queue_preview',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from (
    select q.board,q.external_id,q.specialty,q.payload->>'name' title,q.payload#>>'{company,name}' company,nullif(left(q.payload->>'releasedDate',10),'') source_date,q.discovered_at,s.provider
    from public.atsrs_job_ingestion_queue q join public.atsrs_job_sources s using(board)
    where q.state='pending' and s.enabled
    order by (q.job_id is not null),nullif(left(q.payload->>'releasedDate',10),'') asc nulls last,q.discovered_at,q.board,q.external_id limit 200
  ) p),
  'balance_policy','least_published_specialty_first_then_earliest_deadline',
  'schedule','Monday-Friday 09:00-17:00 Baku; every 5 minutes',
  'specialties',(select jsonb_agg(to_jsonb(t)||jsonb_build_object('supply_status',case when pending>0 then 'queued_for_validation' when review>0 then 'review_or_source_gap' else 'no_connected_candidates' end) order by specialty) from public.atsrs_hr_specialty_totals() t)
 ) into result;return result;
end $$;

commit;
