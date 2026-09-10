const assert=require('node:assert/strict');
const fs=require('node:fs');

const html=fs.readFileSync('index.html','utf8');
const shell=fs.readFileSync('css/shell-polish.css','utf8');
const sharing=fs.readFileSync('js/profile-sharing-v1.js','utf8');

assert.match(html,/width=device-width, initial-scale=1\.0, viewport-fit=cover/);
assert.match(html,/css\/shell-polish\.css\?v=6095/);
assert.match(shell,/max-height:min\(560px,calc\(100dvh - var\(--atsrs-notification-top\) - max\(12px,env\(safe-area-inset-bottom\)\)\)\)/);
assert.match(shell,/@media\(max-width:443px\)[\s\S]*?\.atsrs-notification-popover\{[\s\S]*?left:max\(12px,env\(safe-area-inset-left\)\)!important;[\s\S]*?right:max\(12px,env\(safe-area-inset-right\)\)!important;[\s\S]*?width:auto;[\s\S]*?max-width:none/);
assert.doesNotMatch(shell,/@media\(max-width:443px\)[\s\S]*?\.atsrs-notification-popover\{[^}]*width:calc\(100vw/);
assert.match(html,/js\/profile-sharing-v1\.js\?v=6095/);
assert.match(sharing,/await c\.auth\.getSession\(\)/);
assert.match(sharing,/if\(!\(sessionResult\.data&&sessionResult\.data\.session\)\)return savedSetup/);

console.log('Responsive stability V6095 contracts passed.');
