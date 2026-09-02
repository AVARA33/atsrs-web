export const MODEL = 'gpt-5.4-nano-2026-03-17';
export function sourceContent(sections = {}) {
  const job = clean(sections.jobDescription?.text, Infinity);
  const additional = clean(sections.additionalInformation?.text, Infinity);
  const requirements = clean(sections.qualifications?.text, Infinity);
  const description = additional ? `${job}\n\nAdditional information\n${additional}` : job;
  if (description.length > 12000 || requirements.length > 12000) {
    return { error: 'Full source text exceeds storage limit; manual review required' };
  }
  return { description, requirements: requirements || null, error: null };
}
export function clean(value, limit = 12000) {
  return String(value ?? '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, ' ')
    .replace(/&#(?:x([0-9a-f]+)|(\d+));/gi, (_, h, d) => String.fromCodePoint(Math.min(0x10ffff, parseInt(h || d, h ? 16 : 10))))
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim().slice(0, limit);
}
export function postingUrl(value, board, id) {
  try { const u = new URL(value); return u.protocol === 'https:' && u.hostname === 'jobs.smartrecruiters.com' &&
    !u.username && !u.password && !u.port && u.pathname.startsWith(`/${board}/${id}-`); } catch { return false; }
}
export function checkDetail(d, board, id) {
  if (String(d.id) !== id || d.company?.identifier !== board) return 'Source identity mismatch';
  if (d.active !== true || d.visibility !== 'PUBLIC') return 'Not an active public vacancy';
  if (!postingUrl(d.postingUrl, board, id) || !postingUrl(d.applyUrl, board, id)) return 'Unsupported application destination';
  if (!clean(d.name) || !clean(d.company?.name) || !clean(d.location?.fullLocation || d.location?.city)) return 'Missing essential details';
  if (clean(d.jobAd?.sections?.jobDescription?.text).length < 80) return 'Insufficient job description';
  if (sourceContent(d.jobAd?.sections).error) return sourceContent(d.jobAd?.sections).error;
  return null;
}
export function usageCost(input, cached, output) { return ((input - cached) * .20 + cached * .02 + output * 1.25) / 1e6; }
export function verifiedClassification(result, text) {
  return result && result.is_vacancy === true && typeof result.summary_quote === 'string' &&
    result.summary_quote.length >= 30 && result.summary_quote.length <= 700 && text.includes(result.summary_quote);
}
