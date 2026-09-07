begin;
-- Official company pages resolve the three ambiguous historical records.
insert into public.atsrs_job_sources(board,enabled,official_url,provider,source_config) values
('IOTAGROUP',true,'https://iota-group.com/careers/','smartrecruiters','{}'),
('HROpenArt',true,'https://jobs.ashbyhq.com/openart','ashby','{"company":"OpenArt AI","root":"https://jobs.ashbyhq.com/openart","feed":"https://api.ashbyhq.com/posting-api/job-board/openart","prefixes":["https://jobs.ashbyhq.com/openart","https://api.ashbyhq.com/posting-api/job-board/openart"]}'),
('HRAccordPeople',true,'https://accord-people.com/vacancies/','web','{"company":"Accord People","root":"https://accord-people.com/vacancies/","seeds":["https://accord-people.com/vacancies/"],"prefixes":["https://accord-people.com/"]}');
update public.atsrs_hr_source_scope set boards=array['IOTAGROUP'],careers_url='https://iota-group.com/careers/',website='https://iota-group.com/',connector_state='needs_connector',last_error='Corrected employer identity; discovery scheduled' where name='IOTA GROUP';
update public.atsrs_hr_source_scope set boards=array['HROpenArt'],careers_url='https://jobs.ashbyhq.com/openart',connector_state='needs_connector',last_error='Dedicated employer board verified; discovery scheduled' where name='OpenArt';
update public.atsrs_hr_source_scope set boards=array['HRAccordPeople'],careers_url='https://accord-people.com/vacancies/',website='https://accord-people.com/',connector_state='needs_connector',last_error='Corrected offshore employer identity; discovery scheduled' where name='Accord People';
commit;
