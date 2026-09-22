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
    classList: { add(name) { element.className += ' ' + name; } },
    setAttribute(name, value) { attributes[name] = value; },
    getAttribute(name) { return attributes[name] || null; },
    addEventListener(name, handler) { handlers[name] = handler; },
    appendChild(child) { child.parentElement = element; children.push(child); },
    insertBefore(child, sibling) {
      child.parentElement = element;
      children.splice(Math.max(0, children.indexOf(sibling)), 0, child);
    },
    click() { handlers.click(); }
  };
  return element;
}

async function run(unsaved) {
  const controls = makeElement('div');
  const documentHandlers = {};
  const replaced = [];
  const document = {
    documentElement: { getAttribute() { return 'V6148'; } },
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
    location, addEventListener() {}, setTimeout(handler) { handler(); }, setInterval() {}
  };
  const context = {
    document, window, location, URL, Date, Math,
    localStorage: { getItem() { return ''; }, setItem() {} },
    fetch: async () => ({ ok: true, text: async () => '<html data-atsrs-build="V6149"></html>' })
  };
  vm.runInNewContext(script, context);
  await window.atsrsCheckLatestRelease();
  const notice = controls.children[0];
  assert.match(notice.className, /is-visible/);
  const button = notice.children[0];
  assert.equal(button.getAttribute('aria-label'), 'Update ATSRS now');
  if (unsaved) {
    documentHandlers.input({ isTrusted: true, target: {
      closest(selector) { return selector.startsWith('#jobsPage') ? null : {}; }
    } });
  }
  button.click();
  assert.equal(replaced.length, unsaved ? 0 : 1);
  if (unsaved) assert.equal(notice.children[1].hidden, false);
  else assert.match(replaced[0], /_atsrs_release=V6149-/);
}

(async () => {
  await run(false);
  await run(true);
  console.log('Release update control behaviour passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
