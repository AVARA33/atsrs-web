(function () {
  'use strict';

  function isPublicShare() {
    var params = new URLSearchParams(window.location.search || '');
    return document.documentElement.classList.contains('atsrs-public-share-mode') || params.has('share');
  }

  if (!isPublicShare()) return;

  document.documentElement.classList.add('atsrs-public-share-mode');

  var toastTimer = 0;
  var captureTimer = 0;

  function message() {
    var language = String(document.documentElement.lang || navigator.language || 'en').toLowerCase();
    return language.indexOf('az') === 0
      ? 'Bu paylaşım yalnız baxış üçündür. Kopyalama və yadda saxlama deaktiv edilib.'
      : 'This share is view-only. Copying and saving are disabled.';
  }

  function showNotice() {
    var toast = document.getElementById('atsrsShareProtectionToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'atsrsShareProtectionToast';
      toast.className = 'atsrs-share-protection-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = message();
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove('is-visible');
    }, 2400);
  }

  function isEditable(target) {
    return target instanceof Element && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
  }

  function block(event) {
    if (isEditable(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    showNotice();
  }

  function obscureCaptureAttempt() {
    document.documentElement.classList.add('atsrs-capture-blocked');
    window.clearTimeout(captureTimer);
    captureTimer = window.setTimeout(function () {
      document.documentElement.classList.remove('atsrs-capture-blocked');
    }, 900);
    showNotice();
  }

  document.addEventListener('contextmenu', block, true);
  document.addEventListener('copy', block, true);
  document.addEventListener('cut', block, true);
  document.addEventListener('dragstart', block, true);
  document.addEventListener('selectstart', block, true);

  document.addEventListener('keydown', function (event) {
    var key = String(event.key || '').toLowerCase();
    if (key === 'printscreen') {
      event.preventDefault();
      obscureCaptureAttempt();
      return;
    }
    if (!(event.ctrlKey || event.metaKey) || isEditable(event.target)) return;
    if (key === 's' || key === 'p' || key === 'c' || key === 'x' || key === 'a') block(event);
  }, true);

  window.addEventListener('beforeprint', function (event) {
    event.preventDefault();
    showNotice();
  });

  function hardenPreviewAssets(root) {
    var scope = root || document;
    var assets = [];
    if (scope.matches && scope.matches('#atsrsFilePreviewModal img, #atsrsFilePreviewModal canvas')) assets.push(scope);
    if (scope.querySelectorAll) assets = assets.concat(Array.from(scope.querySelectorAll('#atsrsFilePreviewModal img, #atsrsFilePreviewModal canvas')));
    assets.forEach(function (asset) {
      asset.draggable = false;
      asset.setAttribute('draggable', 'false');
    });
  }

  function start() {
    hardenPreviewAssets(document);
    var modal = document.getElementById('atsrsFilePreviewModal');
    if (modal && window.MutationObserver) {
      new MutationObserver(function (records) {
        records.forEach(function (record) {
          record.addedNodes.forEach(function (node) {
            if (node.nodeType === 1) hardenPreviewAssets(node);
          });
        });
      }).observe(modal, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
