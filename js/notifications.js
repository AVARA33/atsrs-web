/* ATSRS V241 — email-ready expiry notifications; WhatsApp marked coming soon. */
(function(){
  'use strict';
  var BUILD='ATSRS V328';
  var UPDATE='Last Update: 24 Jul 2026';
  var client=null;
  var user=null;
  var loading=false;

  function byId(id){return document.getElementById(id);}
  function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function mode(){
    var value='';
    try{value=localStorage.getItem('atsrs_use_mode')||localStorage.getItem('atsrs_account_type')||'';}catch(e){}
    value=String(value).toLowerCase();
    return value==='company'||value==='corporate'?'company':'personal';
  }
  function setBuild(){
    var badge=byId('buildBadge');
    if(!badge)return;
    var lines=badge.querySelectorAll('div');
    if(lines[0]&&lines[0].textContent!==BUILD)lines[0].textContent=BUILD;
    if(lines[1]&&lines[1].textContent!==UPDATE)lines[1].textContent=UPDATE;
  }
  function setStatus(text,kind){
    var el=byId('atsrsNotificationStatus');
    if(!el)return;
    el.textContent=text||'';
    el.className='atsrs-notification-status'+(kind?' is-'+kind:'');
  }
  async function resolveUser(){
    client=window.supabaseClient||client;
    if(!client||!client.auth)return null;
    if(window.currentUser&&window.currentUser.id){user=window.currentUser;return user;}
    try{
      var result=await client.auth.getUser();
      user=result&&result.data&&result.data.user||null;
      return user;
    }catch(e){return null;}
  }

  function ensureDashboardPanel(){
    if(byId('atsrsNotificationPanel'))return;
    var risk=byId('riskList');
    var anchor=risk&&risk.closest('.panel');
    if(!anchor)return;
    var panel=document.createElement('div');
    panel.id='atsrsNotificationPanel';
    panel.className='panel atsrs-notification-panel';
    panel.innerHTML='<div class="atsrs-notification-head"><div><h3>Expiry notifications</h3><p class="sub">Server reminders for documents approaching expiry.</p></div><div class="atsrs-notification-actions"><span id="atsrsNotificationCount" class="atsrs-notification-count is-empty">0</span><button id="atsrsMarkAllRead" type="button" class="secondary">Mark all read</button><button id="atsrsClearNotifications" type="button" class="secondary">Clear all</button></div></div><div id="atsrsNotificationList" class="atsrs-notification-list"><div class="atsrs-notification-empty">Loading notifications...</div></div>';
    anchor.insertAdjacentElement('afterend',panel);
    byId('atsrsMarkAllRead').addEventListener('click',markAllRead);
    byId('atsrsClearNotifications').addEventListener('click',dismissAllNotifications);
  }

  function ensureSettingsPanel(){
    if(byId('atsrsNotificationSettings'))return;
    var manage=byId('manageNotifyBtn');
    if(!manage)return;
    manage.removeAttribute('onclick');
    manage.textContent='Manage';
    manage.onclick=function(){
      var panel=byId('atsrsNotificationSettings');
      panel.classList.toggle('hidden');
      if(!panel.classList.contains('hidden'))loadPreferences();
    };
    var row=manage.closest('.setting-row');
    var panel=document.createElement('div');
    panel.id='atsrsNotificationSettings';
    panel.className='atsrs-notification-settings hidden';
    panel.innerHTML='<h4>Expiry reminder settings</h4><p>ATSRS checks document expiry dates on the server every day.</p><div class="atsrs-notification-field"><div><label for="atsrsEmailEnabled">Email reminders</label><small>90 days, 30 days and expiry day. Delivery is prepared on the ATSRS server.</small></div><input id="atsrsEmailEnabled" type="checkbox" checked></div><div class="atsrs-notification-field"><div><label for="atsrsWhatsappEnabled">WhatsApp reminders</label><small>Coming soon.</small></div><input id="atsrsWhatsappEnabled" type="checkbox" aria-label="WhatsApp reminders coming soon"></div><div class="atsrs-notification-field"><div><label for="atsrsWhatsappPhone">WhatsApp number</label><small>WhatsApp delivery will be connected in a future update.</small></div><input id="atsrsWhatsappPhone" type="tel" inputmode="tel" placeholder="+994501234567" disabled></div><div class="atsrs-notification-field"><div><label for="atsrsNotificationTimezone">Timezone</label><small>Used by the daily server schedule.</small></div><select id="atsrsNotificationTimezone"><option value="Asia/Baku">Asia/Baku</option><option value="UTC">UTC</option><option value="Europe/London">Europe/London</option><option value="Europe/Oslo">Europe/Oslo</option><option value="Europe/Sofia">Europe/Sofia</option></select></div><div class="atsrs-notification-savebar"><button id="atsrsSaveNotifications" type="button">Save notification settings</button><span id="atsrsNotificationStatus" class="atsrs-notification-status"></span></div>';
    row.insertAdjacentElement('afterend',panel);
    byId('atsrsSaveNotifications').addEventListener('click',savePreferences);
    byId('atsrsWhatsappEnabled').addEventListener('click',showWhatsappComingSoon);
  }

  function showWhatsappComingSoon(event){
    if(event)event.preventDefault();
    var enabled=byId('atsrsWhatsappEnabled');
    if(enabled)enabled.checked=false;
    alert('WhatsApp notifications will be connected soon.');
    syncPhoneState();
  }

  function syncPhoneState(){
    var phone=byId('atsrsWhatsappPhone');
    if(phone){phone.disabled=true;phone.value='';}
  }

  function ensureUi(){
    ensureDashboardPanel();
    ensureSettingsPanel();
    var timezone=byId('profileTimezone');
    if(timezone){
      var old=timezone.querySelector('option[value="Europe/Baku"]');
      if(old){old.value='Asia/Baku';old.textContent='Asia/Baku';}
    }
    setBuild();
  }

  async function loadPreferences(){
    if(!await resolveUser()){setStatus('Sign in to manage notifications.','error');return;}
    setStatus('Loading...');
    var result=await client.from('atsrs_notification_preferences').select('email_enabled,whatsapp_enabled,whatsapp_phone_e164,timezone').eq('user_id',user.id).eq('account_type',mode()).maybeSingle();
    if(result.error){setStatus('Settings could not be loaded.','error');return;}
    var data=result.data||{email_enabled:true,timezone:'Asia/Baku'};
    byId('atsrsEmailEnabled').checked=data.email_enabled!==false;
    byId('atsrsWhatsappEnabled').checked=false;
    byId('atsrsWhatsappPhone').value='';
    byId('atsrsNotificationTimezone').value=data.timezone||'Asia/Baku';
    syncPhoneState();
    setStatus('Settings are stored on the ATSRS server.','ok');
  }

  async function savePreferences(){
    if(!await resolveUser()){setStatus('Sign in to save notifications.','error');return;}
    var email=byId('atsrsEmailEnabled').checked;
    var timezone=byId('atsrsNotificationTimezone').value||'Asia/Baku';
    var button=byId('atsrsSaveNotifications');
    button.disabled=true;setStatus('Saving to server...');
    var result=await client.from('atsrs_notification_preferences').upsert({user_id:user.id,account_type:mode(),email_enabled:email,whatsapp_enabled:false,whatsapp_phone_e164:null,timezone:timezone,updated_at:new Date().toISOString()},{onConflict:'user_id,account_type'});
    button.disabled=false;
    if(result.error){console.error('ATSRS notification preference save failed',result.error);setStatus('Settings could not be saved. Try again.','error');return;}
    setStatus('Reminder preferences saved on the ATSRS server.','ok');
  }

  function notificationMarkup(item){
    var unread=!item.read_at;
    var created=item.created_at?new Date(item.created_at).toLocaleString():'';
    return '<article class="atsrs-notification-item'+(unread?' is-unread':'')+'" data-severity="'+esc(item.severity||'notice')+'"><span class="atsrs-notification-dot"></span><div class="atsrs-notification-copy"><b>'+esc(item.title||'Document reminder')+'</b><p>'+esc(item.body||'')+'</p><time>'+esc(created)+'</time></div><div class="atsrs-notification-item-actions">'+(unread?'<button type="button" class="secondary" data-notification-read="'+esc(item.id)+'">Mark read</button>':'')+'<button type="button" class="atsrs-notification-dismiss" data-notification-dismiss="'+esc(item.id)+'" aria-label="Remove notification" title="Remove">&times;</button></div></article>';
  }

  async function loadNotifications(){
    if(loading)return;
    ensureUi();
    var list=byId('atsrsNotificationList');
    if(!list)return;
    if(!await resolveUser()){list.innerHTML='<div class="atsrs-notification-empty">Sign in to see notifications.</div>';return;}
    loading=true;
    var result=await client.from('atsrs_notifications').select('id,title,body,severity,read_at,created_at,expiry_date,days_remaining').eq('user_id',user.id).eq('account_type',mode()).order('created_at',{ascending:false}).limit(20);
    loading=false;
    if(result.error){console.error('ATSRS notifications load failed',result.error);list.innerHTML='<div class="atsrs-notification-empty atsrs-notification-error">Notifications could not be loaded from the server.</div>';return;}
    var rows=result.data||[];
    var unread=rows.filter(function(row){return !row.read_at;}).length;
    var count=byId('atsrsNotificationCount');
    count.textContent=String(unread);count.classList.toggle('is-empty',unread===0);
    var all=byId('atsrsMarkAllRead');if(all)all.disabled=unread===0;
    var clear=byId('atsrsClearNotifications');if(clear)clear.disabled=rows.length===0;
    list.innerHTML=rows.length?rows.map(notificationMarkup).join(''):'<div class="atsrs-notification-empty">No expiry notifications yet.</div>';
    list.querySelectorAll('[data-notification-read]').forEach(function(button){button.addEventListener('click',function(){markRead(button.getAttribute('data-notification-read'));});});
    list.querySelectorAll('[data-notification-dismiss]').forEach(function(button){button.addEventListener('click',function(){dismissNotification(button.getAttribute('data-notification-dismiss'),button);});});
  }

  async function markRead(id){
    if(!id||!await resolveUser())return;
    var result=await client.from('atsrs_notifications').update({read_at:new Date().toISOString()}).eq('id',id).eq('user_id',user.id);
    if(!result.error)loadNotifications();
  }
  async function markAllRead(){
    if(!await resolveUser())return;
    var result=await client.from('atsrs_notifications').update({read_at:new Date().toISOString()}).eq('user_id',user.id).eq('account_type',mode()).is('read_at',null);
    if(!result.error)loadNotifications();
  }
  async function dismissNotification(id,button){
    if(!id||!await resolveUser())return;
    if(button)button.disabled=true;
    var result=await client.from('atsrs_notifications').delete().eq('id',id).eq('user_id',user.id).eq('account_type',mode());
    if(result.error){console.error('ATSRS notification removal failed',result.error);if(button)button.disabled=false;return;}
    loadNotifications();
  }
  async function dismissAllNotifications(){
    if(!await resolveUser())return;
    if(!window.confirm('Remove all expiry notifications from this list?'))return;
    var button=byId('atsrsClearNotifications');if(button)button.disabled=true;
    var result=await client.from('atsrs_notifications').delete().eq('user_id',user.id).eq('account_type',mode());
    if(result.error){console.error('ATSRS notifications clear failed',result.error);if(button)button.disabled=false;return;}
    loadNotifications();
  }

  function refresh(){ensureUi();setBuild();loadNotifications();}
  function boot(){
    ensureUi();
    setBuild();
    window.addEventListener('atsrs:resume',refresh);
    var oldShow=window.showPage;
    if(typeof oldShow==='function'&&!oldShow.__atsrsNotifications){
      window.showPage=function(){var value=oldShow.apply(this,arguments);setTimeout(refresh,80);return value;};
      window.showPage.__atsrsNotifications=true;
    }
    setTimeout(refresh,250);
    setTimeout(refresh,1000);
  }
  window.atsrsRefreshNotifications=refresh;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('load',function(){setTimeout(refresh,100);});
})();
