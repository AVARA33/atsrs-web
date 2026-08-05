const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');

const root=path.resolve(__dirname,'..');
const privacy=fs.readFileSync(path.join(root,'privacy.html'),'utf8');
const deletion=fs.readFileSync(path.join(root,'data-deletion.html'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'css','product-experience.css'),'utf8');

assert.match(privacy,/Effective:<\/strong> 4 August 2026/);
assert.match(privacy,/Our data-protection roles/);
assert.match(privacy,/Potentially sensitive data/);
assert.match(privacy,/Why we use data and our legal bases/);
assert.match(privacy,/Supabase:/);
assert.match(privacy,/OpenAI:/);
assert.match(privacy,/Resend:/);
assert.match(privacy,/Optional AI features/);
assert.match(privacy,/International data transfers/);
assert.match(privacy,/How long data is kept/);
assert.match(privacy,/Cookies, sessions and local storage/);
assert.match(privacy,/ATSRS does not sell personal data/);
assert.match(privacy,/href="\/data-deletion\.html"/);
assert.doesNotMatch(privacy,/MЙ|Д±|Гј|ЖЏ|Еџ/);

assert.match(deletion,/Data rights and deletion/);
assert.match(deletion,/within 30 days/);
assert.match(deletion,/Corporate workspace information/);
assert.match(deletion,/href="\/privacy\.html"/);
assert.match(deletion,/class="site-header"/);
assert.match(deletion,/class="summary-grid"/);
assert.match(deletion,/class="toc"/);
assert.match(deletion,/class="notice"/);
assert.match(deletion,/class="contact-card"/);

for(const page of [privacy,deletion]){
  assert.match(page,/localStorage\.getItem\('atsrs_theme'\)/);
  assert.match(page,/prefers-color-scheme: light/);
  assert.match(page,/document\.documentElement\.dataset\.theme=theme/);
  assert.match(page,/new URLSearchParams\(window\.location\.search\)\.get\('embedded'\)==='1'/);
  assert.match(page,/window\.addEventListener\('storage'/);
  assert.match(page,/html\[data-embedded="true"\] \.site-header\{display:none\}/);
  assert.match(page,/html\[data-theme="light"\]/);
  assert.doesNotMatch(page,/@media\(prefers-color-scheme:light\)/);
  assert.ok(
    page.indexOf("localStorage.getItem('atsrs_theme')") < page.indexOf('<style>'),
    'Stored theme must be applied before render-blocking styles to prevent a first-paint flash'
  );
}

assert.doesNotMatch(index,/PRIVACY &amp; LEGAL/);
assert.match(index,/id="navPrivacy" class="nav-utility nav-legal-link" type="button" onclick="showPage\('privacy',this\)">Privacy Notice<\/button>/);
assert.match(index,/id="navDataRights" class="nav-utility nav-legal-link" type="button" onclick="showPage\('dataRights',this\)">Data Rights<\/button>/);
assert.ok(index.indexOf('id="navIntro"') < index.indexOf('id="navPrivacy"'));
assert.ok(index.indexOf('id="navPrivacy"') < index.indexOf('id="navDataRights"'));
assert.match(index,/id="privacyPage" class="hidden legal-app-page"[\s\S]*src="\/privacy\.html\?embedded=1"/);
assert.match(index,/id="dataRightsPage" class="hidden legal-app-page"[\s\S]*src="\/data-deletion\.html\?embedded=1"/);
assert.doesNotMatch(privacy,/<nav class="header-links"/);
assert.doesNotMatch(deletion,/<nav class="header-links"/);
assert.match(index,/data-atsrs-build="V420"/);
assert.match(index,/href="css\/product-experience\.css\?v=417"/);
assert.doesNotMatch(css,/\.legal-resource-grid|\.legal-resource-card|\.legal-section/);

console.log('privacy notice contracts passed');
