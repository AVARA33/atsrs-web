const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('index.html');
const desktop = read('js/document-qr-upload-v535.js');
const phone = read('js/qr-phone-upload-v535.js');
const edge = read('supabase/functions/document-qr-upload/index.ts');
const migration = read('supabase/migrations/20260815123000_personal_document_qr_upload_sessions.sql');

test('Documents methods use the requested AI, QR, Manual order', () => {
  const methods = index.match(/<div class="cert-mode-buttons">([\s\S]*?)<\/div>/)?.[1] ?? '';
  assert.ok(methods.indexOf('certScanModeBtn') < methods.indexOf('certQrModeBtn'));
  assert.ok(methods.indexOf('certQrModeBtn') < methods.indexOf('certManualModeBtn'));
  assert.match(methods, /ph-qr-code/);
});

test('desktop QR handoff is authenticated, short lived, and status-polled', () => {
  assert.match(desktop, /Authorization':'Bearer '/);
  assert.match(desktop, /request\('create'/);
  assert.match(desktop, /request\('status'/);
  assert.match(desktop, /atsrsReceiveQrDocument/);
  assert.match(index, /Valid for 10:00/);
});

test('phone flow offers camera and file choices with strict limits', () => {
  assert.match(index + read('qr-upload.html'), /Take a photo/);
  assert.match(index + read('qr-upload.html'), /Choose a file/);
  assert.match(phone, /15\*1024\*1024/);
  assert.match(phone, /uploadToSignedUrl/);
  assert.match(phone, /finalizeWithRetry/);
  assert.match(phone, /result\.session\.status==='uploading'/);
  assert.match(phone, /history\.replaceState/);
  assert.doesNotMatch(phone, /localStorage|sessionStorage/);
});

test('phone flow removes the retired wordmark and inherits the desktop theme', () => {
  const page = read('qr-upload.html');
  const css = read('css/qr-phone-upload-v535.css');
  assert.doesNotMatch(page, /AT&amp;RS|AT&RS/);
  assert.match(page, /URLSearchParams\(location\.search\)\.get\('theme'\)/);
  assert.match(css, /:root\[data-theme="light"\]/);
  assert.match(edge, /safeTheme\(body\.theme\)/);
  assert.match(edge, /\?theme=\$\{theme\}#token=/);
});

test('countdown starts at exactly ten minutes even with clock skew', () => {
  assert.match(edge, /ttl_seconds: SESSION_MINUTES \* 60/);
  assert.match(desktop, /countdownDeadline=Date\.now\(\)\+Math\.min\(600/);
  assert.match(desktop, /Math\.min\(serverDeadline,countdownDeadline\)/);
});

test('backend stores only a token hash and binds uploads to Personal', () => {
  assert.match(migration, /token_hash text not null unique/);
  assert.doesNotMatch(migration, /raw_token/);
  assert.match(migration, /account_type = 'personal'/);
  assert.match(edge, /sha256Hex\(rawToken\)/);
  assert.match(edge, /\$\{session\.user_id\}\/personal\/document\//);
  assert.match(edge, /MAX_FILE_BYTES = 15 \* 1024 \* 1024/);
  assert.match(edge, /createSignedUploadUrl/);
  assert.match(edge, /status: "uploaded"/);
});

test('anonymous actions require the unguessable token and owner actions verify auth', () => {
  assert.match(edge, /TOKEN_PATTERN = \/\^\[A-Za-z0-9_-\]\{40,128\}\$\//);
  assert.match(edge, /authenticatedUser\(req, supabaseUrl\)/);
  assert.match(edge, /action === "status" \|\| action === "cancel"/);
  assert.match(edge, /session\.status !== "pending"/);
  assert.match(edge, /session\.status !== "uploading"/);
});

test('phone file selection uploads and retries finalize until storage is visible', async () => {
  const listeners = {};
  let statusText = '';
  let finalizeCalls = 0;
  const span = { set textContent(value) { statusText = value; } };
  const makeElement = (id) => ({
    id,
    hidden: id === 'phoneUploadChoices',
    value: '',
    classList: { toggle() {} },
    addEventListener(type, handler) { listeners[id + ':' + type] = handler; },
    click() {},
    querySelector(selector) { return selector === 'span' ? span : null; },
    set innerHTML(value) { this._innerHTML = value; },
    get innerHTML() { return this._innerHTML || ''; },
  });
  const elements = Object.fromEntries([
    'phoneUploadStatus', 'phoneUploadChoices', 'phoneUploadProgress',
    'takePhotoBtn', 'chooseFileBtn', 'cameraInput', 'fileInput',
  ].map((id) => [id, makeElement(id)]));
  const response = (ok, data) => ({ ok, json: async () => data });
  const context = {
    console: { error() {} },
    document: { getElementById: (id) => elements[id] },
    history: { replaceState() {} },
    location: { hash: '#token=' + 'A'.repeat(43), pathname: '/qr-upload.html' },
    fetch: async (_url, options) => {
      const action = JSON.parse(options.body).action;
      if (action === 'inspect') return response(true, { session: { status: 'pending' } });
      if (action === 'prepare') return response(true, { path: 'safe/path.pdf', signed_token: 'signed' });
      if (action === 'finalize') {
        finalizeCalls += 1;
        return finalizeCalls < 3
          ? response(false, { error: 'Not ready', code: 'QR_UPLOAD_INCOMPLETE' })
          : response(true, { uploaded: true });
      }
      throw new Error('Unexpected action ' + action);
    },
    window: {
      location: { hash: '#token=' + 'A'.repeat(43), pathname: '/qr-upload.html' },
      setTimeout: (handler) => { Promise.resolve().then(handler); return 1; },
      supabase: { createClient: () => ({ storage: { from: () => ({ uploadToSignedUrl: async () => ({ error: null }) }) } }) },
    },
  };
  vm.runInNewContext(phone, context);
  await new Promise((resolve) => setTimeout(resolve, 10));
  listeners['fileInput:change']({ target: { files: [{ name: 'document.pdf', type: 'application/pdf', size: 1024 }], value: '' } });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(finalizeCalls, 3);
  assert.match(statusText, /Upload complete/);
});
