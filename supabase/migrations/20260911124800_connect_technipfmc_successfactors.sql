-- TechnipFMC publishes its full catalogue through SAP SuccessFactors.
update public.atsrs_job_sources
set enabled = true,
    official_url = 'https://careers.technipfmc.com/go/View-all-careers/9421700/',
    provider = 'successfactors',
    source_config = '{"provider":"successfactors","root":"https://careers.technipfmc.com/go/View-all-careers/9421700/","feed":"https://careers.technipfmc.com/search/","prefixes":["https://careers.technipfmc.com/"],"company":"TechnipFMC"}'::jsonb,
    scan_offset = 0,
    discovery_state = '{}'::jsonb,
    last_checked_at = null,
    last_error = null
where board = 'HRfcf1875af3c5e9688d';

update public.atsrs_hr_source_scope
set careers_url = 'https://careers.technipfmc.com/go/View-all-careers/9421700/',
    connector_state = 'connected',
    last_error = null,
    last_checked_at = null
where name = 'TechnipFMC';
