const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const security=fs.readFileSync('js/account-security-live.js','utf8');

assert.match(html,/js\/account-security-live\.js\?v=376/);
assert.match(html,/css\/account-security-live\.css\?v=6002/);
const securityCss=fs.readFileSync('css/account-security-live.css','utf8');
assert.match(securityCss,/html\[data-theme="light"\] \.atsrs-security-consent/);
assert.match(securityCss,/html\[data-theme="light"\] \.atsrs-security-consent span/);
assert.match(security,/No security setting changes until you start setup/);
assert.match(security,/id="atsrsStartMfa"/);
assert.match(security,/byId\('atsrsStartMfa'\)\.onclick=startMfa/);
const openMfaBlock=security.slice(security.indexOf('async function openMfa()'),security.indexOf('async function startMfa()'));
assert.doesNotMatch(openMfaBlock,/auth\.mfa\.enroll/);
assert.match(security,/async function startMfa\(\)[\s\S]*?auth\.mfa\.enroll/);
assert.match(security,/openModal\([^;]+,true\);[\s\S]*?atsrsCancelMfa/);
assert.match(security,/atsrsCancelMfa[\s\S]*?auth\.mfa\.unenroll/);
assert.match(security,/event\.key==='Escape'/);
assert.match(security,/event\.key!=='Tab'/);
assert.match(security,/aria-labelledby/);
assert.match(security,/modalReturnFocus/);
assert.match(security,/setMfaStatus\(true\)/);
assert.match(security,/setMfaStatus\(false\)/);

console.log('Profile Security flow contracts passed');
