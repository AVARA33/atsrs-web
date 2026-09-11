-- Replace generic careers-page crawls with the employers' public ATS feeds.
alter table public.atsrs_job_sources
  drop constraint if exists atsrs_job_sources_provider_check;
alter table public.atsrs_job_sources
  add constraint atsrs_job_sources_provider_check
  check (provider in ('smartrecruiters','ashby','greenhouse','lever','recruitee','workday','web','recman','hrmanager','successfactors'));

update public.atsrs_job_sources
set enabled = true,
    official_url = 'https://leveloffshoreno.recman.page/jobs?sort=newest',
    provider = 'recman',
    source_config = '{"provider":"recman","root":"https://leveloffshoreno.recman.page/jobs?sort=newest","prefixes":["https://leveloffshoreno.recman.page/"],"company":"LEVEL Offshore"}'::jsonb,
    scan_offset = 0,
    discovery_state = '{}'::jsonb,
    last_checked_at = null,
    last_error = null
where board = 'HRf357fe4c12fe06db0c';

update public.atsrs_job_sources
set enabled = true,
    official_url = 'https://www.deepoceangroup.com/people/open-positions',
    provider = 'hrmanager',
    source_config = '{"provider":"hrmanager","root":"https://www.deepoceangroup.com/people/open-positions","feed":"https://recruiter-api.hr-manager.net/jobportal.svc/527004_tr/positionlist/json","prefixes":["https://recruiter-api.hr-manager.net/jobportal.svc/527004_tr/positionlist/json","https://candidate.hr-manager.net/ApplicationInit.aspx"],"company":"DeepOcean"}'::jsonb,
    scan_offset = 0,
    discovery_state = '{}'::jsonb,
    last_checked_at = null,
    last_error = null
where board = 'HRf00daf8d02bcdb81a0';

update public.atsrs_job_sources
set enabled = true,
    official_url = 'https://careers.subsea7.com/go/All-Subsea7-Jobs/9310955/',
    provider = 'successfactors',
    source_config = '{"provider":"successfactors","root":"https://careers.subsea7.com/go/All-Subsea7-Jobs/9310955/","feed":"https://careers.subsea7.com/search/","prefixes":["https://careers.subsea7.com/"],"company":"Subsea7"}'::jsonb,
    scan_offset = 0,
    discovery_state = '{}'::jsonb,
    last_checked_at = null,
    last_error = null
where board = 'HR5e9d12c5c4c2b7a3a2';

update public.atsrs_hr_source_scope
set careers_url = case
      when name in ('DeepOcean', 'DeepOcean US') then 'https://www.deepoceangroup.com/people/open-positions'
      when name = 'Subsea7' then 'https://careers.subsea7.com/go/All-Subsea7-Jobs/9310955/'
      else careers_url
    end,
    connector_state = 'connected',
    last_error = null,
    last_checked_at = null
where name in ('LEVEL Offshore', 'DeepOcean', 'DeepOcean US', 'Subsea7');
