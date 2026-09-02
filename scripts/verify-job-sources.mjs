// Read-only source audit. Does not publish jobs or call a paid AI service.
export const sources = [
  ['BoschGroup', 'https://www.bosch.com/careers/'],
  ['Eurofins', 'https://careers.eurofins.com/'],
  ['Experian', 'https://jobs.experian.com/jobs'],
  ['GriffithUniversity', 'https://www.griffith.edu.au/jobs/search-jobs'],
  ['QantasGroup', 'https://www.qantas.com/au/en/about-us/qantas-careers.html'],
  ['AccorCorpo', 'https://careers.accor.com/'],
  ['SGS', 'https://www.sgs.com/en/careers'],
  ['SyngentaGroup', 'https://jobs.syngenta.com/'],
  ['NCSAustralia', 'https://www.ncs.co/en-au/careers/'],
  ['TurnerTownsend', 'https://www.turnerandtownsend.com/careers/'],
];
if (process.argv[1]?.endsWith('verify-job-sources.mjs')) {
  await Promise.all(sources.map(async ([board, official]) => {
    try {
      const response = await fetch(official, {signal: AbortSignal.timeout(15000)});
      const html = await response.text();
      const links = [...new Set(html.match(/https?:[^\s"<>]*smartrecruiters[^\s"<>]*/gi) || [])];
      const api = await fetch(`https://api.smartrecruiters.com/v1/companies/${board}/postings?limit=1`);
      const listing = await api.json();
      const first = listing.content?.[0];
      const detail = first ? await (await fetch(`https://api.smartrecruiters.com/v1/companies/${board}/postings/${first.id}`)).json() : {};
      const page = detail.postingUrl ? await fetch(detail.postingUrl, {signal: AbortSignal.timeout(15000)}) : null;
      console.log(JSON.stringify({board, official, officialStatus:response.status, links:links.slice(0,8), apiStatus:api.status,
        total:listing.totalFound, active:detail.active, posting:detail.postingUrl,
        pageStatus:page?.status, finalUrl:page?.url}));
    } catch (error) { console.log(JSON.stringify({board, error:error.message})); }
  }));
}
