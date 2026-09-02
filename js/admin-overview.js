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
  var developerRouteObserver = null;
  var developerRouteSyncQueued = false;
  var accessServerTime = 0;
  var accessAnchoredAt = 0;
  window.__atsrsDeveloperAccess = false;
  window.__atsrsDeveloperAccessUserId = '';

  function byId(id) {
    return document.getElementById(id);
  }

  function setMetricText(registeredUsers, newUsersToday, newUsers7d, newUsers14d, newUsers30d, note) {
    byId('adminRegisteredUsers').textContent = registeredUsers;
    byId('adminNewUsersToday').textContent = newUsersToday;
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
    setMetricText('—', '—', '—', '—', '—', 'Secure registration metrics are loading…');
    setBusy(true);
  }

  function showRefreshError() {
    setMetricText('—', '—', '—', '—', '—', 'Registration metrics could not be refreshed. Try again.');
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
    if (row.access) {
      var a = row.access;
      return { label: a.full_access ? 'Full access' : 'Free', time: a.permanent ? 'Unlimited' : a.ends_at ? '' : a.full_access ? 'Paid plan' : '0d 00h 00m 00s', tone: a.full_access ? 'full' : 'free' };
    }
    if (!row.workspace_ready) return { label: 'Setup incomplete', time: 'Not started', tone: 'incomplete' };
    if (row.access_status === 'trial') {
      var days = Math.max(0, Number(row.days_remaining) || 0);
      return { label: 'Full access', time: days + (days === 1 ? ' day left' : ' days left'), tone: 'trial' };
    }
    if (row.access_status === 'expired') return { label: 'Free', time: '0 days left', tone: 'expired' };
    if (row.access_status === 'full') return { label: 'Full access', time: 'Existing account', tone: 'full' };
    return { label: 'Free', time: 'No active window', tone: 'free' };
  }

  function stabilizeAuthorizedDeveloperRoute() {
    if (window.__atsrsDeveloperAccess !== true) return;
    var requested = false;
    try { requested = new URLSearchParams(window.location.search).get('route') === 'developer'; }
    catch (ignore) {}
    if (!requested) return;
    var developerPage = byId('developerPage');
    if (!developerPage || !developerNav) return;
    document.querySelectorAll('main > section').forEach(function (section) {
      section.classList.toggle('hidden', section !== developerPage);
    });
    document.querySelectorAll('.nav button').forEach(function (button) {
      button.classList.toggle('active', button === developerNav);
    });
    developerPage.classList.remove('hidden');
    developerNav.classList.remove('hidden');
    try { window.localStorage.setItem('atsrs_current_page', 'developer'); }
    catch (ignore) {}
    var title = byId('pageTitle');
    if (title) title.textContent = 'Developer';
  }

  function queueAuthorizedDeveloperRouteSync() {
    if (developerRouteSyncQueued) return;
    developerRouteSyncQueued = true;
    setTimeout(function () {
      developerRouteSyncQueued = false;
      stabilizeAuthorizedDeveloperRoute();
    }, 0);
  }

  function observeAuthorizedDeveloperRoute() {
    if (developerRouteObserver || typeof MutationObserver !== 'function') return;
    var main = document.querySelector('main.main');
    if (!main) return;
    developerRouteObserver = new MutationObserver(queueAuthorizedDeveloperRouteSync);
    developerRouteObserver.observe(main, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  }

  function openAuthorizedDeveloperRoute() {
    if (typeof window.showPage === 'function' && developerNav) {
      window.showPage('developer', developerNav);
    }
    stabilizeAuthorizedDeveloperRoute();
    setTimeout(stabilizeAuthorizedDeveloperRoute, 120);
    setTimeout(stabilizeAuthorizedDeveloperRoute, 400);
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
      var documents = document.createElement('span');
      documents.setAttribute('role', 'cell');
      documents.className = 'developer-document-count';
      documents.title = 'Documents register only. CVs: ' + (Number(row.cv_count) || 0) + '. Total stored files: ' + (Number(row.uploaded_file_count) || 0) + '. Locked documents are included.';
      documents.textContent = row.document_count != null && Number.isFinite(Number(row.document_count))
        ? String(Math.max(0, Math.floor(Number(row.document_count)))) : '—';
      documents.setAttribute('aria-label', 'Uploaded documents: ' + documents.textContent);
      var status = document.createElement('span');
      status.setAttribute('role', 'cell');
      status.className = 'developer-access-status ' + access.tone;
      status.textContent = access.label;
      var remaining = document.createElement('span');
      remaining.setAttribute('role', 'cell');
      remaining.className = 'developer-time-remaining ' + access.tone;
      remaining.textContent = access.time;
      if (row.access && row.access.ends_at && !row.access.permanent) {
        remaining.dataset.endsAt = row.access.ends_at;
        remaining.dataset.countdown = 'true';
        var dates = document.createElement('small');
        dates.className = 'developer-access-dates';
        dates.textContent = 'Start: ' + new Date(row.access.started_at).toLocaleString() + ' · End: ' + new Date(row.access.ends_at).toLocaleString();
        status.appendChild(dates);
      }
      item.append(email, registered, documents, status, remaining);
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
    tickAccessWindows();
  }

  function tickAccessWindows() {
    if (!window.atsrsAccess || !accessServerTime) return;
    var now = accessServerTime + Math.max(0, performance.now() - accessAnchoredAt);
    document.querySelectorAll('#developerRegistrationRows [data-countdown]').forEach(function (node) {
      var left = Date.parse(node.dataset.endsAt) - now;
      node.textContent = window.atsrsAccess.formatRemaining(left);
      if (left <= 0) {
        node.classList.remove('full'); node.classList.add('free');
        var status = node.previousElementSibling;
        if (status && status.firstChild && status.firstChild.nodeType === 3) status.firstChild.textContent = 'Free';
      }
    });
  }

  function render(row) {
    if (!row || row.is_admin !== true) {
      hidePanel();
      return;
    }

    window.__atsrsDeveloperAccess = true;
    window.__atsrsDeveloperAccessUserId = loadedUserId;
    observeAuthorizedDeveloperRoute();
    setMetricText(
      String(row.registered_users ?? 0),
      String(row.new_users_today ?? 0),
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
      openAuthorizedDeveloperRoute();
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
        var detailResult = await window.supabaseClient.rpc('atsrs_get_developer_access_windows');
        if (detailResult.error) throw detailResult.error;
        accessServerTime = Date.parse(detailResult.data.server_now);
        accessAnchoredAt = performance.now();
        renderRegistrations(detailResult.data.rows);
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
    setInterval(tickAccessWindows, 1000);
    setInterval(function () { if (!document.hidden && window.__atsrsDeveloperAccess) refresh(true); }, 60000);
    setTimeout(function () { refresh(false); }, 700);
    setTimeout(function () { refresh(false); }, 1800);
    if (window.supabaseClient && window.supabaseClient.auth &&
        typeof window.supabaseClient.auth.onAuthStateChange === 'function') {
      window.supabaseClient.auth.onAuthStateChange(function (_event, session) {
        var nextUserId = session && session.user ? String(session.user.id || '') : '';
        var authorizedUserId = window.__atsrsDeveloperAccessUserId;
        if (!nextUserId || (authorizedUserId && nextUserId !== authorizedUserId)) {
          hidePanel();
        }
        setTimeout(function () { refresh(true); }, 0);
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('atsrs:resume', function () { refresh(true); });
  window.addEventListener('focus', function () { refresh(false); });
  window.atsrsAdminOverview = { refresh: function () { return refresh(true); } };
})();
