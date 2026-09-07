begin;
insert into public.atsrs_job_sources(board,enabled,official_url) values('DOF',true,'https://www.dof.com/vacancies') on conflict(board) do update set enabled=true,official_url=excluded.official_url;
update public.atsrs_hr_source_scope set boards=array['DOF'],connector_state='connected',last_error=null where name in ('DOF','DOF Group');
commit;
