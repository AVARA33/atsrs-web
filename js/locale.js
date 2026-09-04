/* Phase 1: public homepage and authentication presentation only. */
(() => {
  'use strict';
  const messages = window.ATSRS_AZ_MESSAGES || {};
  const key = 'atsrs_locale';
  let locale = 'az';
  try { if (localStorage.getItem(key) === 'en') locale = 'en'; } catch (_) {}
  const scopes = ['landingPage', 'auth'].map(id => document.getElementById(id)).filter(Boolean);
  const records = new WeakMap();
  const skip = 'script,style,textarea,input,[contenteditable],.atsrs-locale-control,.google-word';
  const attributes = ['title', 'aria-label', 'placeholder', 'alt'];
  const normalize = value => value.replace(/\s+/g, ' ').trim();
  function translated(source) {
    const normalized = normalize(source);
    let result = Object.prototype.hasOwnProperty.call(messages, normalized) ? messages[normalized] : undefined;
    const video = normalized.match(/^Watch video · ([\d:]+) · English audio$/);
    if (video) result = `Videoya bax · ${video[1]} · İngilis dilində səsləndirmə`;
    return result === undefined ? source : source.replace(/\S[\s\S]*\S|\S/, result);
  }
  function update(node, field, read, write) {
    const value = read();
    if (!value) return;
    let fields = records.get(node);
    if (!fields) { fields = {}; records.set(node, fields); }
    let record = fields[field];
    if (!record || (value !== record.source && value !== record.last)) record = fields[field] = { source: value };
    const next = locale === 'az' ? translated(record.source) : record.source;
    record.last = next;
    if (value !== next) write(next);
  }
  function render(scope) {
    scope.lang = locale;
    for (const attribute of attributes) update(scope, attribute, () => scope.getAttribute(attribute), value => scope.setAttribute(attribute, value));
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
      if (!element || element.closest(skip)) continue;
      if (node.nodeType === Node.TEXT_NODE) {
        update(node, 'text', () => node.nodeValue, value => { node.nodeValue = value; });
      } else {
        for (const attribute of attributes) update(node, attribute, () => node.getAttribute(attribute), value => node.setAttribute(attribute, value));
      }
    }
    // Inputs are excluded from text traversal, but their hints are translatable.
    scope.querySelectorAll('input[placeholder]').forEach(input => update(input, 'placeholder', () => input.getAttribute('placeholder'), value => input.setAttribute('placeholder', value)));
    scope.querySelectorAll('.auth-tab-caption').forEach(caption => {
      caption.style.display = 'flex';
      caption.style.justifyContent = 'center';
      caption.style.gap = '0.3em';
      caption.style.flexDirection = locale === 'az' ? 'row-reverse' : 'row';
    });
  }
  let scheduled = false;
  const dirty = new Set();
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      const scope = scopes.find(root => root.contains(mutation.target));
      if (scope) dirty.add(scope);
    }
    if (scheduled || !dirty.size) return;
    scheduled = true;
    queueMicrotask(() => { scheduled = false; apply(Array.from(dirty)); });
  });
  function observe() {
    scopes.forEach(scope => observer.observe(scope, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: attributes }));
  }
  function apply(roots = scopes) {
    observer.disconnect();
    dirty.clear();
    roots.forEach(render);
    document.querySelectorAll('.atsrs-locale-control button').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.locale === locale));
    });
    observe();
  }
  function setLocale(value) {
    if (!['az', 'en'].includes(value)) return;
    locale = value;
    try { localStorage.setItem(key, locale); } catch (_) {}
    apply();
  }
  function mount(host) {
    if (!host) return;
    const control = document.createElement('div');
    control.className = 'atsrs-locale-control';
    control.setAttribute('role', 'group');
    control.setAttribute('aria-label', 'Dil / Language');
    for (const [code, label] of [['az', 'AZ'], ['en', 'EN']]) {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = label; button.lang = code;
      button.dataset.locale = code;
      button.setAttribute('aria-label', code === 'az' ? 'Azərbaycan dili' : 'English');
      button.addEventListener('click', () => setLocale(code));
      control.append(button);
    }
    host.prepend(control);
  }
  mount(document.querySelector('.public-header-actions'));
  mount(document.querySelector('#auth .auth-card'));
  window.atsrsI18n = Object.freeze({ getLocale: () => locale });
  window.addEventListener('storage', event => { if (event.key === key) setLocale(event.newValue === 'en' ? 'en' : 'az'); });
  apply();
})();
