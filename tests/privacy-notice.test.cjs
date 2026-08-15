const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');

const root=path.resolve(__dirname,'..');
const privacy=fs.readFileSync(path.join(root,'privacy.html'),'utf8');
const deletion=fs.readFileSync(path.join(root,'data-deletion.html'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'css','product-experience.css'),'utf8');
const publicLegalHeaderCss=fs.readFileSync(path.join(root,'css','public-legal-header.css'),'utf8');
const storage=fs.readFileSync(path.join(root,'js','storage.js'),'utf8');

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
assert.match(deletion,/class="atsrs-public-landing legal-public-nav-shell"/);
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
  assert.match(page,/class="public-header"/);
  assert.match(page,/class="public-wordmark atsrs-home-lockup"/);
  assert.match(page,/data-public-theme-toggle/);
  assert.match(page,/html\[data-embedded="true"\] \.hero h1\{display:block\}/);
  assert.doesNotMatch(page,/html\[data-embedded="true"\] \.hero h1\{display:none\}/);
  assert.match(page,/html\[data-theme="light"\]/);
  assert.doesNotMatch(page,/@media\(prefers-color-scheme:light\)/);
  assert.match(page,/html\[data-theme="light"\] \.eyebrow\{color:#245b93;border-color:#c8d9eb\}/);
  assert.ok(
    page.indexOf("localStorage.getItem('atsrs_theme')") < page.indexOf('<style>'),
    'Stored theme must be applied before render-blocking styles to prevent a first-paint flash'
  );
}

assert.doesNotMatch(index,/PRIVACY &amp; LEGAL/);
assert.match(index,/id="navPrivacy" class="nav-utility nav-legal-link" type="button" onclick="showPage\('privacy',this\)">Privacy<\/button>/);
assert.doesNotMatch(index,/id="navDataRights"/);
assert.ok(index.indexOf('id="navIntro"') < index.indexOf('id="navPrivacy"'));
assert.match(index,/id="privacyPage" class="hidden legal-app-page"[\s\S]*src="about:blank" data-legal-source="\/privacy\.html\?embedded=1&amp;v=560"/);
assert.match(index,/id="dataRightsPage" class="hidden legal-app-page"[\s\S]*src="about:blank" data-legal-source="\/data-deletion\.html\?embedded=1&amp;v=560"/);
assert.doesNotMatch(privacy,/<nav class="header-links"/);
assert.doesNotMatch(deletion,/<nav class="header-links"/);
assert.match(privacy,/data-legal-target="dataRights" onclick="return window\.atsrsNavigateLegal\(event,'dataRights'\)">Data Rights<\/a>/);
assert.match(deletion,/data-legal-target="privacy" onclick="return window\.atsrsNavigateLegal\(event,'privacy'\)">Privacy Notice<\/a>/);
assert.match(privacy,/href="\/\?view=home"[^>]*onclick="return window\.atsrsLeaveLegalToHome\(\)"[^>]*>Back to Home<\/a>/);
assert.match(deletion,/href="\/\?view=home"[^>]*onclick="return window\.atsrsLeaveLegalToHome\(\)"[^>]*>Back to Home<\/a>/);
assert.match(privacy,/localStorage\.removeItem\('atsrs_current_page'\)/);
assert.match(deletion,/localStorage\.removeItem\('atsrs_current_page'\)/);
for(const page of [privacy,deletion]){
  assert.match(page,/window\.parent\.postMessage\([\s\S]*?window\.parent\.location\.origin\)/);
  assert.doesNotMatch(page,/postMessage\([\s\S]*?['"]\*['"]\)/);
}
assert.match(storage,/event\.origin!==window\.location\.origin&&event\.origin!=="null"/);
assert.match(storage,/event\.source!==\(privacyFrame&&privacyFrame\.contentWindow\)/);
assert.match(storage,/page!=="privacy"&&page!=="dataRights"/);
assert.match(storage,/dataRights:navPrivacy/);
assert.match(storage,/page==="privacy"\?"Privacy Notice":page==="dataRights"\?"Data Rights"/);
assert.match(storage,/function hydrateLegalFrame\(page\)/);
assert.match(storage,/window\.fetch\(source,\{credentials:"same-origin",cache:"no-store"\}\)/);
assert.match(storage,/frame\.srcdoc=html/);
assert.match(storage,/html=html\.replace\([\s\S]*?var embedded=true;/);
assert.match(storage,/hydrateLegalFrame\(renderedPage\)/);
assert.match(publicLegalHeaderCss,/html\[data-embedded="true"\] \.legal-public-nav-shell\{display:none\}/);
assert.match(index,/data-atsrs-build="V560"/);
assert.match(index,/src="js\/corporate-remediation\.js\?v=480"/);
assert.match(index,/href="css\/corporate-information-architecture\.css\?v=421"/);
assert.match(index,/src="js\/storage\.js\?v=559"/);
assert.doesNotMatch(css,/\.legal-resource-grid|\.legal-resource-card|\.legal-section/);

console.log('privacy notice contracts passed');
