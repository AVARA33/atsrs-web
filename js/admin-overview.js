/* ATSRS V375 - protected owner-only operational overview. */
(function () {
  'use strict';

  var panel = null;
  var refreshButton = null;
  var loading = false;
  var loadedUserId = '';

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
    if (panel) panel.classList.add('hidden');
    loadedUserId = '';
  }

  function render(row) {
    if (!row || row.is_admin !== true) {
      hidePanel();
      return;
    }

    setMetricText(
      String(row.registered_users ?? 0),
      String(row.new_users_7d ?? 0),
      String(row.new_users_14d ?? 0),
      String(row.new_users_30d ?? 0),
      'Confirmed registrations only'
    );
    panel.classList.remove('hidden');
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
  }

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('atsrs:resume', function () { refresh(true); });
  window.addEventListener('focus', function () { refresh(false); });
  window.atsrsAdminOverview = { refresh: function () { return refresh(true); } };
})();
