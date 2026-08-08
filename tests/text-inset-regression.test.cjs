const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const notifications = fs.readFileSync(path.join(root, 'css', 'notifications.css'), 'utf8');
const sage = fs.readFileSync(path.join(root, 'css', 'sage-ledger.css'), 'utf8');

assert.match(notifications, /\.corporate-dashboard-activity-grid\{[^}]*margin:0 40px 26px!important/, 'Corporate dashboard activity cards need the desktop content gutter');
assert.match(notifications, /@media\(max-width:800px\)\{\.corporate-dashboard-activity-grid\{[^}]*margin:0 12px 20px!important/, 'Corporate dashboard activity cards need a mobile-safe gutter');
assert.match(notifications, /\.atsrs-notification-item\{[^}]*padding:18px/, 'Notification cards need safe internal padding');
assert.match(sage, /#introPage \.updates-hero\{\s*padding:28px 32px!important/, 'Product Updates hero text needs an internal inset');
assert.match(sage, /overflow-wrap:break-word!important;word-break:normal!important/, 'Functional card copy needs safe wrapping');

console.log('Text inset and wrapping regression contracts passed');
