const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const accountCss = fs.readFileSync(path.join(root, 'css', 'account.css'), 'utf8');
const cvCss = fs.readFileSync(path.join(root, 'css', 'cv-generator.css'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'js', 'cv-generator.js'), 'utf8');
const edge = fs.readFileSync(
  path.join(root, 'supabase', 'functions', 'generate-cv', 'index.ts'),
  'utf8'
);

assert.match(html, /<div class="cv-beta-box">[\s\S]*?id="generateCVBtn"/);
assert.match(html, /css\/account\.css\?v=420/);
assert.match(html, /js\/cv-generator\.js\?v=411/);
for (const css of [accountCss, cvCss]) {
  assert.doesNotMatch(
    css,
    /[^{}]*\.cv-beta-box[^{}]*\{[^{}]*display\s*:\s*none/i,
    'no stylesheet may hide the real CV generator'
  );
}
assert.match(
  accountCss,
  /#refsPage #cvCard \.ref-beta-box,[\s\S]*?\[class\*="premium"\][\s\S]*?display:none!important/,
  'unrelated premium and secondary CV slot rules must remain hidden'
);

assert.match(edge, /jsr:@supabase\/supabase-js@2\.111\.0"/);
assert.match(edge, /jsr:@supabase\/supabase-js@2\.111\.0\/cors"/);
assert.match(edge, /const OPENAI_TIMEOUT_MS = 45_000;/);
assert.match(edge, /const openAiAbort = new AbortController\(\)/);
assert.match(edge, /signal: openAiAbort\.signal/);
assert.match(edge, /finally \{\s*clearTimeout\(openAiTimeout\)/);
assert.match(edge, /reasoning:\s*\{\s*effort:\s*"low"\s*\}/);
assert.match(edge, /Upgrade your plan to create more versions\./);
assert.doesNotMatch(edge, /Titanium/i);
assert.match(
  edge,
  /if \(!token\) return json\(req, 401,[\s\S]*?auth\.getUser\(token\)[\s\S]*?if \(!serviceRoleKey \|\| !openAiKey\)/,
  'authentication must be rejected before provider configuration is evaluated'
);
assert.match(edge, /const profile = aiProfile\(/);
assert.match(edge, /documents: aiDocuments\(workspace\.documents\)/);
assert.doesNotMatch(
  edge.match(/const source = \{[\s\S]*?\n  \};/)?.[0] || '',
  /\b(file_data|blob|base64|data_url|storage_path)\b/i,
  'OpenAI source payload must contain metadata only'
);

function classList(initial = []) {
  const values = new Set(initial);
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    contains: (name) => values.has(name),
    toggle: (name, force) => {
      if (force === undefined) force = !values.has(name);
      force ? values.add(name) : values.delete(name);
      return force;
    },
  };
}

function element(id) {
  const listeners = {};
  return {
    id,
    value: '',
    checked: false,
    disabled: false,
    textContent: '',
    innerHTML: '',
    className: '',
    classList: classList(id === 'cvGeneratorModal' ? ['hidden'] : []),
    addEventListener(type, listener) { listeners[type] = listener; },
    dispatch(type, event = {}) {
      return listeners[type] && listeners[type](Object.assign({ target: this }, event));
    },
  };
}

function harness(invokeResult) {
  const ids = [
    'generateCVBtn', 'closeCvGeneratorBtn', 'cancelCvGeneratorBtn',
    'runCvGeneratorBtn', 'regenerateCvBtn', 'editCvGeneratorBtn',
    'previewGeneratedCvBtn', 'printGeneratedCvBtn', 'savePdfCvBtn',
    'cvGeneratorModal', 'cvGeneratorForm', 'cvGeneratorPreview',
    'cvGeneratorPreviewDocument', 'cvGeneratorStatus', 'generatedCvActions',
    'cvBetaBadge', 'cvTargetRole', 'cvLanguage', 'cvSummaryNotes',
    'cvSkills', 'cvExperience', 'cvEducation', 'cvAiConsent',
  ];
  const elements = Object.fromEntries(ids.map((id) => [id, element(id)]));
  elements.cvLanguage.value = 'English';
  const saved = [];
  const alerts = [];
  let invokeCount = 0;
  const storage = new Map([['atsrs_use_mode', 'personal']]);
  const context = {
    console: { error() {} },
    alert(message) { alerts.push(message); },
    localStorage: {
      getItem(key) { return storage.get(key) || null; },
      setItem(key, value) { storage.set(key, String(value)); },
    },
    document: {
      readyState: 'complete',
      body: { style: {}, classList: classList() },
      getElementById(id) { return elements[id] || null; },
      addEventListener() {},
    },
    window: {
      useMode: 'personal',
      addEventListener() {},
      print() {},
      localKey() { return 'profile'; },
      getData() { return saved; },
      saveData(_key, value) {
        saved.splice(0, saved.length, ...(Array.isArray(value) ? value : []));
      },
      supabaseClient: {
        auth: {
          async getSession() {
            return { data: { session: { access_token: 'synthetic-token' } } };
          },
        },
        functions: {
          async invoke(name, options) {
            invokeCount += 1;
            assert.equal(name, 'generate-cv');
            assert.ok(options.signal instanceof AbortSignal);
            assert.equal(options.body.file_data, undefined);
            assert.equal(options.body.blob, undefined);
            return typeof invokeResult === 'function'
              ? invokeResult(options)
              : invokeResult;
          },
        },
      },
      atsrsCloudData: { async flush() { return true; } },
    },
    setTimeout(callback) { callback(); return 1; },
    clearTimeout() {},
    Date,
    Object,
    Array,
    String,
    JSON,
    Promise,
    AbortController,
    AbortSignal,
  };
  context.window.window = context.window;
  context.window.document = context.document;
  context.window.localStorage = context.localStorage;
  vm.runInNewContext(runtime, context, { filename: 'cv-generator.js' });
  return {
    elements,
    alerts,
    saved,
    storage,
    invokeCount: () => invokeCount,
    api: context.window.atsrsCvGenerator,
  };
}

(async () => {
{
  const test = harness({ data: null, error: null });
  test.api.open();
  assert.equal(test.elements.cvGeneratorModal.classList.contains('hidden'), false);
  test.elements.closeCvGeneratorBtn.dispatch('click');
  assert.equal(test.elements.cvGeneratorModal.classList.contains('hidden'), true);
  test.storage.set('atsrs_use_mode', 'company');
  test.api.open();
  assert.equal(test.elements.cvGeneratorModal.classList.contains('hidden'), true);
  assert.match(test.alerts.at(-1), /Personal Accounts/);
}

{
  const test = harness({ data: null, error: null });
  test.elements.cvExperience.value = 'Synthetic experience';
  await test.elements.runCvGeneratorBtn.dispatch('click');
  assert.equal(test.invokeCount(), 0, 'consent validation must run before the network');
  assert.match(test.elements.cvGeneratorStatus.textContent, /Confirm the AI processing notice/);
  test.elements.cvAiConsent.checked = true;
  test.elements.cvExperience.value = '';
  await test.elements.runCvGeneratorBtn.dispatch('click');
  assert.equal(test.invokeCount(), 0, 'empty validation must run before the network');
  assert.match(test.elements.cvGeneratorStatus.textContent, /Add at least one career detail/);
}

async function failureCase(label, result) {
  const test = harness(result);
  test.elements.cvAiConsent.checked = true;
  test.elements.cvExperience.value = 'Synthetic experience';
  await test.elements.runCvGeneratorBtn.dispatch('click');
  assert.equal(test.invokeCount(), 1, `${label} must attempt exactly one request`);
  assert.equal(test.elements.runCvGeneratorBtn.disabled, false, `${label} must clear the loader`);
  assert.equal(test.elements.runCvGeneratorBtn.textContent, 'Generate CV');
  assert.notEqual(test.elements.cvGeneratorStatus.textContent, '');
}

await failureCase('401', { data: null, error: new Error('401 session expired') });
await failureCase('429', { data: null, error: new Error('429 quota reached') });
await failureCase('5xx', { data: null, error: new Error('500 provider failure') });
await failureCase('timeout', { data: null, error: new Error('FunctionsFetchError: aborted') });

{
  const cv = {
    full_name: 'Synthetic Person',
    headline: 'Synthetic Role',
    contact: {},
    professional_summary: 'Synthetic summary',
    core_skills: [],
    experience: [],
    education: [],
    certifications: [],
  };
  const test = harness({ data: { cv, model: 'synthetic-model' }, error: null });
  test.elements.cvAiConsent.checked = true;
  test.elements.cvExperience.value = 'Synthetic experience';
  await test.elements.runCvGeneratorBtn.dispatch('click');
  assert.equal(test.saved.length, 1);
  assert.equal(test.saved[0].full_name, 'Synthetic Person');
  assert.equal(test.elements.cvGeneratorPreview.classList.contains('hidden'), false);
  assert.equal(test.elements.runCvGeneratorBtn.disabled, false);
}

console.log('CV Generator activation contracts passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
