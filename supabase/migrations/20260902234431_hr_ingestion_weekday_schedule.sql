begin;
insert into public.atsrs_job_sources(board,official_url,enabled) values
 ('Eurofins','https://careers.eurofins.com/',true),
 ('Experian','https://jobs.experian.com/jobs',true),
 ('NCSAustralia','https://www.ncs.co/en-au/careers/',true)
on conflict(board) do update set official_url=excluded.official_url,enabled=true;
create function public.atsrs_dispatch_job_ingestion() returns bigint
language plpgsql set search_path='' as $$
declare ticket uuid; request_id bigint;
begin
 if not exists(select 1 from public.atsrs_job_ingestion_config where enabled) then return null; end if;
 insert into public.atsrs_job_run_tickets default values returning token into ticket;
 select net.http_post(url:='https://hwtjuqyxzivymofamwxl.supabase.co/functions/v1/job-ingestion',
 headers:='{"Content-Type":"application/json"}'::jsonb,
 body:=jsonb_build_object('ticket',ticket),timeout_milliseconds:=120000) into request_id;
 return request_id;
end $$;
revoke all on function public.atsrs_dispatch_job_ingestion() from public,anon,authenticated;
grant execute on function public.atsrs_dispatch_job_ingestion() to service_role;
-- UTC 05:00–13:00 = Baku 09:00–17:00, Monday–Friday.
select cron.schedule('atsrs-hr-weekday-ingestion','0 5-13 * * 1-5','select public.atsrs_dispatch_job_ingestion();');
-- Keep the conservative USD 0.50 monthly test ceiling; do not raise it implicitly.
update public.atsrs_job_ingestion_config set enabled=false;
commit;
