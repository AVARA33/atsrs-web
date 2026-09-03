begin;
create table public.atsrs_hr_companies (
 name_key text primary key, name text not null, careers_url text not null check(careers_url like 'https://%'),
 source_url text not null check(source_url like 'https://%'), verified_at timestamptz not null default now()
);
alter table public.atsrs_hr_companies enable row level security;
revoke all on public.atsrs_hr_companies from public,anon,authenticated;
grant select on public.atsrs_hr_companies to authenticated;
create policy hr_companies_read on public.atsrs_hr_companies for select to authenticated using(true);
grant select,insert on public.atsrs_hr_companies to service_role;
create table public.atsrs_hr_directory_links (
 job_id uuid primary key references public.atsrs_jobs(id), company_key text references public.atsrs_hr_companies(name_key),
 recruiter_id uuid references public.atsrs_recruiters(id), contact_state text not null,
 source_url text not null, checked_at timestamptz not null default now()
);
alter table public.atsrs_hr_directory_links enable row level security;
revoke all on public.atsrs_hr_directory_links from public,anon,authenticated;
grant select,insert,update on public.atsrs_hr_directory_links to service_role;
grant select(id,name,company,status) on public.atsrs_recruiters to service_role;
grant insert(name,company,role_title,linkedin_url,source,status,profile_source_url,profile_source_type) on public.atsrs_recruiters to service_role;
grant update(recruiter_name,recruiter_company) on public.atsrs_jobs to service_role;
create function public.atsrs_sync_hr_directory(p_run uuid,p_job uuid,p_board text,p_contact text,p_contact_state text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare j record; official text; company_key text; rid uuid; matched integer; ca boolean:=false; ra boolean:=false; state text:=p_contact_state;
begin
 if not exists(select 1 from public.atsrs_job_ingestion_config where enabled and lease_id=p_run and lease_until>now()) then raise exception 'Active run required'; end if;
 select official_url into official from public.atsrs_job_sources where board=p_board and enabled;
 select id,company,source_url into j from public.atsrs_jobs where id=p_job;
 if official is null or j.company is null or not exists(select 1 from public.atsrs_job_ingestion_queue where job_id=p_job and board=p_board) or j.source_url not like 'https://jobs.smartrecruiters.com/'||p_board||'/%' then raise exception 'Verified source required'; end if;
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
end $$;
revoke all on function public.atsrs_sync_hr_directory(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.atsrs_sync_hr_directory(uuid,uuid,text,text,text) to service_role;
commit;
