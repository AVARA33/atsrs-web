const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('V6279 loads one permanent ATSRS theme on the app and every public surface', () => {
  const app = read('index.html');
  assert.match(app, /data-atsrs-build="V6279"/);
  assert.match(app, /atsrs-single-theme-v6275\.css\?v=6279/);
  assert.match(app, /<h1 class="sr-only">ATSRS account access<\/h1>/);
  for (const file of [
    'billing-terms.html', 'contact.html', 'data-deletion.html', 'data-protection.html',
    'faq.html', 'pricing.html', 'privacy.html', 'refund-policy.html', 'security.html',
    'terms.html', 'qr-upload.html', 'download/android/index.html'
  ]) assert.match(read(file), /atsrs-single-theme-v6275\.css\?v=6279/, `${file} must load the one-theme stylesheet`);
});

test('the one-theme stylesheet defines the approved graphite and bronze palette', () => {
  const css = read('css/atsrs-single-theme-v6275.css');
  for (const token of ['#0b0d0e','#293033','#f4f1ec','#9da5a7','#a86642','#c07a50','#211713','#4f9b68','#c9a227','#c65f55']) {
    assert.match(css, new RegExp(token), `missing ${token}`);
  }
  assert.match(css, /#atsrsThemeToggle[\s\S]*?display:none!important/);
  assert.match(css, /html body\.atsrs-public-view/);
  assert.match(css, /html body\.auth-open/);
});

test('selected controls are visually distinct and semantic green is reserved for status', () => {
  const css = read('css/atsrs-single-theme-v6275.css');
  assert.match(css, /#rotationPage \.rotation-tabs button:is\(\.is-active,\[aria-pressed="true"\]\)[\s\S]*?background:var\(--atsrs-one-bronze-soft\)!important/);
  assert.match(css, /#rotationPage \.rotation-heading h1[\s\S]*?color:var\(--atsrs-one-text\)!important/);
  assert.match(css, /#atsrsDatePicker \.atsrs-date-picker-dialog \.atsrs-date-picker-days button:is\(\.selected,\[data-selected="true"\],\[aria-pressed="true"\]\)[\s\S]*?box-shadow:inset 0 0 0 1px var\(--atsrs-one-bronze\)!important/);
  assert.match(css, /#atsrsDatePicker#atsrsDatePicker#atsrsDatePicker \.atsrs-date-picker-dialog[\s\S]*?overflow-x:hidden!important/);
  assert.match(css, /#atsrsDatePicker#atsrsDatePicker#atsrsDatePicker \.atsrs-date-picker-days :is\(button,\.empty\)[\s\S]*?min-width:0!important/);
  assert.match(css, /\.document-status-valid,\.status-valid[\s\S]*?--atsrs-one-success/);
  assert.match(css, /#introPage \.updates-atlas[\s\S]*?--atlas-green:var\(--atsrs-one-bronze\)!important/);
});

test('dialog popovers are accessible and remain viewport-aligned inside their top-layer host', () => {
  const datePicker = read('js/date-picker.js');
  const select = read('js/select-standard.js');
  const harness = read('tests/fixtures/rotation-entry-popovers-v6275-harness.html');
  assert.match(datePicker, /picker\.setAttribute\('aria-hidden','true'\)/);
  assert.match(datePicker, /picker\.setAttribute\('inert',''\)/);
  assert.match(datePicker, /dialog\.style\.left=Math\.round\(left\)\+'px'/);
  assert.match(datePicker, /dialog\.style\.top=Math\.round\(top\)\+'px'/);
  assert.match(datePicker, /activeInput\.id==='rotationEntryEnd'/);
  assert.match(select, /control\.menu\.style\.left=viewportLeft\+'px'/);
  assert.match(select, /control\.menu\.style\.top=viewportTop\+'px'/);
  assert.match(harness, /id="rotationEntryWeeks"/);
  assert.match(harness, /for\(var n=1;n<=48;n\+\+\)/);
});
