const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sourcePath = path.resolve(__dirname, '..', 'js', 'talent-directory.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const instrumented = source.replace(
  "  if(document.readyState==='loading')",
  "  window.__talentSummaryTest={bindCandidateListActions:bindCandidateListActions,setProfiles:function(next){profiles=next},setActionCall:function(next){actionCall=next}};\n  if(document.readyState==='loading')"
);

class ClassList {
  constructor() {
    this.values = new Set(['hidden']);
  }
  add(value) {
    this.values.add(value);
  }
  remove(value) {
    this.values.delete(value);
  }
  contains(value) {
    return this.values.has(value);
  }
}

class Button {
  constructor(action) {
    this.dataset = { listAction: action };
    this.attributes = new Map(action === 'summary' ? [['aria-expanded', 'false']] : []);
    this.onclick = null;
  }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
  getAttribute(name) {
    return this.attributes.get(name) || null;
  }
}

class Panel {
  constructor() {
    this.classList = new ClassList();
    this.dataset = {};
    this.innerHTML = '';
    this.isConnected = true;
    this.parentElement = null;
  }
  querySelector() {
    return null;
  }
}

function candidate(id) {
  const summary = new Button('summary');
  const message = new Button('message');
  const panel = new Panel();
  const row = {
    dataset: { candidateRow: id },
    querySelector(selector) {
      if (selector === '.talent-list-action-panel') return panel;
      if (selector === '[data-list-action="summary"]') return summary;
      return null;
    },
    querySelectorAll(selector) {
      return selector === '[data-list-action]' ? [summary, message] : [];
    }
  };
  panel.parentElement = row;
  return { id, row, panel, summary, message };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const first = candidate('candidate-a');
const second = candidate('candidate-b');
const panels = [first.panel, second.panel];
const documentStub = {
  readyState: 'loading',
  addEventListener() {},
  getElementById() {
    return null;
  },
  querySelectorAll(selector) {
    return selector === '.talent-list-action-panel' ? panels : [];
  }
};
const context = {
  window: {},
  document: documentStub,
  localStorage: { getItem() { return null; } },
  location: { origin: 'https://atsrs.test' },
  URL,
  console,
  setTimeout() { return 0; },
  setInterval() { return 0; },
  clearTimeout() {},
  clearInterval() {}
};
context.window.window = context.window;
context.window.addEventListener = () => {};
vm.runInNewContext(instrumented, context, { filename: sourcePath });

const api = context.window.__talentSummaryTest;
api.setProfiles([{ user_id: first.id }, { user_id: second.id }]);
const requests = [];
api.setActionCall((payload) => {
  const request = deferred();
  requests.push({ payload, request });
  return request.promise;
});
api.bindCandidateListActions({
  querySelectorAll(selector) {
    return selector === '[data-candidate-row]' ? [first.row, second.row] : [];
  }
});

first.summary.onclick();
assert.equal(requests.length, 1, 'first open must fetch once');
assert.equal(first.summary.getAttribute('aria-expanded'), 'true');
assert.equal(first.panel.classList.contains('hidden'), false);
assert.match(first.panel.innerHTML, /Loading document summary/);

first.summary.onclick();
assert.equal(requests.length, 1, 'close must not issue another request');
assert.equal(first.summary.getAttribute('aria-expanded'), 'false');
assert.equal(first.panel.classList.contains('hidden'), true);
assert.equal(first.panel.innerHTML, '');

requests[0].request.resolve({ counts: { total: 0 }, documents: [] });
setImmediate(async () => {
  assert.equal(first.panel.classList.contains('hidden'), true, 'stale response must not reopen a closed panel');
  assert.equal(first.panel.innerHTML, '');

  first.summary.onclick();
  assert.equal(requests.length, 2, 'open after close must fetch once');
  requests[1].request.resolve({ counts: { total: 1, current: 1, expiryRisk: 0, expired: 0 }, documents: [{ title: 'Certificate', provider: 'Provider', status: 'Valid', uploaded_at: null }] });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(requests.length, 3, 'an open summary checks the separately stored CV once');
  assert.equal(requests[2].payload.action, 'cv');
  requests[2].request.resolve({ file_name: 'Candidate CV.pdf', url: 'https://example.test/signed' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(first.summary.getAttribute('aria-expanded'), 'true');
  assert.equal(first.panel.classList.contains('hidden'), false);
  assert.match(first.panel.innerHTML, /Document Summary/);
  assert.match(first.panel.innerHTML, /2 of 2 documents/);
  assert.match(first.panel.innerHTML, /Candidate CV\.pdf/);
  assert.match(first.panel.innerHTML, /CV on file/);

  second.summary.onclick();
  assert.equal(requests.length, 4, 'switching candidates must fetch only the newly opened candidate');
  assert.equal(first.summary.getAttribute('aria-expanded'), 'false');
  assert.equal(first.panel.classList.contains('hidden'), true);
  assert.equal(second.summary.getAttribute('aria-expanded'), 'true');
  assert.equal(second.panel.classList.contains('hidden'), false);

  requests[3].request.reject(new Error('synthetic failure'));
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(second.panel.innerHTML, /Document summary could not be loaded/);
  second.summary.onclick();
  assert.equal(requests.length, 4, 'closing an error panel must not retry');
  assert.equal(second.summary.getAttribute('aria-expanded'), 'false');
  assert.equal(second.panel.classList.contains('hidden'), true);

  assert.match(source, /data-list-action="summary" aria-expanded="false" aria-controls="/);
  assert.match(source, /if\(action==='summary'&&button\.getAttribute\('aria-expanded'\)==='true'\)/);
  assert.match(source, /if\(!requestIsCurrent\(\)\)return/);
  console.log('Talent Summary list toggle regression tests passed');
});
