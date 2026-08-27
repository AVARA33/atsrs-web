/* ATSRS V375 - protected owner-only operational overview. */
(function () {
  'use strict';

  var panel = null;
  var refreshButton = null;
  var loading = false;
  var loadedUserId = '';
  var developerNav = null;
  var registrationsPanel = null;
  var developerRouteRestored = false;
  window.__atsrsDeveloperAccess = false;
  window.__atsrsDeveloperAccessUserId = '';

  function byId(id) {
    return document.getElementById(id);
  }

  function setMetricText(registeredUsers, newUsers7d, newUsers14d, newUsers30d, note) {
    byId('adminRegisteredUsers').textContent = registeredUsers;
    byId('adminNewUsers7d').textContent = newUsers7d;
    byId('adminNewUsers14d').textContent = newUsers14d;
    byId('adminNewUsers30d').textContent = newUsers30d;
    byId('adminAiUsageNote').textContent = note;
  }

  function setBusy(isBusy) {
    if (panel) panel.setAttribute('aria-busy', isBusy ? 'true' : 'false');
    if (refreshButton) refreshButton.disabled = isBusy;
  }

  function showLoading() {
    setMetricText('—', '—', '—', '—', 'Secure registration metrics are loading…');
    setBusy(true);
  }

  function showRefreshError() {
    setMetricText('—', '—', '—', '—', 'Registration metrics could not be refreshed. Try again.');
    if (panel) panel.classList.remove('hidden');
  }

  function hidePanel() {
    window.__atsrsDeveloperAccess = false;
    window.__atsrsDeveloperAccessUserId = '';
    if (panel) panel.classList.add('hidden');
    if (registrationsPanel) registrationsPanel.classList.add('hidden');
    if (developerNav) developerNav.classList.add('hidden');
    loadedUserId = '';
    developerRouteRestored = false;
    window.__atsrsRequestedDeveloperRoute = false;
    var developerPage = byId('developerPage');
    var requestedDeveloper = false;
    try { requestedDeveloper = new URLSearchParams(window.location.search).get('route') === 'developer'; }
    catch (ignore) {}
    if ((requestedDeveloper || (developerPage && !developerPage.classList.contains('hidden'))) &&
        typeof window.showPage === 'function') {
      var dashboardNav = byId('navDashboard');
      if (dashboardNav) window.showPage('dashboard', dashboardNav);
    }
  }

  function formatDate(value) {
    if (!value) return '—';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  }

  function accessCopy(row) {
    if (!row.workspace_ready) return { label: 'Setup incomplete', time: 'Not started', tone: 'incomplete' };
    if (row.access_status === 'trial') {
      var days = Math.max(0, Number(row.days_remaining) || 0);
      return { label: 'Full access', time: days + (days === 1 ? ' day left' : ' days left'), tone: 'trial' };
    }
    if (row.access_status === 'expired') return { label: 'Free', time: '0 days left', tone: 'expired' };
    if (row.access_status === 'full') return { label: 'Full access', time: 'Existing account', tone: 'full' };
    return { label: 'Free', time: 'No active window', tone: 'free' };
  }

  function renderRegistrations(rows) {
    var host = byId('developerRegistrationRows');
    var count = byId('developerRegistrationCount');
    if (!host || !registrationsPanel) return;
    var items = Array.isArray(rows) ? rows : [];
    host.innerHTML = '';
    items.forEach(function (row) {
      var access = accessCopy(row || {});
      var item = document.createElement('div');
      item.className = 'developer-registration-row';
      item.setAttribute('role', 'row');
      var email = document.createElement('strong');
      email.setAttribute('role', 'cell');
      email.textContent = row.email || 'Unknown email';
      var registered = document.createElement('span');
      registered.setAttribute('role', 'cell');
      registered.textContent = formatDate(row.registered_at);
      var status = document.createElement('span');
      status.setAttribute('role', 'cell');
      status.className = 'developer-access-status ' + access.tone;
      status.textContent = access.label;
      var remaining = document.createElement('span');
      remaining.setAttribute('role', 'cell');
      remaining.className = 'developer-time-remaining ' + access.tone;
      remaining.textContent = access.time;
      item.append(email, registered, status, remaining);
      host.appendChild(item);
    });
    if (!items.length) {
      var empty = document.createElement('p');
      empty.className = 'developer-registration-empty';
      empty.textContent = 'No registrations found.';
      host.appendChild(empty);
    }
    if (count) count.textContent = items.length + (items.length === 1 ? ' account' : ' accounts');
    registrationsPanel.classList.remove('hidden');
  }

  function render(row) {
    if (!row || row.is_admin !== true) {
      hidePanel();
      return;
    }

    window.__atsrsDeveloperAccess = true;
    window.__atsrsDeveloperAccessUserId = loadedUserId;
    setMetricText(
      String(row.registered_users ?? 0),
      String(row.new_users_7d ?? 0),
      String(row.new_users_14d ?? 0),
      String(row.new_users_30d ?? 0),
      'Confirmed registrations only'
    );
    panel.classList.remove('hidden');
    if (developerNav) developerNav.classList.remove('hidden');
    if (!developerRouteRestored &&
        (window.__atsrsRequestedDeveloperRoute === true ||
         new URLSearchParams(window.location.search).get('route') === 'developer')) {
      developerRouteRestored = true;
      window.__atsrsRequestedDeveloperRoute = false;
      if (typeof window.showPage === 'function' && developerNav) window.showPage('developer', developerNav);
    }
  }

  async function refresh(force) {
    if (loading || !window.supabaseClient || !window.supabaseClient.auth) return;
    panel = panel || byId('adminOverviewPanel');
    if (!panel) return;

    var sessionResult = await window.supabaseClient.auth.getSession();
    var user = sessionResult && sessionResult.data && sessionResult.data.session
      ? sessionResult.data.session.user
      : null;
    if (!user) {
      hidePanel();
      return;
    }
    if (!force && loadedUserId === user.id && !panel.classList.contains('hidden')) return;

    var wasVisible = !panel.classList.contains('hidden');
    loading = true;
    if (wasVisible) showLoading();
    else setBusy(true);
    try {
      var result = await window.supabaseClient.rpc('atsrs_get_registration_overview');
      if (result.error) throw result.error;
      var row = Array.isArray(result.data) ? result.data[0] : result.data;
      loadedUserId = user.id;
      render(row);
      if (row && row.is_admin === true) {
        var detailResult = await window.supabaseClient.rpc('atsrs_get_developer_registrations');
        if (detailResult.error) throw detailResult.error;
        renderRegistrations(detailResult.data);
      }
    } catch (error) {
      console.warn('ATSRS admin overview unavailable', error);
      if (wasVisible || loadedUserId === user.id) showRefreshError();
      else hidePanel();
    } finally {
      loading = false;
      setBusy(false);
    }
  }

  function init() {
    panel = byId('adminOverviewPanel');
    refreshButton = byId('adminOverviewRefresh');
    developerNav = byId('navDeveloper');
    registrationsPanel = byId('developerRegistrationsPanel');
    if (!panel) return;
    var usageNote = byId('adminAiUsageNote');
    if (usageNote) {
      usageNote.setAttribute('role', 'status');
      usageNote.setAttribute('aria-live', 'polite');
    }
    if (refreshButton) refreshButton.addEventListener('click', function () {
      refresh(true);
    });
    refresh(false);
    setTimeout(function () { refresh(false); }, 700);
    setTimeout(function () { refresh(false); }, 1800);
    if (window.supabaseClient && window.supabaseClient.auth &&
        typeof window.supabaseClient.auth.onAuthStateChange === 'function') {
      window.supabaseClient.auth.onAuthStateChange(function (_event, session) {
        var nextUserId = session && session.user ? String(session.user.id || '') : '';
        if (!nextUserId || nextUserId !== window.__atsrsDeveloperAccessUserId) {
          hidePanel();
          setTimeout(function () { refresh(true); }, 0);
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('atsrs:resume', function () { refresh(true); });
  window.addEventListener('focus', function () { refresh(false); });
  window.atsrsAdminOverview = { refresh: function () { return refresh(true); } };
})();
