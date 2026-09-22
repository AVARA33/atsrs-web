const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function makeElement(tagName) {
  const attributes = {};
  const handlers = {};
  const children = [];
  const element = {
    tagName, children, hidden: false, parentElement: null, className: '',
    classList: {
      add(name) { element.className += ' ' + name; },
      toggle(name, enabled) {
        element.className = element.className.replace(new RegExp('\\b' + name + '\\b', 'g'), '').trim();
        if (enabled) element.className += ' ' + name;
      }
    },
    setAttribute(name, value) { attributes[name] = value; },
    getAttribute(name) { return attributes[name] || null; },
    addEventListener(name, handler) { handlers[name] = handler; },
    querySelector(selector) { return selector === 'button' ? children[0] || null : null; },
    appendChild(child) { child.parentElement = element; children.push(child); },
    insertBefore(child, sibling) {
      child.parentElement = element;
      children.splice(Math.max(0, children.indexOf(sibling)), 0, child);
    },
    click() { return handlers.click(); }
  };
  return element;
}

async function run(unsaved, current, staleSignature) {
  const controls = makeElement('div');
  const documentHandlers = {};
  const intervals = [];
  const replaced = [];
  const document = {
    documentElement: { getAttribute() { return current ? 'V6151' : 'V6150'; } },
    head: makeElement('head'), body: makeElement('body'), visibilityState: 'visible',
    createElement: makeElement,
    getElementById(id) { return id === 'atsrsGlobalControls' ? controls : null; },
    querySelector() { return null; },
    addEventListener(name, handler) { documentHandlers[name] = handler; }
  };
  const location = {
    origin: 'https://atsrs.com', href: 'https://atsrs.com/?route=jobs',
    replace(url) { replaced.push(url); }
  };
  const window = {
    location, addEventListener() {}, setTimeout(handler) { handler(); }, setInterval(handler) { intervals.push(handler); }
  };
  const context = {
    document, window, location, URL, Date, Math,
    localStorage: { getItem() { return staleSignature ? 'old-signature' : ''; }, setItem() {} },
    fetch: async () => ({ ok: true, text: async () => '<html data-atsrs-build="V6151"></html>' })
  };
  vm.runInNewContext(script, context);
  intervals[1]();
  if (!current) await window.atsrsCheckLatestRelease();
  const notice = controls.children[0];
  assert.match(notice.className, /is-visible/);
  const button = notice.children[0];
  assert.equal(button.getAttribute('aria-label'), current ? 'Check for ATSRS updates' : 'Update ATSRS now');
  if (unsaved) {
    documentHandlers.input({ isTrusted: true, target: {
      closest(selector) { return selector.startsWith('#jobsPage') ? null : {}; }
    } });
  }
  await button.click();
  assert.equal(replaced.length, unsaved || current ? 0 : 1);
  if (unsaved) assert.equal(notice.children[1].hidden, false);
  else if (current) assert.equal(notice.children[1].textContent, 'ATSRS is up to date.');
  else assert.match(replaced[0], /_atsrs_release=V6151-/);
}

(async () => {
  await run(false, false);
  await run(true, false);
  await run(false, true);
  await run(false, true, true);
  console.log('Release update control behaviour passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
