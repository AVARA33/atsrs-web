
// DOF's official vacancies page explicitly links to its Workable account.
export const DOF_FEED = 'https://apply.workable.com/api/v1/widget/accounts/dof?details=true';
export function workableUrl(value, id) {
  try {
    const u = new URL(value);
    return /^[A-F0-9]{10}$/.test(id) && u.protocol === 'https:' &&
      u.hostname === 'apply.workable.com' && !u.username && !u.password && !u.port &&
      new RegExp(`^/(?:dof/)?j/${id}/?(?:apply/?)?$`).test(u.pathname);
  } catch { return false; }
}
export function dofEntries(data) {
  if (data?.name !== 'DOF' || !Array.isArray(data.jobs)) throw new Error('DOF feed identity mismatch');
  const entries = new Map();
  for (const j of data.jobs) {
    const id = String(j.shortcode || '');
    if (!workableUrl(j.url, id) || !workableUrl(j.application_url, id)) continue;
    entries.set(id, {
      id, name: j.title, company: {identifier: 'DOF', name: 'DOF'},
      active: true, visibility: 'PUBLIC', postingUrl: j.url, applyUrl: j.application_url,
      releasedDate: j.published_on || null,
      location: {city: j.city, country: j.country, fullLocation: [j.city, j.country].filter(Boolean).join(', ')},
      typeOfEmployment: {label: j.employment_type},
      function: {id: String(j.function || '').slice(0, 80).toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'other'},
      jobAd: {sections: {jobDescription: {text: j.description}}}
    });
  }
  return entries;
}
