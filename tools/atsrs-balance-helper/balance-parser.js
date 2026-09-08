'use strict';
function parseVisibleBalance(text) {
  const matches = [...String(text).matchAll(/(?:^|\n)API credit balance\s*\n\s*\$(-?(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2})(?=\s|$)/g)];
  if (matches.length !== 1) return null;
  const amount = Number(matches[0][1].replaceAll(',', ''));
  return Number.isFinite(amount) && Math.abs(amount) <= 10000000 ? amount : null;
}
if (typeof module !== 'undefined') module.exports = { parseVisibleBalance };
