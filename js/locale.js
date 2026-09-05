/* Scoped Azerbaijani interface presentation; stored user content stays unchanged. */
(() => {
  'use strict';
  const messages = window.ATSRS_AZ_MESSAGES || {};
  const key = 'atsrs_locale';
  let locale = 'az';
  try { if (localStorage.getItem(key) === 'en') locale = 'en'; } catch (_) {}
  const scopes = ['landingPage', 'auth', 'jobsPage', 'resourcePage', 'dashboardPage', 'recruitersPage', 'employersPage', 'certificatesPage', 'refsPage', 'profilePage', 'workspaceSwitcher', 'qrUploadDialog', 'atsrsFilePreviewModal', 'cvGeneratorModal', 'recipientLinkModal', 'shareRequestModal'].map(id => document.getElementById(id)).filter(Boolean);
  const pricingShell = document.querySelector('.pricing-shell');
  if (pricingShell) scopes.push(pricingShell);
  const sidebar = document.querySelector('#app .sidebar');
  if (sidebar) scopes.push(sidebar);
  const globalControls = document.getElementById('atsrsGlobalControls');
  if (globalControls) scopes.push(globalControls);
  const records = new WeakMap();
  const skip = '#profileSummaryName,#profileSummaryRole,#profileSummaryEmail,#profileSummaryPhone,#profileSummaryLocation,#profileSummaryWorkplace,#profilePersonalReadView strong,#profileSharingDocumentChoices,#profileSharingActiveList,#refsPage .atsrs-v134-row b,#refsPage .atsrs-v156-main-name b,#certTable .atsrs-document-name,#certTable td[data-label="Provider"],#certTable td[data-label="Verən qurum"],#documentPreview,#recruitersVisibleCount,#jobsVisibleCount,#employersPageCount,script,style,textarea,input,[contenteditable],.atsrs-locale-control,.google-word,#jobsGrid,#jobsPage select,.dashboard-document-timeline-copy,.dashboard-recent-copy,#recruitersPage .employer-card-copy h4,#recruitersPage .employer-card-copy p,#recruitersPage .employer-mark,#employersPage .employer-card-copy h4,#employersPage .employer-mark';
  const attributes = ['title', 'aria-label', 'placeholder', 'alt', 'data-label'];
  const normalize = value => value.replace(/\s+/g, ' ').trim();
  function translated(source) {
    const normalized = normalize(source);
    let result = Object.prototype.hasOwnProperty.call(messages, normalized) ? messages[normalized] : undefined;
    const count = normalized.match(/^(\d+) of (\d+) opportunit(?:y|ies)$/);
    if (count) result = `${count[1]} / ${count[2]} vakansiya`;
    if (normalized.startsWith('All jobs · ')) result = normalized.split(' · ').map(part => messages[part] || part).join(' · ');
    const page = normalized.match(/^Go to page (\d+)$/);
    if (page) result = `${page[1]}-ci səhifəyə keç`;
    const companyCount = normalized.match(/^(\d+) of (\d+) companies$/);
    if (companyCount) result = `${companyCount[1]} / ${companyCount[2]} şirkət`;
    const verifiedCount = normalized.match(/^(\d+) verified · official sources$/);
    if (verifiedCount) result = `${verifiedCount[1]} yoxlanılmış şirkət · rəsmi mənbələr`;
    const recruiterCount = normalized.match(/^(\d+) of (\d+) recruiters$/);
    if (recruiterCount) result = `${recruiterCount[1]} / ${recruiterCount[2]} rekrutor`;
    const vacancies = normalized.match(/^(\d+) active vacanc(?:y|ies)$/);
    if (vacancies) result = `${vacancies[1]} aktiv vakansiya`;
    const references = normalized.match(/^(\d+) (appraisals|reference letters|recommendations|cover letters)$/);
    if (references) result = `${references[1]} ${{'appraisals':'qiymətləndirmə','reference letters':'xasiyyətnamə','recommendations':'tövsiyə məktubu','cover letters':'müşayiət məktubu'}[references[2]]}`;
    const uploaded = normalized.match(/^Uploaded (\d{4}-\d{2}-\d{2}|—)$/);
    if (uploaded) result = `Yüklənib: ${uploaded[1]}`;
    const selected = normalized.match(/^(\d+) selected$/);
    if (selected) result = `${selected[1]} seçilib`;
    const qrTime = normalized.match(/^Valid for ([\d:]+)$/);
    if (qrTime) result = `Qüvvədədir: ${qrTime[1]}`;
    const daysLeft = normalized.match(/^(\d+) days left$/);
    if (daysLeft) result = `${daysLeft[1]} gün qalıb`;
    const expired = normalized.match(/^Expired (\d+) days$/);
    if (expired) result = `Müddəti ${expired[1]} gün əvvəl bitib`;
    const documents = normalized.match(/^(\d+) documents?$/);
    if (documents) result = `${documents[1]} sənəd`;
    const requests = normalized.match(/^(\d+) requests?$/);
    if (requests) result = `${requests[1]} sorğu`;
    const storage = normalized.match(/^of ([\d.]+ [KMGT]?B) used$/);
    if (storage) result = `/ ${storage[1]} istifadə olunub`;
    const percent = normalized.match(/^([<\d.%]+) of Personal storage used$/);
    if (percent) result = `Şəxsi yaddaşın ${percent[1]}-i istifadə olunub`;
    const plan = normalized.match(/^(.*?) plan · secure server storage$/);
    if (plan) result = `${plan[1] === 'Personal' ? 'Şəxsi' : plan[1]} plan · təhlükəsiz server yaddaşı`;
    const video = normalized.match(/^Watch video · ([\d:]+) · English audio$/);
    if (video) result = `Videoya bax · ${video[1]} · İngilis dilində səsləndirmə`;
    const selectedFile = normalized.match(/^Selected:\s*(.+)$/);
    if (selectedFile) result = `Seçilib: ${selectedFile[1]}`;
    const currentFile = normalized.match(/^Current file:\s*(.+)$/);
    if (currentFile) result = `Cari fayl: ${currentFile[1]}`;
    const renderingPages = normalized.match(/^Rendering (\d+) pages?\.\.\.$/);
    if (renderingPages) result = `${renderingPages[1]} səhifə hazırlanır...`;
    const renderedPages = normalized.match(/^(\d+) pages?$/);
    if (renderedPages) result = `${renderedPages[1]} səhifə`;
    const documentAction = normalized.match(/^(Preview|Edit|Delete|Select) (.+)$/);
    if (documentAction && result === undefined) result = `${{Preview:'Önbaxış',Edit:'Düzəliş et',Delete:'Sil',Select:'Seç'}[documentAction[1]]}: ${documentAction[2]}`;
    const sortBy = normalized.match(/^Sort by (.+?)(?:, (ascending|descending))?$/);
    if (sortBy && result === undefined) result = `${sortBy[1]} üzrə sırala${sortBy[2] ? `, ${sortBy[2] === 'ascending' ? 'artan' : 'azalan'} sıra` : ''}`;
    const notificationCount = normalized.match(/^Notifications, (.+)$/);
    if (notificationCount && result === undefined) result = `Bildirişlər, ${notificationCount[1]}`;
    if (result === undefined && /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/.test(normalized)) {
      result = normalized.replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g, month => ({Jan:'Yan',Feb:'Fev',Mar:'Mar',Apr:'Apr',May:'May',Jun:'İyn',Jul:'İyl',Aug:'Avq',Sep:'Sen',Oct:'Okt',Nov:'Noy',Dec:'Dek'})[month]);
    }
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
      // Preserve third-party role, company, recruiter and location values.
      const option = element.closest('option');
      if (option && option.value && !['jobsRegionFilter','jobsDateFilter','recruitersVacancies','recruitersSort','employersSort','employersSize'].includes(option.parentElement.id)) continue;
      const custom = element.closest('.jobs-select-option');
      if (custom && custom.parentElement.children[0] !== custom && !custom.closest('.jobs-date-filter,.jobs-region-filter')) continue;
      const trigger = element.closest('.jobs-select-toggle');
      if (trigger) {
        const select = trigger.parentElement.querySelector('select');
        if (select && select.value && !['jobsRegionFilter','jobsDateFilter'].includes(select.id)) continue;
      }
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
      const element = mutation.target.nodeType === 1 ? mutation.target : mutation.target.parentElement;
      if (element?.closest('.atsrs-locale-control')) continue;
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
    document.documentElement.lang = locale;
    roots.forEach(render);
    ['profileInlineBirthPicker'].forEach(id => { const node = document.getElementById(id); if (node) render(node); });
    document.querySelectorAll('.atsrs-locale-control summary').forEach(summary => {
      summary.setAttribute('aria-label', locale === 'az' ? 'Dil seçimi: Azərbaycan dili' : 'Language: English');
      const flag = summary.querySelector('img');
      const src = `assets/flags/${locale}.svg`;
      if (flag.getAttribute('src') !== src) flag.setAttribute('src', src);
    });
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
    for (const [id, en, az] of [['jobsVisibleCount','opportunities','vakansiya'],['employersPageCount','companies','şirkət']]) {
      const counter = document.getElementById(id);
      const numbers = counter && counter.textContent.match(/\d+/g);
      if (numbers && numbers.length === 2) counter.textContent = locale === 'az' ? `${numbers[0]} / ${numbers[1]} ${az}` : `${numbers[0]} of ${numbers[1]} ${en}`;
    }
    window.dispatchEvent(new Event('atsrs:locale-changed'));
  }
  function closeMenus() {
    document.querySelectorAll('details.atsrs-locale-control').forEach(control => { control.open = false; });
  }
  function mount(host) {
    if (!host || Array.from(host.children).some(child => child.classList.contains('atsrs-locale-control'))) return;
    const control = document.createElement('details');
    control.className = 'atsrs-locale-control';
    const summary = document.createElement('summary');
    const flag = document.createElement('img');
    flag.alt = ''; flag.width = 26; flag.height = 18;
    summary.append(flag);
    const menu = document.createElement('div');
    menu.className = 'atsrs-locale-options';
    for (const [code, label] of [['az', 'Azərbaycan dili'], ['en', 'English']]) {
      const button = document.createElement('button');
      button.type = 'button'; button.lang = code; button.dataset.locale = code;
      const icon = document.createElement('img');
      icon.src = `assets/flags/${code}.svg`; icon.alt = ''; icon.width = 26; icon.height = 18;
      button.append(icon, document.createTextNode(label));
      button.addEventListener('click', () => { setLocale(code); closeMenus(); summary.focus(); });
      menu.append(button);
    }
    control.append(summary, menu);
    host.prepend(control);
  }
  document.addEventListener('click', event => {
    document.querySelectorAll('details.atsrs-locale-control').forEach(control => {
      if (!control.contains(event.target)) control.open = false;
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('details.atsrs-locale-control[open]').forEach(control => {
      control.open = false; control.querySelector('summary').focus();
    });
  });
  window.addEventListener('popstate', closeMenus);
  window.addEventListener('hashchange', closeMenus);
  mount(document.querySelector('.public-header-actions'));
  mount(document.querySelector('#auth .auth-card'));
  function mountAccountPicker() { mount(document.getElementById('atsrsGlobalControls')); apply(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAccountPicker, {once:true});
  else mountAccountPicker();
  window.addEventListener('atsrs:resume', mountAccountPicker);
  window.atsrsMountAccountLanguage = mountAccountPicker;
  window.atsrsI18n = Object.freeze({ getLocale: () => locale });
  if (!window.__atsrsLocaleDialogsWrapped) {
    window.__atsrsLocaleDialogsWrapped = true;
    const nativeAlert = window.alert.bind(window);
    const nativeConfirm = window.confirm.bind(window);
    window.alert = message => nativeAlert(locale === 'az' ? translated(String(message ?? '')) : message);
    window.confirm = message => nativeConfirm(locale === 'az' ? translated(String(message ?? '')) : message);
  }
  window.addEventListener('storage', event => { if (event.key === key) setLocale(event.newValue === 'en' ? 'en' : 'az'); });
  apply();
})();
