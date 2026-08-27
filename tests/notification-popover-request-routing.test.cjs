const assert=require('node:assert/strict');
const fs=require('node:fs');
const shell=fs.readFileSync('js/shell-polish.js','utf8');
const css=fs.readFileSync('css/shell-polish.css','utf8');
const html=fs.readFileSync('index.html','utf8');

assert.match(shell,/atsrsNotificationPopover/);
assert.match(shell,/atsrsGetOwnerShareRequests/);
assert.match(shell,/item\.status==='pending'/);
assert.match(shell,/showAccountTab\('sharing'\)/);
assert.match(shell,/profile-sharing-link-request\[data-request-id=/);
assert.match(css,/\.atsrs-notification-popover\{/);
assert.match(css,/\.atsrs-notification-badge\{/);
assert.match(html,/css\/shell-polish\.css\?v=5870/);
assert.match(html,/js\/shell-polish\.js\?v=571/);
console.log('Notification popover request routing contracts passed');
