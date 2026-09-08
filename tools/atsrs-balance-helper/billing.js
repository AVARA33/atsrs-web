'use strict';
// Pin the already inspected project: do not silently read another selected account.
const expectedProjectPath = '/settings/proj_MnhnH1SPta5UapdJKNnfJ2TY';
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== chrome.runtime.id || message?.type !== 'READ_VISIBLE_BALANCE') return;
  if (location.origin !== 'https://platform.openai.com' || location.pathname !== '/settings/organization/billing/overview') return;
  const projectMatches = [...document.querySelectorAll('a[href]')].some(a => new URL(a.href).pathname === expectedProjectPath);
  if (!projectMatches) { reply({error:'The selected OpenAI project does not match the configured HR account. Open billing and select HR management.'}); return; }
  const amount = parseVisibleBalance(document.body.innerText);
  reply(amount === null ? {error:'The visible credit balance could not be read. Check the OpenAI login and billing page.'} : {amount, currency:'USD'});
});
