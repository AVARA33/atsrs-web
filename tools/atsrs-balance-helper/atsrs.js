'use strict';
function attachBalanceButton() {
  const host = document.getElementById('jobIngestionMonitor');
  if (!host || host.classList.contains('hidden') || host.querySelector('[data-atsrs-balance-helper]')) return;
  const box = host.querySelector('.job-monitor-metrics > div');
  const label = box?.querySelector('span'), amount = box?.querySelector('strong');
  // The first metric is the shared API balance. Do not couple the helper to
  // its translated label: changing the interface language must not remove the
  // balance refresh control.
  if (!box || !label || !amount) return;
  const button = document.createElement('button');
  button.type='button'; button.dataset.atsrsBalanceHelper='true';
  button.title='Check OpenAI balance in the background';
  const icon = document.createElementNS('http://www.w3.org/2000/svg','svg');
  icon.setAttribute('viewBox','0 0 24 24'); icon.setAttribute('width','15'); icon.setAttribute('height','15');
  icon.setAttribute('fill','none'); icon.setAttribute('stroke','currentColor'); icon.setAttribute('stroke-width','1.7');
  icon.setAttribute('stroke-linecap','round'); icon.setAttribute('stroke-linejoin','round'); icon.setAttribute('aria-hidden','true');
  const path = document.createElementNS('http://www.w3.org/2000/svg','path');
  path.setAttribute('d','M20 7v5h-5 M19.3 12a7.5 7.5 0 1 0-1.8 5 M20 12l-2.5-5');
  icon.append(path); button.append(icon);
  button.setAttribute('aria-label','Refresh API balance only');
  button.style.cssText='position:absolute;right:8px;top:8px;display:grid;place-items:center;width:26px;min-width:26px;height:26px;min-height:26px;padding:0;border-radius:50%;border:0;background:transparent;box-shadow:none;color:inherit;cursor:pointer;transition:opacity .15s;';
  box.style.position='relative'; label.style.cssText+=';display:block;padding-right:30px;';
  // The site's global button border uses !important; keep this icon borderless.
  button.style.setProperty('border','0','important');
  button.style.setProperty('background','transparent','important');
  button.style.setProperty('box-shadow','none','important');
  button.style.setProperty('top','4px','important');
  button.style.setProperty('right','4px','important');
  for (const property of ['width','height','min-width','min-height','max-width','max-height']) {
    button.style.setProperty(property,'26px','important');
  }
  button.style.setProperty('padding','0','important');
  const status = document.createElement('small');
  status.setAttribute('role','status'); status.style.cssText='display:block;margin-top:6px;font-size:11px;line-height:1.4;opacity:.75;';
  function showBalance(data) {
    if (!box.isConnected || host.classList.contains('hidden')) return;
    if (data?.currency !== 'USD' || !Number.isFinite(data.amount) || !Number.isFinite(Date.parse(data.checkedAt))) return;
    const isAzerbaijani = /^Ortaq API balansı/i.test(label.textContent);
    label.textContent=isAzerbaijani
      ? 'Ortaq API balansı · son brauzer yoxlaması'
      : 'Shared API balance · last browser check';
    amount.textContent='$'+data.amount.toFixed(2);
    status.textContent='Checked '+new Date(data.checkedAt).toLocaleString('en-GB',{timeZone:'Asia/Baku'})+' (Baku). Saved in this browser; not live.';
  }
  button.addEventListener('click', async event => {
    if (!event.isTrusted || button.disabled) return;
    button.disabled=true; button.style.opacity='.45'; button.setAttribute('aria-busy','true'); status.textContent='Checking OpenAI…';
    try {
      const data = await chrome.runtime.sendMessage({type:'CHECK_BALANCE'});
      // A statistics refresh/logout may have replaced or hidden this owner report.
      if (!box.isConnected || host.classList.contains('hidden')) return;
      if (data?.error) { status.textContent=data.error; return; }
      if (data?.currency !== 'USD' || !Number.isFinite(data.amount) || !Number.isFinite(Date.parse(data.checkedAt))) throw Error();
      showBalance(data);
    } catch { status.textContent='Balance check failed. Previous value retained; reload the page and try again.'; }
    finally { button.disabled=false; button.style.opacity='1'; button.removeAttribute('aria-busy'); }
  });
  box.append(button,status);
  chrome.runtime.sendMessage({type:'GET_LAST_BALANCE'}).then(data => {
    if (!button.disabled) showBalance(data);
  }).catch(() => {});
}
new MutationObserver(attachBalanceButton).observe(document.documentElement,{childList:true,subtree:true});
attachBalanceButton();
