/* ATSRS V353 - protected owner-only operational overview. */
(function () {
  'use strict';

  var panel = null;
  var refreshButton = null;
  var loading = false;
  var loadedUserId = '';

  function byId(id) {
    return document.getElementById(id);
  }

  function money(value) {
    var amount = Number(value);
    if (!Number.isFinite(amount)) return '—';
    return '$' + amount.toFixed(2);
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

    byId('adminRegisteredUsers').textContent = String(row.registered_users ?? 0);
    byId('adminNewUsers').textContent = String(row.new_users_30d ?? 0);
    byId('adminAiCredit').textContent = money(row.estimated_credit_usd);
    byId('adminAiUsageNote').textContent =
      money(row.estimated_spend_usd) + ' estimated spend · ' +
      String(row.tracked_scans ?? 0) + ' scans tracked after setup';
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

    loading = true;
    if (refreshButton) refreshButton.disabled = true;
    try {
      var result = await window.supabaseClient.rpc('atsrs_get_admin_overview');
      if (result.error) throw result.error;
      var row = Array.isArray(result.data) ? result.data[0] : result.data;
      loadedUserId = user.id;
      render(row);
    } catch (error) {
      console.warn('ATSRS admin overview unavailable', error);
      hidePanel();
    } finally {
      loading = false;
      if (refreshButton) refreshButton.disabled = false;
    }
  }

  function init() {
    panel = byId('adminOverviewPanel');
    refreshButton = byId('adminOverviewRefresh');
    if (!panel) return;
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
