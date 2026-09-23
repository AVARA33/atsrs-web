const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

async function run({ current = false, persisted = false, attempted = '' } = {}) {
  const windowHandlers = {};
  const replaced = [];
  const session = new Map(attempted ? [['atsrs_entry_release_reload', attempted]] : []);
  const document = { documentElement: { getAttribute() { return current ? 'V6155' : 'V6154'; } } };
  const location = { href: 'https://atsrs.com/?route=jobs', replace(url) { replaced.push(url); } };
  const window = { location, addEventListener(name, handler) { windowHandlers[name] = handler; } };
  const context = {
    document, window, location, URL, Date,
    sessionStorage: {
      getItem(key) { return session.get(key) || null; },
      setItem(key, value) { session.set(key, value); },
      removeItem(key) { session.delete(key); }
    },
    fetch: async () => ({ ok: true, text: async () => '<html data-atsrs-build="V6155"></html>' })
  };
  vm.runInNewContext(script, context);
  windowHandlers.pageshow({ persisted });
  await new Promise(resolve => setImmediate(resolve));
  return { replaced, session };
}

(async () => {
  const stale = await run();
  assert.equal(stale.replaced.length, 1, 'a newly opened stale page refreshes once');
  assert.match(stale.replaced[0], /_atsrs_release=V6155-/);

  const current = await run({ current: true, attempted: 'V6155' });
  assert.equal(current.replaced.length, 0, 'a current page does not refresh');
  assert.equal(current.session.has('atsrs_entry_release_reload'), false, 'the reload guard is cleared');

  assert.equal((await run({ persisted: true })).replaced.length, 0, 'an existing BFCache session is never updated');
  assert.equal((await run({ attempted: 'V6155' })).replaced.length, 0, 'the entry reload guard prevents a loop');
  assert.doesNotMatch(html, /atsrs-release-notice|ph-download-simple|ATSRS is up to date/);
  assert.doesNotMatch(html, /addEventListener\('focus'|visibilitychange|setInterval/);
  console.log('Entry-only release update behaviour passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
