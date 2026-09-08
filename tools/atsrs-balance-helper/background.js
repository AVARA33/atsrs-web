'use strict';
let busy = false;
const billingUrl = 'https://platform.openai.com/settings/organization/billing/overview';
async function readBalance() {
  if (busy) return {error:'A balance check is already running.'};
  busy = true;
  let tab;
  try {
    tab = await chrome.tabs.create({url:billingUrl, active:false});
    let previous = null, lastError = 'Sign in to OpenAI in this browser, then try again.';
    // Two matching reads avoid reporting an intermediate page value.
    for (let attempt=0; attempt<20; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        const data = await chrome.tabs.sendMessage(tab.id, {type:'READ_VISIBLE_BALANCE'});
        if (data?.currency === 'USD' && Number.isFinite(data.amount)) {
          if (previous === data.amount) {
            const verified = {amount:data.amount, currency:'USD', checkedAt:new Date().toISOString()};
            await chrome.storage.local.set({verifiedBalance:verified});
            return verified;
          }
          previous = data.amount;
        } else { previous=null; if (data?.error) lastError=data.error; }
      } catch { previous=null; }
    }
    return {error:lastError};
  } catch { return {error:'Unable to open the background balance check.'}; }
  finally {
    if (tab?.id) { try { await chrome.tabs.remove(tab.id); } catch {} }
    busy=false;
  }
}
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== chrome.runtime.id || sender.frameId !== 0 || !sender.tab || !['CHECK_BALANCE','GET_LAST_BALANCE'].includes(message?.type)) return;
  try { if (new URL(sender.url).origin !== 'https://atsrs.com') return; } catch { return; }
  if (message.type === 'GET_LAST_BALANCE') chrome.storage.local.get('verifiedBalance').then(data => reply(data.verifiedBalance || null));
  else readBalance().then(reply);
  return true;
});
