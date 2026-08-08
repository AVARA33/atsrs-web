const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css', 'notifications.css'), 'utf8');
const boot = fs.readFileSync(path.join(root, 'js', 'boot-refresh.js'), 'utf8');

assert.match(
  css,
  /body\.company-mode #dashboardPage \.atsrs-notification-item,\s*body\.company-mode #dashboardPage \.atsrs-notification-item\.is-unread\{\s*border-color:rgba\(51,82,108,\.62\);\s*background:rgba\(5,18,29,\.72\);\s*box-shadow:none;/,
  'Corporate expiry cards must use the same neutral dark surface as sent-request cards'
);
assert.match(
  css,
  /html\[data-theme="light"\] body\.company-mode #app #dashboardPage \.atsrs-notification-item,\s*html\[data-theme="light"\] body\.company-mode #app #dashboardPage \.atsrs-notification-item\.is-unread\{\s*border-color:#d6e0e8;\s*background:#fff;\s*box-shadow:0 6px 18px rgba\(36,61,80,\.045\);/,
  'Corporate expiry cards must use the same neutral light surface as sent-request cards'
);
assert.doesNotMatch(
  css,
  /body\.company-mode #dashboardPage \.atsrs-notification-item(?:\.is-unread)?\{[^}]*background:(?:#(?:1d4ed8|2563eb|3b82f6)|rgba?\([^)]*(?:59,130,246|29,78,216))/i,
  'Corporate expiry card surface must not regain a blue fill'
);
assert.match(css, /\.atsrs-notification-item\[data-severity="warning"\] \.atsrs-notification-dot\{background:#f59e0b\}/);
assert.match(boot, /css\/notifications\.css\?v=440/);

console.log('Dashboard expiry card neutral surface regression tests passed');
