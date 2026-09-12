const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const shell=fs.readFileSync('js/shell-polish.js','utf8');
const notifications=fs.readFileSync('js/notifications.js','utf8');
const boot=fs.readFileSync('js/boot-refresh.js','utf8');
const html=fs.readFileSync('index.html','utf8');

test('notification gear opens the server-backed reminder settings',()=>{
  assert.match(shell,/function navigateToNotificationSettings\(\)/);
  assert.match(shell,/params\.set\('route','profile'\)/);
  assert.match(shell,/params\.set\('tab','security'\)/);
  assert.match(shell,/showAccountTab\('security'\)/);
  assert.match(shell,/showProfileWorkspaceTab\('security',false\)/);
  assert.match(shell,/profileTabSecurityBtn/);
  assert.match(shell,/securityTab\.click\(\)/);
  assert.match(shell,/byId\('manageNotifyBtn'\)/);
  assert.match(shell,/byId\('atsrsNotificationSettings'\)/);
  assert.match(shell,/addEventListener\('click',navigateToNotificationSettings\)/);
  assert.match(notifications,/byId\('profileTabSecurityPanel'\)/);
  assert.match(notifications,/securityHost\.appendChild\(panel\)/);
  assert.match(notifications,/atsrsCloseNotificationSettings/);
  assert.match(boot,/js\/notifications\.js\?v=389/);
  assert.match(html,/js\/boot-refresh\.js\?v=448/);
  assert.match(html,/js\/shell-polish\.js\?v=6065/);
});
