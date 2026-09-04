/* One server-authoritative access window per existing account, across devices. */
(function () {
  'use strict';
  function formatRemaining(ms) {
    var seconds = Math.max(0, Math.ceil(ms / 1000));
    return Math.floor(seconds / 86400) + 'd ' + String(Math.floor(seconds / 3600) % 24).padStart(2, '0') + 'h ' + String(Math.floor(seconds / 60) % 60).padStart(2, '0') + 'm ' + String(seconds % 60).padStart(2, '0') + 's';
  }
  function fullAt(state, now) {
    return !!(state && state.full_access && (state.permanent || !state.ends_at || Date.parse(state.ends_at) > now));
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = { formatRemaining: formatRemaining, fullAt: fullAt }; return; }
  var state = null, serverTime = 0, anchoredAt = 0, requestId = 0, userId = '', busy = false, queuedRefresh = false, expired = false;
  var buttonStates = new WeakMap(), hidePermanentBadge = false;
  var hiddenBadgeAccount = '375cfb6770fd5297a9d076c101b7357db0bcd5d9dc4b1c13cca8d5219ff8bf4e';
  function now() { return serverTime + Math.max(0, performance.now() - anchoredAt); }
  function full() { return fullAt(state, now()); }
  function publish() { document.dispatchEvent(new CustomEvent('atsrs:access-changed', { detail: state })); decorate(); tick(); }
  async function refresh() {
    var client = window.supabaseClient;
    if (!client) return state;
    if (busy) { queuedRefresh = true; return state; }
    busy = true;
    var token = ++requestId;
    try {
      var session = await client.auth.getSession();
      var user = session.data && session.data.session && session.data.session.user;
      if (!user) { state = null; userId = ''; publish(); return null; }
      var digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(user.email || '').trim().toLowerCase()));
      hidePermanentBadge = Array.from(new Uint8Array(digest)).map(function(b){return b.toString(16).padStart(2,'0')}).join('') === hiddenBadgeAccount;
      if (userId !== user.id) { state = null; userId = user.id; decorate(); }
      var result = await client.rpc('atsrs_my_access_state');
      if (result.error) throw result.error;
      if (token !== requestId || !result.data || result.data.user_id !== userId) return state;
      state = result.data; serverTime = Date.parse(state.server_now); anchoredAt = performance.now();
      expired = !!(state.ends_at && !state.permanent && Date.parse(state.ends_at) <= serverTime);
      publish(); return state;
    } catch (error) { console.warn('Account access could not be refreshed.', error); return state; }
    finally { busy = false; if (queuedRefresh) { queuedRefresh = false; setTimeout(refresh, 0); } }
  }
  function tick() {
    var bell = document.getElementById('atsrsNotificationButton');
    var badge = document.getElementById('atsrsAccessCountdown');
    if (!state || (state.permanent && hidePermanentBadge)) { if (badge) badge.remove(); return; }
    if (!badge && bell) { badge = document.createElement('span'); badge.id = 'atsrsAccessCountdown'; badge.setAttribute('role', 'timer'); badge.setAttribute('aria-live', 'off'); bell.before(badge); }
    if (badge) {
      var text = state.permanent ? 'Unlimited' : state.ends_at ? formatRemaining(Date.parse(state.ends_at) - now()) : full() ? 'Full access' : 'Free plan';
      if (badge.textContent !== text) badge.textContent = text;
      badge.title = state.ends_at ? 'Full access ends: ' + new Date(state.ends_at).toLocaleString() : text;
      badge.dataset.access = full() ? 'full' : 'free';
    }
    if (!expired && state.ends_at && !state.permanent && now() >= Date.parse(state.ends_at)) {
      expired = true; state.full_access = false; decorate();
      var dialog = document.getElementById('jobDetailDialog'); if (dialog && dialog.open) dialog.close();
      var previewClose = document.getElementById('atsrsFilePreviewClose'); if (previewClose) previewClose.click();
      document.dispatchEvent(new CustomEvent('atsrs:access-changed', { detail: state }));
      refresh();
    }
  }
  function setLock(button, locked) {
    if (!buttonStates.has(button)) buttonStates.set(button, { title: button.getAttribute('title'), href: button.getAttribute('href') });
    var original = buttonStates.get(button), icon = button.querySelector('.atsrs-plan-lock-icon');
    if (locked) {
      button.setAttribute('data-plan-locked', 'true'); button.setAttribute('title', state ? 'Available with Bronze or higher' : 'Checking account access');
      if (button.tagName === 'A') button.removeAttribute('href');
      if (!icon) { icon = document.createElement('i'); icon.className = 'ph ph-lock-simple atsrs-plan-lock-icon'; icon.setAttribute('aria-hidden', 'true'); button.prepend(icon); }
    } else if (button.hasAttribute('data-plan-locked')) {
      button.removeAttribute('data-plan-locked'); if (icon) icon.remove();
      if (original.title === null) button.removeAttribute('title'); else button.title = original.title;
      if (original.href !== null) button.setAttribute('href', original.href);
    }
  }
  function decorate() {
    document.querySelectorAll('#recruitersGrid .employer-actions button,#recruitersGrid .employer-actions a,#employersGrid .employer-actions button,#employersGrid .employer-actions a').forEach(function (button) { setLock(button, !full()); });
    if (!state) return;
    var locked = new Set(state.locked_file_ids || []);
    document.querySelectorAll('[onclick*="atsrsCloudPreview"],[onclick*="atsrsCloudDownload"],[data-access-file-id]').forEach(function (button) {
      var id = button.dataset.accessFileId || ((button.getAttribute('onclick') || '').match(/[0-9a-f]{8}-[0-9a-f-]{27,}/i) || [])[0];
      if (id) setLock(button, locked.has(id));
    });
  }
  async function assertFile(id) {
    var result = await window.supabaseClient.rpc('atsrs_my_file_access', { p_file_id: id });
    if (result.error) throw result.error;
    if (!result.data || !result.data.allowed) throw new Error('This document is safely stored but locked by your plan. Choose Bronze or higher to use it.');
    return result.data;
  }
  async function assertUpload() {
    await refresh();
    if (!state || !state.can_upload) throw new Error('Your plan upload limit has been reached. Existing documents are kept safely.');
  }
  function boot() {
    document.addEventListener('click', function (event) {
      var button = event.target.closest && event.target.closest('[data-plan-locked]');
      if (!button) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (state) window.location.assign('pricing.html');
    }, true);
    var queued = false;
    new MutationObserver(function (records) {
      if (queued || !records.some(function (r) { return Array.from(r.addedNodes).some(function (n) { return n.nodeType === 1 && !n.classList.contains('atsrs-plan-lock-icon') && n.id !== 'atsrsAccessCountdown'; }); })) return;
      queued = true; requestAnimationFrame(function () { queued = false; decorate(); });
    }).observe(document.body, { childList: true, subtree: true });
    if (window.supabaseClient) window.supabaseClient.auth.onAuthStateChange(function (event, session) {
      var id = session && session.user && session.user.id || '';
      if (id !== userId) { requestId++; state = null; userId = id; publish(); }
      setTimeout(refresh, 0);
    });
    refresh(); setInterval(tick, 1000); setInterval(function () { if (!document.hidden) refresh(); }, 60000);
  }
  window.atsrsAccess = { refresh: refresh, full: full, now: now, formatRemaining: formatRemaining, assertFile: assertFile, assertUpload: assertUpload, decorate: decorate, snapshot: function () { return state; } };
  document.addEventListener('atsrs:access-changed', function () { if (window.atsrsJobs) window.atsrsJobs.refresh(); });
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
