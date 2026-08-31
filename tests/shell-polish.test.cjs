const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'css','shell-polish.css'),'utf8');
const runtime=fs.readFileSync(path.join(root,'js','shell-polish.js'),'utf8');

assert.match(runtime,/navRefs:'References'/);
assert.doesNotMatch(runtime,/References & CV/);
const appRuntime=fs.readFileSync(path.join(root,'js','app.js'),'utf8');
const icons=fs.readFileSync(path.join(root,'vendor','phosphor-icons','phosphor-regular.css'),'utf8');

assert.match(index,/vendor\/phosphor-icons\/phosphor-regular\.css\?v=442/);
assert.match(index,/css\/shell-polish\.css\?v=5931/);
assert.match(index,/js\/storage\.js\?v=559/);
assert.match(index,/class="account-tabs" role="tablist"/);
assert.match(index,/accountTabGeneralBtn[^>]+aria-selected="true"/);
assert.match(index,/js\/shell-polish\.js\?v=567/);
assert.match(index,/js\/app\.js\?v=566/);
assert.doesNotMatch(index,/<span class="pill">PRODUCT UPDATES<\/span>/);
assert.match(css,/Shared Product Updates intro uses the page canvas[\s\S]*?#introPage \.updates-hero[\s\S]*?background:transparent!important/);
assert.match(css,/#introPage \.roadmap-section[\s\S]*?padding:0!important[\s\S]*?border:0!important[\s\S]*?background:transparent!important/);
assert.match(css,/Product Updates is one shared surface[\s\S]*?body:where\(\.personal-mode,\.company-mode\)[\s\S]*?#introPage[\s\S]*?width:min\(100%,1440px\)/);
assert.match(css,/body:where\(\.personal-mode,\.company-mode\):has\(#navIntro\.active\)[\s\S]*?#pageTitle[\s\S]*?width:min\(100%,1440px\)[\s\S]*?margin:0 auto 16px/);
assert.match(css,/body:where\(\.personal-mode,\.company-mode\) #introPage \.updates-hero h3,[\s\S]*?\.roadmap-heading h3[\s\S]*?line-height:1\.25/);
assert.match(css,/@media\(max-width:800px\)[\s\S]*?body:where\(\.personal-mode,\.company-mode\)[\s\S]*?#introPage[\s\S]*?width:calc\(100% - 16px\)/);
assert.match(icons,/\.ph-squares-four:before/);
assert.match(icons,/\.ph-file:before/);
assert.match(icons,/\.ph-file-text:before/);
assert.match(icons,/\.ph-bell:before/);
assert.match(icons,/\.ph-sparkle:before/);

for(const pair of [
  ['navDashboard','squares-four'],
  ['navCertificates','file'],
  ['navRefs','file-text'],
  ['navProfile','user-circle'],
  ['navIntro','sparkle'],
  ['navPrivacy','lock-simple']
]){
  assert.match(runtime,new RegExp(pair[0]+":'"+pair[1]+"'"));
}

const navIconBlock=css.match(/\.atsrs-nav-icon\{[^}]+\}/)?.[0]||'';
assert.match(navIconBlock,/color:inherit!important/);
assert.doesNotMatch(navIconBlock,/#[0-9a-f]{3,8}/i);
assert.match(css,/grid-template-columns:132px minmax\(0,1fr\)!important/);
assert.match(css,/#navIntro \.atsrs-nav-label[\s\S]*?white-space:nowrap!important/);
assert.match(css,/\.sidebar \.nav button,[\s\S]*?flex-direction:column!important/);
assert.match(css,/\.atsrs-nav-label\{[\s\S]*?text-align:center!important[\s\S]*?white-space:normal!important/);
assert.match(css,/V446: the document register uses the page background/);
assert.match(css,/html\[data-theme="light"\] body #app\.app:not\(\.hidden\)\{[\s\S]*?--atsrs-shell-accent:#2f6fb2/);
assert.match(css,/html\[data-theme="light"\] body #app\.app:not\(\.hidden\) \.pill\{[\s\S]*?color:var\(--atsrs-shell-accent-strong\)!important/);
assert.match(css,/html\[data-theme="dark"\] body #app\.app:not\(\.hidden\) \.pill\{[\s\S]*?color:#86efac!important/);
assert.match(css,/#certificatesPage \.atsrs-document-register\{[\s\S]*?min-width:0!important[\s\S]*?table-layout:fixed!important/);
assert.match(css,/\.atsrs-document-col-expiry\{width:106px\}/);
assert.match(css,/\.atsrs-document-col-uploaded\{width:102px\}/);
assert.match(css,/#certificatesPage \.table-wrap\{[\s\S]*?overflow-x:hidden!important[\s\S]*?border:0!important/);
assert.match(css,/\.atsrs-document-name\{[\s\S]*?-webkit-line-clamp:2/);
assert.match(css,/\.atsrs-document-row-actions\{[\s\S]*?display:grid/);
assert.match(appRuntime,/class="atsrs-document-name"/);
assert.match(appRuntime,/class="atsrs-document-row-actions"/);
assert.match(appRuntime,/data-label="Document"/);
assert.match(appRuntime,/data-label="Provider"/);
assert.match(appRuntime,/data-label="Actions"/);
assert.match(css,/@media\(max-width:800px\)[\s\S]*?#certificatesPage \.atsrs-document-register\{[\s\S]*?display:block!important[\s\S]*?min-width:0!important/);
assert.match(css,/#certificatesPage \.atsrs-document-register tbody tr\{[\s\S]*?grid-template-columns:28px minmax\(0,1fr\) auto!important/);
assert.match(css,/Personal routes and the compact Corporate routes share one readable origin[\s\S]*?body\.company-mode[\s\S]*?> \.main > section:not\(#candidatesPage\):not\(#personnelPage\)[\s\S]*?width:min\(100%,1440px\)/);
assert.match(css,/Only routes that already render the same heading[\s\S]*?body\.company-mode:has\(#dashboardPage:not\(\.hidden\)\)[\s\S]*?#pageTitle[\s\S]*?display:none!important/);
assert.match(css,/body\.company-mode:has\(#privacyPage:not\(\.hidden\)\)[\s\S]*?> \.main > #pageTitle/);
assert.doesNotMatch(css,/body\.company-mode:has\(#(?:certificatesPage|refsPage|compliancePage|reportsPage|profilePage|introPage):not\(\.hidden\)\)[^\{]*#pageTitle[^\{]*\{\s*display:none!important/);
assert.match(css,/Candidates and Personnel keep the approved wide directory\/list geometry[\s\S]*?#candidatesPage[\s\S]*?#personnelPage[\s\S]*?--atsrs-data-content-width,2100px/);
assert.match(css,/\.atsrs-document-sort > span:not\(\.atsrs-sort-arrows\)[\s\S]*?white-space:nowrap!important/);
assert.match(css,/html body #atsrsNotificationButton\{[\s\S]*?display:none!important/);
assert.match(css,/body #app\.app:not\(\.hidden\) #atsrsGlobalControls > #atsrsNotificationButton\{display:inline-flex!important\}/);
assert.match(css,/html\[data-theme\] body #app\.app:not\(\.hidden\) #atsrsGlobalControls > #atsrsNotificationButton\{[\s\S]*?border:0!important[\s\S]*?background:transparent!important/);
assert.match(css,/#atsrsNotificationButton \.ph\{font-size:24px/);
assert.match(css,/#atsrsGlobalControls > #atsrsThemeToggle[\s\S]*?width:44px!important[\s\S]*?height:44px!important/);
assert.match(css,/body #atsrsThemeToggle \.atsrs-theme-track\{[\s\S]*?width:42px!important[\s\S]*?height:24px!important/);
assert.match(css,/html\[data-theme="dark"\] body #atsrsThemeToggle \.atsrs-theme-moon\{[\s\S]*?color:#0f172a!important/);
assert.doesNotMatch(css,/#atsrsThemeToggle:hover \.atsrs-theme-track\{[\s\S]*?(?:background|border-color):/);
assert.match(css,/#atsrsThemeToggle::before,[\s\S]*?#atsrsThemeToggle::after\{display:none!important;content:none!important\}/);
assert.match(fs.readFileSync(path.join(root,'js','theme.js'),'utf8'),/ph ph-sun atsrs-theme-sun/);
assert.match(css,/\.sidebar \.nav button\.active[\s\S]*?background:transparent!important[\s\S]*?box-shadow:inset 3px 0 0 var\(--atsrs-shell-accent\)!important/);
assert.match(css,/\.cert-mode-buttons button\.active[\s\S]*?background:transparent!important/);
assert.match(css,/Account-page navigation needs an unmistakable current-page state[\s\S]*?data-theme="light"[\s\S]*?#profilePage \.account-tabs button\.active[\s\S]*?color:#245b93!important/);
assert.match(css,/data-theme="dark"[\s\S]*?#profilePage \.account-tabs button\.active[\s\S]*?color:#86efac!important/);
assert.match(fs.readFileSync(path.join(root,'js','storage.js'),'utf8'),/button\.setAttribute\("aria-selected","false"\)[\s\S]*?button\.setAttribute\("aria-selected","true"\)/);
assert.match(css,/Ordinary actions remain neutral[\s\S]*?background:transparent!important/);
assert.doesNotMatch(css,/html\[data-theme="dark"\] body #app\.app:not\(\.hidden\) button:not\([\s\S]*?background:var\(--atsrs-shell-accent\)!important/);
assert.match(css,/:where\(\.roadmap-icon,\.dashboard-view-button\)[\s\S]*?background:var\(--atsrs-shell-accent-soft\)!important/);
assert.match(css,/body\.personal-mode #app\.app:not\(\.hidden\) \.sidebar \.nav :is\([\s\S]*?#navCandidates[\s\S]*?#navCredentials[\s\S]*?display:none!important/);
assert.match(css,/body\.company-mode #app\.app:not\(\.hidden\) \.sidebar \.nav :is\([\s\S]*?#navCertificates[\s\S]*?#navRefs[\s\S]*?display:none!important/);
assert.match(runtime,/navCompliance:'Security'/);
assert.match(runtime,/navProfile:'Company'/);
assert.match(runtime,/function syncNavigationRoutes\(\)/);
assert.match(runtime,/window\.showPage\('security',compliance\)/);
assert.match(runtime,/window\.showPage\('compliance',compliance\)/);
assert.match(css,/route panels are layout wrappers[\s\S]*?#candidatesPage[\s\S]*?#personnelPage[\s\S]*?> \.panel\{[\s\S]*?background:transparent!important/);
assert.match(runtime,/window\.showPage\('dashboard',dashboard\)/);
assert.match(runtime,/atsrsNotificationPanel/);
assert.match(runtime,/function wrapNavigationWriter\(name\)/);
assert.match(runtime,/function closeMobileSidebar\(\)/);
assert.match(runtime,/function syncResponsiveShell\(\)/);
assert.match(runtime,/window\.addEventListener\('resize',queueResponsiveShellSync/);
assert.match(runtime,/window\.addEventListener\('orientationchange',queueResponsiveShellSync/);
assert.match(runtime,/window\.visualViewport\.addEventListener\('resize',queueResponsiveShellSync/);
assert.match(runtime,/main\.scrollLeft=0/);
assert.match(runtime,/function stabilizeVisibleRoute\(\)/);
assert.match(runtime,/if\(name==='showPage'\)[\s\S]*?closeMobileSidebar\(\)[\s\S]*?stabilizeVisibleRoute\(\)/);
assert.match(runtime,/\['applyLanguage','renderAll','changeLanguage','openApp','showPage'\]\.forEach\(wrapNavigationWriter\)/);
assert.match(runtime,/observe\(document\.body,\{attributes:true,attributeFilter:\['class'\]\}\)/);
assert.doesNotMatch(runtime,/queueMicrotask/);
assert.doesNotMatch(runtime,/observe\(nav,\{childList:true/);
const navigationQueue=runtime.match(/function queueNavigation\(\)\{[\s\S]*?\n  \}/)?.[0]||'';
assert.doesNotMatch(navigationQueue,/setTimeout/);

console.log('V449 shell polish contracts passed');
