const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const shell=fs.readFileSync('js/shell-polish.js','utf8');
const html=fs.readFileSync('index.html','utf8');

test('notification gear opens the server-backed reminder settings',()=>{
  assert.match(shell,/function navigateToNotificationSettings\(\)/);
  assert.match(shell,/params\.set\('route','profile'\)/);
  assert.match(shell,/params\.set\('tab','security'\)/);
  assert.match(shell,/showAccountTab\('security'\)/);
  assert.match(shell,/byId\('manageNotifyBtn'\)/);
  assert.match(shell,/byId\('atsrsNotificationSettings'\)/);
  assert.match(shell,/addEventListener\('click',navigateToNotificationSettings\)/);
  assert.match(html,/js\/shell-polish\.js\?v=6063/);
});
