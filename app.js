/* ===== Original V178 inline script 1  ===== */
const SUPABASE_URL="https://hwtjuqyxziyymofamwxl.supabase.co";
const SUPABASE_KEY="sb_publishable_57xvbnJGp7pTXvfG11EdvA_Du_LvVyD";
const APP_URL="https://atsrs.com/";
let supabaseClient=null;try{if(window.supabase)supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY)}catch(e){console.error(e)}
let currentUser=null,timer=null,countdown=0;let lang="en";try{localStorage.setItem("atsrs_lang","en")}catch(e){}

const T={
  en:{sub:"Automated Tracking & Reporting System",login:"Login",email:"Email",password:"Password",create:"Create account",forgot:"Forgot password?",registerTitle:"Create Account",confirm:"Confirm password",register:"Register",back:"Back to Login",resetTitle:"Reset Password",resetInfo:"Enter your email. A reset link will be sent to your inbox.",sendReset:"Send reset email",newPass:"Set New Password",newPassword:"New password",confirmNew:"Confirm new password",saveNew:"Save new password",cabinet:"Compliance Cabinet",dashboard:"Dashboard",personnel:"Personnel",certificates:"Certificates",logout:"Exit",totalPersonnel:"Total Personnel",totalCerts:"Total Certificates",exp90:"Expiring in 90 Days",exp30:"Expiring in 30 Days",expired:"Expired",fill:"Fill all fields.",addPersonnel:"Add Personnel",personnelList:"Personnel List",name:"Name",surname:"Surname",position:"Position",company:"Company",phone:"Phone",action:"Action",addCert:"Add Certificate",provider:"Training Center / Provider",certRegister:"Certificate Register",certificate:"Certificate",expiry:"Expiry",status:"Status",saveProfile:"Save",fill:"Fill all fields.",fix:"Please fix highlighted fields.",enterLogin:"Enter email and password.",passRule:"Password must be at least 6 characters.",matchRule:"Passwords do not match.",sending:"Sending reset email...",sent:"Reset email sent. Check inbox/spam.",connection:"Connection failed. Check network or Supabase access.",selectCrew:"Select Crew Member",delete:"Delete",valid:"Valid",personalUse:"Personal",companyUse:"Corporate",myDocuments:"My Documents",personalDashboardNote:"Personal mode keeps focus on your own documents only.",scanUpload:"Scan / Upload Document",ocrManual:"OCR could not confidently read all fields. Please fill missing fields and confirm.",nationality:"Nationality",employeeId:"Employee ID",project:"Project",vessel:"Vessel",crewRegister:"Crew Register",crewList:"Crew List",addCrew:"Add Crew",importExcel:"Import Excel",groupsProjects:"Groups / Projects",complianceStatus:"Compliance Status",searchCrew:"Search crew...",allCompanies:"All companies",allPositions:"All positions",allStatuses:"All statuses",ready:"Ready",review:"Review",blocked:"Blocked",importInfo:"Upload Excel/CSV. Full auto-mapping will be connected in the next data phase.",fileSelected:"File selected",projects:"Projects",client:"Client",team:"Team",addProject:"Add Project",readyCrew:"Ready crew",reviewCrew:"Needs review",blockedCrew:"Blocked / expired",complianceNote:"Compliance is calculated from certificate expiry dates. Document requirement rules will be added later if needed.",crewStatus:"Crew Status",exp30s:"Expiring <30 days",exp90s:"Expiring <90 days"}
};
const UI={
  en:{account:"Account",general:"General",security:"Security",preferences:"Preferences",country:"Country",recoveryEmail:"Recovery email",primaryEmail:"Primary email",primaryEmailNote:"Your main login email.",password:"Password",passwordNote:"Change your account password.",change:"Change",twofa:"Two-factor authentication",twofaNote:"Google Authenticator / email code support.",setup:"Setup",sessions:"Active Sessions",sessionsNote:"View devices currently signed in.",view:"View",notifications:"Notifications",notificationsNote:"Certificate expiry alerts by email/SMS.",manage:"Manage",exportData:"Export My Data",exportDataNote:"Download your ATSRS account data.",export:"Export",deleteAccount:"Delete Account",deleteAccountNote:"Permanent deletion will be enabled after live Auth.",timezone:"Time Zone",addDoc:"Upload Document",scanDoc:"Scan with Camera",uploadDoc:"Upload File",scanInfo:"Use your camera or upload PDF/JPG/PNG. Auto extraction will be connected in the OCR phase.",confirmInfo:"Confirm Information",docNo:"Document / Certificate No",issueDate:"Issue Date",manualCert:"Manual Certificate Entry",confirm:"Confirm Info",extractNote:"Auto extraction is in test mode. Review and confirm before saving.",fileSelected:"File selected",ocrStarting:"OCR started. Reading document...",ocrProgress:"OCR progress",ocrDone:"OCR completed. Please review detected information.",ocrNotAvailable:"OCR library is not loaded. Check internet connection.",noTextDetected:"No clear text detected. Please fill manually.",authLiveNotice:"This will be connected after Supabase Auth is live.",twofaNotice:"2FA will be added in the next security phase.",sessionsNotice:"Active sessions will be connected after Supabase Auth is live.",notifyNotice:"Notification settings will be added with backend alerts.",deleteNotice:"Account deletion will be connected after Supabase Auth is live."}
};
const LANG_FLAGS={en:"🇬🇧"};
const EMAIL_MSG={en:"Enter a valid email address."};
function tr(k){return (T[lang]&&T[lang][k])||T.en[k]||k}
function ptr(k){return (UI[lang]&&UI[lang][k])||UI.en[k]||k}
const SOLO_TX={
  en:{soloBadge:"SOLO MODE",soloHeroTitle:"Your certificate control center",soloHeroText:"Upload your certificates and track expiry risk from one clean dashboard.",quickUpload:"Upload File",quickManual:"Manual Entry",whatsappBadge:"WHATSAPP READY",whatsappTitle:"WhatsApp alerts",whatsappText:"Frontend will only show settings. Real alerts must run from backend scheduled jobs using approved WhatsApp templates.",riskTitle:"Priority alerts",riskSub:"Documents closest to expiry will appear here.",noRisk:"No urgent expiry risk detected.",simpleUploadTitle:"Simple document upload",simpleUploadText:"Upload the file, review the fields manually, then save. No hidden OCR magic yet.",cameraScan:"Camera Scan"}
};
function sx(k){return (SOLO_TX[lang]&&SOLO_TX[lang][k])||SOLO_TX.en[k]||k}
function applySoloLanguage(){
  const ids={soloBadge:'soloBadge',soloHeroTitle:'soloHeroTitle',soloHeroText:'soloHeroText',quickUploadBtn:'quickUpload',quickManualBtn:'quickManual',whatsappBadge:'whatsappBadge',whatsappTitle:'whatsappTitle',whatsappText:'whatsappText',riskTitle:'riskTitle',riskSub:'riskSub',/* upload duplicate removed in V22 */};
  Object.entries(ids).forEach(([id,key])=>{let el=document.getElementById(id);if(el)el.innerText=sx(key);});
}

const INTRO_TX={
  en:{introNav:"ATSRS Platform",introMainTitle:"Professional document, expiry and profile sharing platform",introMainText:"ATSRS helps professionals and organisations manage important documents, track expiry dates, share controlled profile links and support compliance workflows.",svc1Title:"Document Vault",svc1Text:"Store licences, certificates, permits, medical records, training proof, references and appraisals in one place.",svc2Title:"Easy Upload",svc2Text:"Upload PDF, JPG or PNG files and keep them linked to expiry dates and document status.",svc3Title:"Scan & Auto-fill",svc3Text:"Scan documents and let ATSRS prepare fields for manual confirmation when OCR is connected.",svc4Title:"Expiry Tracking",svc4Text:"See document totals and expiry alerts from a clear dashboard.",svc5Title:"Share Profile",svc5Text:"Share one controlled ATSRS profile link with employers, agencies and clients instead of many attachments.",svc6Title:"Company Compliance",svc6Text:"Companies can request access, review approved documents and import candidate records into their compliance profile.",compliance:"Compliance"}
};

const INTRO_DETAIL={
  en:{
  svc1:{title:"Document Vault",text:"Keep passport, visa, medical, seaman book, certificates, trainings, competency, references, appraisals and CV files in one secure workspace. Documents remain private until you decide to share them."},
  svc2:{title:"Easy Upload",text:"Upload PDF, JPG or PNG documents directly into ATSRS. Each file can be linked to document type, expiry date, status and future employer access rules."},
  svc3:{title:"Scan & Auto-fill",text:"Use camera scan to capture documents. When OCR is connected, ATSRS will prepare fields automatically, while the user still confirms details before saving."},
  svc4:{title:"Expiry Tracking",text:"Track valid, expiring, expired and missing documents from a clear dashboard. ATSRS is designed to highlight risks before they become mobilisation problems."},
  svc5:{title:"Share Profile",text:"Create one controlled ATSRS profile link for employers, agencies and clients. Instead of sending many email attachments, you can share a professional profile and approve access when needed."},
  svc6:{title:"Company Compliance",text:"Companies can request access, review approved documents and import candidate records into their own compliance profile. This supports faster checks and cleaner crew documentation workflows."}
 }
};
let currentIntroKey='svc1';
function setIntroDetail(key, updateActive=true){
 currentIntroKey=key||'svc1';
 const d=(INTRO_DETAIL[lang]&&INTRO_DETAIL[lang][currentIntroKey])||INTRO_DETAIL.en[currentIntroKey]||INTRO_DETAIL.en.svc1;
 const title=document.getElementById('introMainTitle'); if(title) title.innerText=d.title;
 const text=document.getElementById('introMainText'); if(text) text.innerText=d.text;
 if(updateActive){
  document.querySelectorAll('.intro-service-card').forEach(card=>card.classList.toggle('active',card.dataset.intro===currentIntroKey));
 }
}

function itx(k){return (INTRO_TX[lang]&&INTRO_TX[lang][k])||INTRO_TX.en[k]||k}
function applyIntroLanguage(){
 const map={navIntro:'introNav',introSvc1Title:'svc1Title',introSvc1Text:'svc1Text',introSvc2Title:'svc2Title',introSvc2Text:'svc2Text',introSvc3Title:'svc3Title',introSvc3Text:'svc3Text',introSvc4Title:'svc4Title',introSvc4Text:'svc4Text',introSvc5Title:'svc5Title',introSvc5Text:'svc5Text',introSvc6Title:'svc6Title',introSvc6Text:'svc6Text'};
 Object.entries(map).forEach(([id,key])=>{let el=document.getElementById(id); if(el)el.innerText=itx(key);});
 const c1=document.getElementById('compliancePageTitle'); if(c1) c1.innerText=itx('compliance');
 const c2=document.getElementById('complianceOverviewTitle'); if(c2) c2.innerText=itx('compliance');
 setIntroDetail(currentIntroKey||'svc1',false);
}

function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||"").trim())}
function emailMsg(){return EMAIL_MSG[lang]||EMAIL_MSG.en}
function markEmail(input,rule){if(!validEmail(input.value)){input.classList.add("input-error");rule.innerText=emailMsg();rule.classList.remove("hidden");return false}input.classList.remove("input-error");input.classList.add("input-ok");rule.classList.add("hidden");return true}
function clearEmailMark(input,rule){input.classList.remove("input-error","input-ok");rule.classList.add("hidden")}
function toggleLangMenu(){const m=document.getElementById("langMenu");if(m)m.classList.toggle("hidden")}
function toggleAppLangMenu(){const m=document.getElementById("appLangMenu");if(m)m.classList.toggle("hidden")}
document.addEventListener("click",e=>{if(!e.target.closest(".lang-floating")){const m=document.getElementById("langMenu");if(m)m.classList.add("hidden");const am=document.getElementById("appLangMenu");if(am)am.classList.add("hidden");}})

function changeLanguage(v){lang="en";try{localStorage.setItem("atsrs_lang","en")}catch(e){};const m=document.getElementById("langMenu");if(m)m.classList.add("hidden");const am=document.getElementById("appLangMenu");if(am)am.classList.add("hidden");applyLanguage();renderAll();applyLanguage()}
function applyLanguage(){
lang="en";try{localStorage.setItem("atsrs_lang","en")}catch(e){}
document.documentElement.lang="en";document.documentElement.dir="ltr";const lc=document.getElementById("langCircle");if(lc)lc.innerText=LANG_FLAGS[lang]||"🌐";const alc=document.getElementById("appLangCircle");if(alc)alc.innerText=LANG_FLAGS[lang]||"🌐";
authSubtitle.innerText=tr("sub");loginTitle.innerText=tr("login");loginEmail.placeholder=tr("email");loginPassword.placeholder=tr("password");loginEmailRule.innerText=emailMsg();loginBtn.innerText=tr("login");createBtn.innerText=tr("create");forgotBtn.innerText=tr("forgot");if(typeof modeRule!=="undefined")modeRule.innerText=modeMsg();
registerTitle.innerText=tr("registerTitle");regEmail.placeholder=tr("email");regEmailRule.innerText=emailMsg();regPassword.placeholder=tr("password");regPassword2.placeholder=tr("confirm");registerBtn.innerText=tr("register");backLoginBtn1.innerText=tr("back");passRule.innerText=tr("passRule");matchRule.innerText=tr("matchRule");
resetTitle.innerText=tr("resetTitle");resetInfo.innerText=tr("resetInfo");resetEmail.placeholder=tr("email");resetEmailRule.innerText=emailMsg();resetBtn.innerText=tr("sendReset");backLoginBtn2.innerText=tr("back");
newPassTitle.innerText=tr("newPass");newPassword.placeholder=tr("newPassword");newPassword2.placeholder=tr("confirmNew");saveNewPassBtn.innerText=tr("saveNew");
cabinetText.innerText=tr("cabinet");navDashboard.innerText=tr("dashboard");navPersonnel.innerText=tr("personnel");navCertificates.innerText=tr("certificates");navProfile.innerText=ptr("account");navLogout.innerText=tr("logout");if(typeof topLogoutBtn!=="undefined")topLogoutBtn.innerText=tr("logout");
totalPersonnelText.innerText=tr("totalPersonnel");totalCertsText.innerText=tr("totalCerts");exp90Text.innerText=tr("exp90");if(typeof exp30Text!=="undefined")exp30Text.innerText=tr("exp30");expiredText.innerText=tr("expired");if(typeof myDocumentsTitle!=="undefined"){myDocumentsTitle.innerText=tr("myDocuments");personalDashboardNote.innerText=tr("personalDashboardNote");personalScanBtn.innerText=tr("scanUpload");}
crewRegisterTitle.innerText=tr("crewRegister");
crewTabListBtn.innerText=tr("crewList");
crewTabAddBtn.innerText=tr("addCrew");
crewTabImportBtn.innerText=tr("importExcel");
crewTabProjectsBtn.innerText=tr("groupsProjects");
crewTabComplianceBtn.innerText=tr("complianceStatus");
crewSearch.placeholder=tr("searchCrew");
addPersonnelTitle.innerText=tr("addPersonnel");
pName.placeholder=tr("name");pSurname.placeholder=tr("surname");pPosition.placeholder=tr("position");pCompany.placeholder=tr("company");pEmail.placeholder=tr("email");pPhone.placeholder=tr("phone");
pNationality.placeholder=tr("nationality");pEmployeeId.placeholder=tr("employeeId");pProject.placeholder=tr("project");pVessel.placeholder=tr("vessel");
addPersonnelBtn.innerText=tr("addPersonnel");
thName1.innerText=tr("name");thSurname1.innerText=tr("surname");thPosition1.innerText=tr("position");thCompany1.innerText=tr("company");thPhone1.innerText=tr("phone");thCrewStatus.innerText=tr("crewStatus");thAction1.innerText=tr("action");
importExcelTitle.innerText=tr("importExcel");importExcelInfo.innerText=tr("importInfo");
projectsTitle.innerText=tr("projects");projectNameInput.placeholder=tr("project");vesselNameInput.placeholder=tr("vessel");clientNameInput.placeholder=tr("client");teamNameInput.placeholder=tr("team");addProjectBtn.innerText=tr("addProject");
thProject.innerText=tr("project");thVessel.innerText=tr("vessel");thClient.innerText=tr("client");thTeam.innerText=tr("team");thActionProject.innerText=tr("action");
complianceOverviewTitle.innerText=tr("complianceStatus");readyCrewText.innerText=tr("readyCrew");reviewCrewText.innerText=tr("reviewCrew");blockedCrewText.innerText=tr("blockedCrew");complianceNote.innerText=tr("complianceNote");
addDocTitle.innerText=ptr("addDoc");scanDocBtn.innerText=ptr("scanDoc");uploadDocBtn.innerText=ptr("uploadDoc");scanInfo.innerText=ptr("scanInfo");confirmInfoTitle.innerText=ptr("confirmInfo");autoDocNo.placeholder=ptr("docNo");autoProvider.placeholder=tr("provider");confirmInfoBtn.innerText=ptr("confirm");extractNote.innerText=ptr("extractNote");
manualCertTitle.innerText=ptr("manualCert");cProvider.placeholder=tr("provider");addCertBtn.innerText=tr("addCert");certRegisterTitle.innerText=tr("certRegister");thCertificate2.innerText=tr("certificate");thProvider2.innerText=tr("provider");thExpiry2.innerText=tr("expiry");thStatus2.innerText=tr("status");thAction2.innerText=tr("action");
accountTitle.innerText=ptr("account");accountTabGeneralBtn.innerText=ptr("general");accountTabSecurityBtn.innerText=ptr("security");accountTabPreferencesBtn.innerText=ptr("preferences");profileName.placeholder=tr("name");profileSurname.placeholder=tr("surname");profilePhone.placeholder=tr("phone");profileCompany.placeholder=tr("company");profilePosition.placeholder=tr("position");profileCountry.options[0].text=ptr("country");saveProfileBtn.innerText=tr("saveProfile");
profileAltEmail.placeholder=ptr("recoveryEmail");primaryEmailTitle.innerText=ptr("primaryEmail");primaryEmailNote.innerText=ptr("primaryEmailNote");primaryEmailBtn.innerText=ptr("change");changePasswordTitle.innerText=ptr("password");changePasswordNote.innerText=ptr("passwordNote");changePasswordBtn.innerText=ptr("change");twofaTitle.innerText=ptr("twofa");twofaNote.innerText=ptr("twofaNote");setup2faBtn.innerText=ptr("setup");sessionsTitle.innerText=ptr("sessions");sessionsNote.innerText=ptr("sessionsNote");viewSessionsBtn.innerText=ptr("view");
notifyTitle.innerText=ptr("notifications");notifyNote.innerText=ptr("notificationsNote");manageNotifyBtn.innerText=ptr("manage");exportDataTitle.innerText=ptr("exportData");exportDataNote.innerText=ptr("exportDataNote");exportDataBtn.innerText=ptr("export");deleteAccountTitle.innerText=ptr("deleteAccount");deleteAccountNote.innerText=ptr("deleteAccountNote");deleteAccountBtn.innerText=tr("delete");
if(currentUser){let active=document.querySelector(".nav button.active");pageTitle.innerText=active?active.innerText:tr("dashboard")}
applySoloLanguage();
applyIntroLanguage();
}

function hideAuthBoxes(){loginBox.classList.add("hidden");registerBox.classList.add("hidden");forgotBox.classList.add("hidden");newPasswordBox.classList.add("hidden")}
function showLogin(){hideAuthBoxes();loginBox.classList.remove("hidden")}
function showRegister(){hideAuthBoxes();registerBox.classList.remove("hidden")}
function showForgot(){hideAuthBoxes();forgotBox.classList.remove("hidden")}
loginEmail.addEventListener("input",()=>clearEmailMark(loginEmail,loginEmailRule));regEmail.addEventListener("input",()=>clearEmailMark(regEmail,regEmailRule));resetEmail.addEventListener("input",()=>clearEmailMark(resetEmail,resetEmailRule));
loginEmail.addEventListener("blur",()=>{if(loginEmail.value)markEmail(loginEmail,loginEmailRule)});regEmail.addEventListener("blur",()=>{if(regEmail.value)markEmail(regEmail,regEmailRule)});resetEmail.addEventListener("blur",()=>{if(resetEmail.value)markEmail(resetEmail,resetEmailRule)});
function validateRegisterFields(){let p1=regPassword.value.trim(),p2=regPassword2.value.trim(),ok=true;if(p1.length>0&&p1.length<6){regPassword.classList.add("input-error");passRule.classList.remove("hidden");ok=false}else{regPassword.classList.remove("input-error");passRule.classList.add("hidden")}if(p2.length>0&&p1!==p2){regPassword2.classList.add("input-error");matchRule.classList.remove("hidden");ok=false}else{regPassword2.classList.remove("input-error");matchRule.classList.add("hidden")}return ok}
regPassword.addEventListener("input",validateRegisterFields);regPassword2.addEventListener("input",validateRegisterFields);

async function register(){let email=regEmail.value.trim(),password=regPassword.value.trim(),password2=regPassword2.value.trim();regMsg.innerText="";if(!email||!password||!password2){regMsg.innerText=tr("fill");return}if(!markEmail(regEmail,regEmailRule)||!validateRegisterFields())return;if(!supabaseClient){regMsg.innerText="Supabase library did not load.";return}try{const {error}=await supabaseClient.auth.signUp({email,password,options:{emailRedirectTo:APP_URL}});regMsg.innerText=error?error.message:"Confirmation email sent. Check inbox/spam."}catch(e){regMsg.innerText=tr("connection")}}
async function login(){let email=loginEmail.value.trim(),password=loginPassword.value.trim();loginMsg.innerText="";if(!validateUseMode())return;if(!email||!password){loginMsg.innerText=tr("enterLogin");return}if(!markEmail(loginEmail,loginEmailRule))return;if(!supabaseClient){loginMsg.innerText="Supabase library did not load.";return}try{const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});if(error){loginMsg.innerText=error.message;return}localStorage.setItem("atsrs_use_mode",useMode);currentUser=data.user;openApp()}catch(e){loginMsg.innerText=tr("connection")}}
async function forgotPassword(){let email=resetEmail.value.trim();resetMsg.innerText="";if(!email){resetMsg.innerText=tr("enterLogin");return}if(!markEmail(resetEmail,resetEmailRule))return;if(!supabaseClient){resetMsg.innerText="Supabase library did not load.";return}try{const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:APP_URL});resetMsg.innerText=error?error.message:tr("sent")}catch(e){resetMsg.innerText=tr("connection")}}
async function updatePassword(){let p1=newPassword.value.trim(),p2=newPassword2.value.trim();if(!p1||!p2){newPassMsg.innerText=tr("fill");return}if(p1!==p2){newPassMsg.innerText=tr("matchRule");return}try{const {error}=await supabaseClient.auth.updateUser({password:p1});newPassMsg.innerText=error?error.message:"Password updated."}catch(e){newPassMsg.innerText=tr("connection")}}

let useMode="";
function modeMsg(){
  return "Select Personal or Corporate account to login.";
}
function clearModeError(){
  if(typeof modeChoiceBox!=="undefined") modeChoiceBox.classList.remove("mode-error");
  if(typeof modeRule!=="undefined") modeRule.classList.remove("active");
}
function validateUseMode(){
  if(useMode==="personal"||useMode==="company") return true;
  if(typeof modeChoiceBox!=="undefined") modeChoiceBox.classList.add("mode-error");
  if(typeof modeRule!=="undefined"){modeRule.innerText=modeMsg();modeRule.classList.add("active");}
  return false;
}
function setUseMode(mode){
useMode=mode;
localStorage.setItem("atsrs_use_mode",mode);
clearModeError();
if(typeof personalModeBtn!=="undefined"){
personalModeBtn.classList.toggle("active",mode==="personal");
companyModeBtn.classList.toggle("active",mode==="company");
}
}
function applyModeUI(){
let saved=localStorage.getItem("atsrs_use_mode")||useMode||"personal";
useMode=saved;
let personal=useMode==="personal";
if(typeof navPersonnel!=="undefined")navPersonnel.classList.toggle("hidden",personal);
document.querySelectorAll(".solo-personnel-card").forEach(el=>el.classList.toggle("hidden",personal));
if(typeof personalDashboardPanel!=="undefined")personalDashboardPanel.classList.toggle("hidden",!personal);
}

function localTestLogin(){if(!validateUseMode())return;currentUser={id:"local_test_user",email:"local-test@atsrs.com"};localStorage.setItem("atsrs_auth_mode","local");localStorage.setItem("atsrs_use_mode",useMode);openApp()}

function confirmLogout(){
  if(confirm("Are you sure you want to logout?")){ logout(); }
}

async function logout(){try{if(supabaseClient)await supabaseClient.auth.signOut()}catch(e){}localStorage.removeItem("atsrs_auth_mode");localStorage.removeItem("atsrs_current_page");location.reload()}
function localKey(n){return"atsrs_"+currentUser.id+"_"+n} function getData(n){return JSON.parse(localStorage.getItem(localKey(n)))||[]} function saveData(n,d){localStorage.setItem(localKey(n),JSON.stringify(d))}
function openApp(){
  auth.classList.add("hidden");
  app.classList.remove("hidden");
  userEmail.innerText=currentUser.email;
  loadProfile();
  applyModeUI();
  renderAll();
  applyLanguage();
  restoreCurrentPage();
  setIntroDetail(currentIntroKey||'svc1');
  document.body.classList.remove("atsrs-booting");
}
function showPage(page,btn){if((localStorage.getItem("atsrs_use_mode")||useMode)==="personal"&&page==="personnel"){page="dashboard";btn=navDashboard;}localStorage.setItem("atsrs_current_page",page);document.querySelectorAll("main section").forEach(s=>s.classList.add("hidden"));document.getElementById(page+"Page").classList.remove("hidden");document.querySelectorAll(".nav button").forEach(b=>b.classList.remove("active"));btn.classList.add("active");pageTitle.innerText=btn.innerText;renderAll()}
function restoreCurrentPage(){let page=localStorage.getItem("atsrs_current_page")||"intro";let map={intro:navIntro,dashboard:navDashboard,personnel:navPersonnel,certificates:navCertificates,refs:navRefs,compliance:navCompliance,reports:navReports,profile:navProfile};showPage(map[page]?page:"intro",map[page]||navIntro)}
function showAccountTab(tab){["general","security","preferences"].forEach(x=>{document.getElementById("account"+cap(x)+"Tab").classList.remove("active");document.getElementById("accountTab"+cap(x)+"Btn").classList.remove("active")});document.getElementById("account"+cap(tab)+"Tab").classList.add("active");document.getElementById("accountTab"+cap(tab)+"Btn").classList.add("active")}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}

function showPersonnelTab(tab){
["list","add","import","projects","compliance"].forEach(x=>{
document.getElementById("crew"+cap(x)+"Tab").classList.remove("active");
document.getElementById("crewTab"+cap(x)+"Btn").classList.remove("active");
});
document.getElementById("crew"+cap(tab)+"Tab").classList.add("active");
document.getElementById("crewTab"+cap(tab)+"Btn").classList.add("active");
}
function crewComplianceStatus(name){
let certs=getData("certs").filter(c=>c.person===name);
if(!certs.length)return {key:"review",text:tr("review"),cls:"badge-review"};
let hasExpired=certs.some(c=>status(c.expiry).expired);
let hasRisk=certs.some(c=>status(c.expiry).risk);
if(hasExpired)return {key:"blocked",text:tr("blocked"),cls:"badge-blocked"};
if(hasRisk)return {key:"review",text:tr("review"),cls:"badge-review"};
return {key:"ready",text:tr("ready"),cls:"badge-ready"};
}
function fillCrewFilters(personnel){
let currentCompany=crewCompanyFilter.value,currentPosition=crewPositionFilter.value,currentStatus=crewStatusFilter.value;
let companies=[...new Set(personnel.map(x=>x.company).filter(Boolean))];
let positions=[...new Set(personnel.map(x=>x.position).filter(Boolean))];
crewCompanyFilter.innerHTML=`<option value="">${tr("allCompanies")}</option>`+companies.map(x=>`<option>${x}</option>`).join("");
crewPositionFilter.innerHTML=`<option value="">${tr("allPositions")}</option>`+positions.map(x=>`<option>${x}</option>`).join("");
crewStatusFilter.innerHTML=`<option value="">${tr("allStatuses")}</option><option value="ready">${tr("ready")}</option><option value="review">${tr("review")}</option><option value="blocked">${tr("blocked")}</option>`;
crewCompanyFilter.value=currentCompany;crewPositionFilter.value=currentPosition;crewStatusFilter.value=currentStatus;
}
function handleExcelImport(e){
let file=e.target.files&&e.target.files[0];
if(!file)return;
excelPreview.innerText=tr("fileSelected")+": "+file.name+" ("+Math.round(file.size/1024)+" KB). "+tr("importInfo");
}
function getProjects(){return JSON.parse(localStorage.getItem(localKey("projects")))||[]}
function saveProjects(d){localStorage.setItem(localKey("projects"),JSON.stringify(d))}
function addProject(){
let d=getProjects();
if(!projectNameInput.value.trim()){alert(v12("fill")||tr("fill"));return}
d.push({project:projectNameInput.value,vessel:vesselNameInput.value,client:clientNameInput.value,team:teamNameInput.value});
saveProjects(d);projectNameInput.value=vesselNameInput.value=clientNameInput.value=teamNameInput.value="";renderProjects();
}
function deleteProject(i){let d=getProjects();d.splice(i,1);saveProjects(d);renderProjects()}
function renderProjects(){
let d=getProjects();projectsTable.innerHTML="";
d.forEach((x,i)=>projectsTable.innerHTML+=`<tr><td>${x.project||""}</td><td>${x.vessel||""}</td><td>${x.client||""}</td><td>${x.team||""}</td><td><button class="action" onclick="deleteProject(${i})">${tr("delete")}</button></td></tr>`);
}

function addPersonnel(){let a=getData("personnel");if(!pName.value.trim()){alert(v12("fill")||tr("fill"));return}a.push({name:pName.value,surname:pSurname.value,position:pPosition.value,company:pCompany.value,email:pEmail.value,phone:pPhone.value,nationality:pNationality.value,employeeId:pEmployeeId.value,project:pProject.value,vessel:pVessel.value});saveData("personnel",a);pName.value=pSurname.value=pPosition.value=pCompany.value=pEmail.value=pPhone.value=pNationality.value=pEmployeeId.value=pProject.value=pVessel.value="";renderAll();showPersonnelTab("list")}
function deletePersonnel(i){let a=getData("personnel");a.splice(i,1);saveData("personnel",a);renderAll()}
function startCameraScan(){scanBox.classList.remove("hidden");confirmBox.classList.add("hidden");documentPreview.innerText="";cameraInput.click()}

async function handleDocumentUpload(e){
let file=e.target.files&&e.target.files[0];
if(!file)return;
scanBox.classList.remove("hidden");
confirmBox.classList.remove("hidden");
documentPreview.innerText=v12("fileSelected")+": "+file.name+" ("+Math.round(file.size/1024)+" KB)";
ocrProgress.innerText=v12("ocrStarting");
autoDocNo.value=autoProvider.value=autoIssue.value=autoExpiry.value="";
let fn=file.name.toUpperCase();
if(fn.includes("PASSPORT"))autoDocType.value="Passport";
else if(fn.includes("SEAMAN"))autoDocType.value="Seaman Book";
else if(fn.includes("BOSIET")||fn.includes("FOET"))autoDocType.value="BOSIET / FOET";
else if(fn.includes("MEDICAL"))autoDocType.value="Professional Medical";
else if(fn.includes("VISA"))autoDocType.value="Visa";
if(!window.Tesseract){
ocrProgress.innerText=v12("ocrNotAvailable")+" "+v12("ocrManual");
return;
}
try{
const result=await Tesseract.recognize(file,"eng",{
logger:m=>{if(m.status&&typeof m.progress==="number"){ocrProgress.innerText=v12("ocrProgress")+": "+m.status+" "+Math.round(m.progress*100)+"%";}}
});
let text=(result&&result.data&&result.data.text)||"";
if(!text.trim()){ocrProgress.innerText=v12("noTextDetected")+" "+v12("ocrManual");return;}
autoFillFromOCR(text);
}catch(err){
console.error("OCR failed:",err);
ocrProgress.innerText=v12("noTextDetected")+" "+v12("ocrManual");
}
}

function autoFillFromOCR(text){
ocrRawText.value=text||"";
let clean=(text||"").replace(/\s+/g," ").trim();
let upper=clean.toUpperCase();

if(upper.includes("PASSPORT")) autoDocType.value="Passport";
else if(upper.includes("SEAMAN")) autoDocType.value="Seaman Book";
else if(upper.includes("BOSIET")||upper.includes("FOET")) autoDocType.value="BOSIET / FOET";
else if(upper.includes("MEDICAL")||upper.includes("FITNESS")) autoDocType.value="Professional Medical";
else if(upper.includes("VISA")) autoDocType.value="Visa";
else if(upper.includes("YELLOW FEVER")) autoDocType.value="Yellow Fever";

let docPatterns=[
/(?:PASSPORT|DOCUMENT|CERTIFICATE|BOOK|NO|NUMBER|№|N)\s*[:\-]?\s*([A-Z0-9]{6,12})/i,
/\b([A-Z]{1,3}[0-9]{5,9})\b/,
/\b([0-9]{7,10})\b/
];
for(let r of docPatterns){
let m=upper.match(r);
if(m){autoDocNo.value=m[1]||m[0];break;}
}

let dates=[];
let monthMap={JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12};
let re1=/\b(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})\b/g,m;
while((m=re1.exec(clean))!==null){pushDate(dates,m[3],m[2],m[1]);}
let re2=/\b(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})\b/g;
while((m=re2.exec(clean))!==null){pushDate(dates,m[1],m[2],m[3]);}
let re3=/\b(\d{1,2})\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s*(\d{2,4})\b/gi;
while((m=re3.exec(clean))!==null){pushDate(dates,m[3],monthMap[m[2].toUpperCase().slice(0,3)],m[1]);}
dates=[...new Map(dates.map(d=>[d.toISOString().slice(0,10),d])).values()].sort((a,b)=>a-b);
if(dates.length===1){autoExpiry.value=formatDateInput(dates[0]);}
if(dates.length>1){autoIssue.value=formatDateInput(dates[0]);autoExpiry.value=formatDateInput(dates[dates.length-1]);}

let providerMatch=clean.match(/(OPITO|BOSIET|FOET|STCW|ENG1|OGUK|NOGEPA|IMCA|DNV|ABS|BV|MCA|BAHAMAS|LUXEMBOURG)/i);
if(providerMatch) autoProvider.value=providerMatch[0].toUpperCase();

if(!autoDocNo.value && !autoExpiry.value && !autoProvider.value){
ocrProgress.innerText=v12("ocrManual");
}else{
ocrProgress.innerText=v12("ocrDone");
}
}
function pushDate(arr,y,mo,d){
y=parseInt(y);mo=parseInt(mo);d=parseInt(d);
if(y<100)y+=2000;
if(d>=1&&d<=31&&mo>=1&&mo<=12&&y>=2000&&y<=2100)arr.push(new Date(Date.UTC(y,mo-1,d)));
}

function formatDateInput(dt){
let y=dt.getUTCFullYear();
let m=String(dt.getUTCMonth()+1).padStart(2,"0");
let d=String(dt.getUTCDate()).padStart(2,"0");
return y+"-"+m+"-"+d;
}

function soloOwnerName(){return currentUser?.email || "My Documents"}
function isPersonalMode(){return (localStorage.getItem("atsrs_use_mode")||useMode)==="personal"}
function clearAutoValidation(){
  [autoPerson,autoDocType,autoExpiry].forEach(el=>el&&el.classList.remove("required-missing"));
  if(typeof autoFormAlert!=="undefined"){autoFormAlert.classList.remove("active");autoFormAlert.innerText="";}
}
function validateAutoConfirmForm(){
  clearAutoValidation();
  let ok=true;
  if(!isPersonalMode() && !autoPerson.value){autoPerson.classList.add("required-missing");ok=false;}
  if(!autoDocType.value){autoDocType.classList.add("required-missing");ok=false;}
  if(!autoExpiry.value){autoExpiry.classList.add("required-missing");ok=false;}
  if(!ok && typeof autoFormAlert!=="undefined"){autoFormAlert.innerText=v24("requiredMsg");autoFormAlert.classList.add("active");}
  return ok;
}
function confirmExtractedDocument(){if(!validateAutoConfirmForm())return;let person=isPersonalMode()?soloOwnerName():autoPerson.value;let a=getData("certs");a.push({person,type:autoDocType.value,provider:autoProvider.value,expiry:autoExpiry.value,docNo:autoDocNo.value,issue:autoIssue.value});saveData("certs",a);confirmBox.classList.add("hidden");documentPreview.innerText="";renderAll()}
function addCertificate(){
let a=getData("certs");
let person=isPersonalMode()?soloOwnerName():cPerson.value;
if(!validateManualCertificateForm() || !person){return}
a.push({person,type:cType.value,docNo:(cDocNo?.value||""),country:(cCountry?.value||""),provider:cProvider.value,issue:cIssue.value,expiry:cExpiry.value});
saveData("certs",a);
cProvider.value="";cIssue.value="";cExpiry.value="";if(typeof cDocNo!=="undefined")cDocNo.value="";if(typeof cCountry!=="undefined")cCountry.value="";
clearManualValidation();
renderAll();
}
function deleteCert(i){let a=getData("certs");a.splice(i,1);saveData("certs",a);renderAll()}
function status(expiry){let t=new Date();t.setHours(0,0,0,0);let e=new Date(expiry);let d=Math.ceil((e-t)/(86400000));if(d<0)return{txt:tr("expired"),cls:"danger",expired:true,risk:true,days:d};if(d<=30)return{txt:tr("exp30s"),cls:"danger",risk:true,days:d};if(d<=90)return{txt:tr("exp90s"),cls:"warning",risk:true,days:d};return{txt:tr("valid"),cls:"good",risk:false,days:d}}

function renderRiskList(certs){
  if(typeof riskList==="undefined"||!riskList)return;
  let items=certs.map(x=>({x,s:status(x.expiry)})).filter(o=>o.s.expired||o.s.days<=90).sort((a,b)=>a.s.days-b.s.days).slice(0,5);
  if(!items.length){riskList.innerHTML=`<div class="risk-item"><b>${sx("noRisk")}</b><span>OK</span></div>`;return;}
  riskList.innerHTML=items.map(o=>`<div class="risk-item"><div><b>${o.x.person||"-"}</b><br><span>${o.x.type||""} • ${o.x.expiry||""}</span></div><div class="${o.s.expired?'danger':o.s.cls}">${o.s.txt}</div></div>`).join("");
}

function renderAll(){
if(!currentUser)return;
let p=getData("personnel"),c=getData("certs");
totalPersonnel.innerText=p.length;totalCerts.innerText=c.length;
fillCrewFilters(p);
let q=(crewSearch?.value||"").toLowerCase();
let company=crewCompanyFilter?.value||"",position=crewPositionFilter?.value||"",stf=crewStatusFilter?.value||"";
personnelTable.innerHTML="";
if(isPersonalMode()){
  cPerson.innerHTML=`<option>${soloOwnerName()}</option>`;
  autoPerson.innerHTML=`<option>${soloOwnerName()}</option>`;
  cPerson.classList.add("hidden");
  autoPerson.classList.add("hidden");if(typeof autoPersonWrap!=="undefined")autoPersonWrap.classList.add("hidden");
}else{
  cPerson.innerHTML=`<option value="">${tr("selectCrew")}</option>`;
  autoPerson.innerHTML=`<option value="">${tr("selectCrew")}</option>`;
  cPerson.classList.remove("hidden");
  autoPerson.classList.remove("hidden");if(typeof autoPersonWrap!=="undefined")autoPersonWrap.classList.remove("hidden");
}
let ready=0,review=0,blocked=0;
p.forEach((x,i)=>{
let full=((x.name||"")+" "+(x.surname||"")).trim();
let st=crewComplianceStatus(full);
if(st.key==="ready")ready++; if(st.key==="review")review++; if(st.key==="blocked")blocked++;
let hay=[x.name,x.surname,x.position,x.company,x.email,x.phone,x.nationality,x.employeeId,x.project,x.vessel].join(" ").toLowerCase();
if(q&&!hay.includes(q))return;
if(company&&x.company!==company)return;
if(position&&x.position!==position)return;
if(stf&&st.key!==stf)return;
personnelTable.innerHTML+=`<tr><td>${x.name||""}</td><td>${x.surname||""}</td><td>${x.position||""}</td><td>${x.company||""}</td><td>${x.email||""}</td><td>${x.phone||""}</td><td><span class="badge ${st.cls}">${st.text}</span></td><td><button class="action" onclick="deletePersonnel(${i})">${tr("delete")}</button></td></tr>`;
if(!isPersonalMode()){cPerson.innerHTML+=`<option>${full}</option>`;autoPerson.innerHTML+=`<option>${full}</option>`;}
});
readyCrew.innerText=ready;reviewCrew.innerText=review;blockedCrew.innerText=blocked;
certTable.innerHTML="";let e90=0,e30=0,ex=0;
c.forEach((x,i)=>{let s=status(x.expiry);if(s.risk&&!s.expired)e90++;if(!s.expired&&s.days<=30)e30++;if(s.expired)ex++;certTable.innerHTML+=`<tr><td>${x.type}</td><td>${x.provider||""}</td><td>${x.expiry}</td><td class="${s.cls}">${s.txt}</td><td><button class="action" onclick="deleteCert(${i})">${tr("delete")}</button></td></tr>`});
exp90.innerText=e90;if(typeof exp30!=="undefined")exp30.innerText=e30;expired.innerText=ex;
renderRiskList(c);
renderProjects();
}

const countries=["","Azerbaijan","Turkey","Norway","United Kingdom","United States","Canada","Germany","France","Spain","Portugal","Italy","Netherlands","Belgium","Denmark","Sweden","Finland","Poland","Romania","Bulgaria","Georgia","Kazakhstan","United Arab Emirates","Saudi Arabia","Qatar","Kuwait","Oman","Bahrain","India","Pakistan","Philippines","Indonesia","Malaysia","Singapore","China","Japan","South Korea","Australia","New Zealand","South Africa","Equatorial Guinea","Angola","Nigeria","Ghana","Egypt","Morocco","Brazil","Mexico","Argentina"];
function fillCountries(){profileCountry.innerHTML="";countries.forEach(c=>{let o=document.createElement("option");o.value=c;o.text=c;profileCountry.appendChild(o)})}
function saveProfile(){localStorage.setItem(localKey("profile"),JSON.stringify({name:profileName.value,surname:profileSurname.value,phone:profilePhone.value,country:profileCountry.value,company:profileCompany.value,position:profilePosition.value,altEmail:profileAltEmail.value,timezone:profileTimezone.value}));alert("Profile saved.")}
function loadProfile(){fillCountries();let p=JSON.parse(localStorage.getItem(localKey("profile")))||{};profileName.value=p.name||"";profileSurname.value=p.surname||"";profilePhone.value=p.phone||"";profileCountry.value=p.country||"";profileCompany.value=p.company||"";profilePosition.value=p.position||"";profileAltEmail.value=p.altEmail||"";profileTimezone.value=p.timezone||"UTC"}
function exportLocalData(){let data={profile:JSON.parse(localStorage.getItem(localKey("profile")))||{},personnel:getData("personnel"),certificates:getData("certs")};let blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});let url=URL.createObjectURL(blob);let a=document.createElement("a");a.href=url;a.download="atsrs-data-export.json";a.click();URL.revokeObjectURL(url)}

if(localStorage.getItem("atsrs_auth_mode")==="local"){currentUser={id:"local_test_user",email:"local-test@atsrs.com"};openApp()}else if(supabaseClient){supabaseClient.auth.onAuthStateChange(e=>{if(e==="PASSWORD_RECOVERY"){hideAuthBoxes();newPasswordBox.classList.remove("hidden")}});supabaseClient.auth.getSession().then(({data})=>{if(data.session){currentUser=data.session.user;openApp()}})}
function v12(k){
  return (T[lang]&&T[lang][k]) || (UI[lang]&&UI[lang][k]) || T.en[k] || UI.en[k] || k;
}
const V23_TEXT={
  en:{addDoc:"Add Certificate",flowNote:"Choose one clean path: scan for auto-fill, or upload and enter details manually.",scanTab:"Scan & Auto-fill",manualTab:"Upload / Manual Entry",scanFlow:"Use camera or file upload for OCR-assisted auto-fill, then confirm before saving.",manualFlow:"Upload the file for record keeping, then enter certificate details manually.",manualUpload:"Upload File"}
};
function v23(k){return (V23_TEXT[lang]&&V23_TEXT[lang][k])||V23_TEXT.en[k]||k}
function applyV23Language(){
  if(typeof addDocTitle!=="undefined")addDocTitle.innerText=v23("addDoc");
  if(typeof addCertFlowNote!=="undefined")addCertFlowNote.innerText=v23("flowNote");
  if(typeof certScanModeBtn!=="undefined")certScanModeBtn.innerText=v23("scanTab");
  if(typeof certManualModeBtn!=="undefined")certManualModeBtn.innerText=v23("manualTab");
  if(typeof scanFlowText!=="undefined")scanFlowText.innerText=v23("scanFlow");
  if(typeof manualFlowText!=="undefined")manualFlowText.innerText=v23("manualFlow");
  if(typeof manualUploadBtn!=="undefined")manualUploadBtn.innerText=v23("manualUpload");
}
function showCertMode(mode){
  if(typeof certScanPanel==="undefined")return;
  const scan=mode!=="manual";
  certScanPanel.classList.toggle("active",scan);
  certManualPanel.classList.toggle("active",!scan);
  certScanModeBtn.classList.toggle("active",scan);
  certManualModeBtn.classList.toggle("active",!scan);
}
function handleManualFile(e){
  let file=e.target.files&&e.target.files[0];
  if(!file)return;
  manualFilePreview.innerText=(tr("fileSelected")||"File selected")+": "+file.name+" ("+Math.round(file.size/1024)+" KB)";
}
const applyLanguageBaseV23=applyLanguage;
applyLanguage=function(){applyLanguageBaseV23();applyV23Language();}
const V24_TEXT={
  en:{requiredMsg:"Please complete all required fields.",certificateType:"Document Type",providerOptional:"Provider / Issuer (Optional)",issueOptional:"Issue Date (Optional)",expiryRequired:"Expiry Date",required:"Required",personRequired:"Crew Member",docNoOptional:"Document / Certificate No (Optional)",countryOptional:"Country / Authority (Optional)"}
};
function v24(k){return (V24_TEXT[lang]&&V24_TEXT[lang][k])||V24_TEXT.en[k]||k}
function applyV24Language(){
  if(typeof cTypeLabel!=="undefined")cTypeLabel.innerHTML='<span class="req-star">*</span>'+v24("certificateType");
  if(typeof cProviderLabel!=="undefined")cProviderLabel.innerText=v24("providerOptional");
  if(typeof cIssueLabel!=="undefined")cIssueLabel.innerText=v24("issueOptional");
  if(typeof cExpiryLabel!=="undefined")cExpiryLabel.innerHTML='<span class="req-star">*</span>'+v24("expiryRequired");
  if(typeof autoPersonLabel!=="undefined")autoPersonLabel.innerHTML='<span class="req-star">*</span>'+v24("personRequired");
  if(typeof autoDocTypeLabel!=="undefined")autoDocTypeLabel.innerHTML='<span class="req-star">*</span>'+v24("certificateType");
  if(typeof autoDocNoLabel!=="undefined")autoDocNoLabel.innerText=v24("docNoOptional");
  if(typeof autoProviderLabel!=="undefined")autoProviderLabel.innerText=v24("providerOptional");
  if(typeof autoIssueLabel!=="undefined")autoIssueLabel.innerText=v24("issueOptional");
  if(typeof autoExpiryLabel!=="undefined")autoExpiryLabel.innerHTML='<span class="req-star">*</span>'+v24("expiryRequired");
  if(typeof manualFormAlert!=="undefined" && manualFormAlert.classList.contains("active"))manualFormAlert.innerText=v24("requiredMsg");
  if(typeof autoFormAlert!=="undefined" && autoFormAlert.classList.contains("active"))autoFormAlert.innerText=v24("requiredMsg");
}
function clearManualValidation(){
  [cType,cExpiry].forEach(el=>el&&el.classList.remove("required-missing"));
  if(typeof manualFormAlert!=="undefined"){manualFormAlert.classList.remove("active");manualFormAlert.innerText="";}
}
function validateManualCertificateForm(){
  clearManualValidation();
  let ok=true;
  if(!cType.value){cType.classList.add("required-missing");ok=false;}
  if(!cExpiry.value){cExpiry.classList.add("required-missing");ok=false;}
  if(!ok && typeof manualFormAlert!=="undefined"){manualFormAlert.innerText=v24("requiredMsg");manualFormAlert.classList.add("active");}
  return ok;
}
["cType","cExpiry"].forEach(id=>{setTimeout(()=>{let el=document.getElementById(id);if(el){el.addEventListener("input",()=>el.classList.remove("required-missing"));el.addEventListener("change",()=>el.classList.remove("required-missing"));}},0)});
["autoPerson","autoDocType","autoExpiry"].forEach(id=>{setTimeout(()=>{let el=document.getElementById(id);if(el){el.addEventListener("input",()=>{el.classList.remove("required-missing");if(typeof autoFormAlert!=="undefined")autoFormAlert.classList.remove("active");});el.addEventListener("change",()=>{el.classList.remove("required-missing");if(typeof autoFormAlert!=="undefined")autoFormAlert.classList.remove("active");});}},0)});
const applyLanguageBaseV24=applyLanguage;
applyLanguage=function(){applyLanguageBaseV24();applyV24Language();}
const V25_TEXT={
  en:{documents:"Documents",refs:"References & Appraisals",compliance:"Compliance",reports:"Reports",totalDocuments:"Total Documents",missingDocuments:"Missing Documents",docStatus:"Document Status",docStatusSub:"Required career documents are tracked here.",heroPersonal:"Your career compliance vault",heroCompany:"Crew compliance control center",heroPersonalText:"Track passport, visa, medical, seaman book, certificates, trainings, competency and references from one dashboard.",heroCompanyText:"Manage personnel documents, expiry risk and missing compliance items from one clean dashboard.",docNoOptional:"Document / Certificate No (Optional)",countryOptional:"Country / Authority (Optional)",refsTitle:"References & Appraisals",refsSub:"Keep appraisal forms, reference letters and client feedback in one place.",appraisals:"Appraisals",appraisalsText:"Upload annual appraisals, performance reviews and evaluation forms.",references:"References",referencesText:"Store reference letters and contact-ready career proof.",uploadAppraisal:"Upload",uploadReference:"Upload",compliancePageSub:"Company mode: see who is ready, expiring, expired or missing required documents.",reportsSub:"Export-ready reports will be connected with backend data.",documentRegister:"Document Register"}
};
const V25_REQUIRED_DOCS=["Passport","Visa","Seaman Book","Medical","Certificate","Training","Competency","Appraisal","Reference"];
function v25(k){return (V25_TEXT[lang]&&V25_TEXT[lang][k])||V25_TEXT.en[k]||k}
function normalizeDocType(t){t=String(t||"").toLowerCase();if(t.includes("passport"))return"Passport";if(t.includes("visa"))return"Visa";if(t.includes("seaman"))return"Seaman Book";if(t.includes("medical"))return"Medical";if(t.includes("training")||t.includes("bosiet")||t.includes("foet")||t.includes("yellow"))return"Training";if(t.includes("competency")||t.includes("rov"))return"Competency";if(t.includes("appraisal"))return"Appraisal";if(t.includes("reference"))return"Reference";if(t.includes("certificate")||t.includes("dp"))return"Certificate";return t?"Other Document":""}
function missingDocCountForCerts(certs){let have=new Set(certs.map(x=>normalizeDocType(x.type)).filter(Boolean));return V25_REQUIRED_DOCS.filter(x=>!have.has(x)).length}
function renderV25DocumentStatus(){
  if(typeof docCategoryGrid==="undefined")return;
  let c=getData("certs");
  let have=new Set(c.map(x=>normalizeDocType(x.type)).filter(Boolean));
  docCategoryGrid.innerHTML=V25_REQUIRED_DOCS.map(d=>`<div class="doc-chip ${have.has(d)?'ok':'miss'}">${have.has(d)?'✓':'!'} ${d}</div>`).join("");
  if(typeof companyComplianceGrid!=="undefined"){
    let p=getData("personnel");
    if(isPersonalMode()){companyComplianceGrid.innerHTML=`<div class="doc-chip">${v25('compliancePageSub')}</div>`;}
    else{companyComplianceGrid.innerHTML=p.length?p.map(x=>{let full=((x.name||'')+' '+(x.surname||'')).trim();let certs=c.filter(y=>y.person===full);let miss=missingDocCountForCerts(certs);return `<div class="doc-chip ${miss?'miss':'ok'}"><b>${full||'-'}</b><br>${v25('missingDocuments')}: ${miss}</div>`}).join(''):`<div class="doc-chip miss">${v25('missingDocuments')}: 0 personnel</div>`;}
  }
}
function applyV25Mode(){
  const personal=isPersonalMode();
  document.body.classList.toggle('personal-mode',personal);document.body.classList.toggle('company-mode',!personal);
  if(typeof soloBadge!=="undefined")soloBadge.innerText=personal?'PERSONAL MODE':'COMPANY MODE';
}
function applyV25Language(){
  applyV25Mode();
  if(typeof navCertificates!=="undefined")navCertificates.innerText=v25('documents');
  if(typeof navRefs!=="undefined")navRefs.innerText=v25('refs');
  if(typeof navCompliance!=="undefined")navCompliance.innerText=v25('compliance');
  if(typeof navReports!=="undefined")navReports.innerText=v25('reports');
  if(typeof totalCertsText!=="undefined")totalCertsText.innerText=v25('totalDocuments');
  if(typeof missingDocsText!=="undefined")missingDocsText.innerText=v25('missingDocuments');
  if(typeof docStatusTitle!=="undefined")docStatusTitle.innerText=v25('docStatus');
  if(typeof docStatusSub!=="undefined")docStatusSub.innerText=v25('docStatusSub');
  if(typeof soloHeroTitle!=="undefined")soloHeroTitle.innerText=isPersonalMode()?v25('heroPersonal'):v25('heroCompany');
  if(typeof soloHeroText!=="undefined")soloHeroText.innerText=isPersonalMode()?v25('heroPersonalText'):v25('heroCompanyText');
  if(typeof cDocNoLabel!=="undefined")cDocNoLabel.innerText=v25('docNoOptional');
  if(typeof cCountryLabel!=="undefined")cCountryLabel.innerText=v25('countryOptional');
  if(typeof certRegisterTitle!=="undefined")certRegisterTitle.innerText=v25('documentRegister');
  if(typeof refsTitle!=="undefined")refsTitle.innerText=v25('refsTitle');
  if(typeof refsSub!=="undefined")refsSub.innerText=v25('refsSub');
  if(typeof appraisalCardTitle!=="undefined")appraisalCardTitle.innerText=v25('appraisals');
  if(typeof appraisalCardText!=="undefined")appraisalCardText.innerText=v25('appraisalsText');
  if(typeof referenceCardTitle!=="undefined")referenceCardTitle.innerText=v25('references');
  if(typeof referenceCardText!=="undefined")referenceCardText.innerText=v25('referencesText');
  if(typeof uploadAppraisalBtn!=="undefined")uploadAppraisalBtn.innerText=v25('uploadAppraisal');
  if(typeof uploadReferenceBtn!=="undefined")uploadReferenceBtn.innerText=v25('uploadReference');
  if(typeof compliancePageTitle!=="undefined")compliancePageTitle.innerText=v25('compliance');
  if(typeof compliancePageSub!=="undefined")compliancePageSub.innerText=v25('compliancePageSub');
  if(typeof reportsTitle!=="undefined")reportsTitle.innerText=v25('reports');
  if(typeof reportsSub!=="undefined")reportsSub.innerText=v25('reportsSub');
}
const setUseModeBaseV25=setUseMode;setUseMode=function(mode){setUseModeBaseV25(mode);applyV25Mode();applyV25Language();renderAll();}
const renderAllBaseV25=renderAll;renderAll=function(){renderAllBaseV25();let c=getData("certs");if(typeof missingDocs!=="undefined")missingDocs.innerText=missingDocCountForCerts(c);renderV25DocumentStatus();}
const applyLanguageBaseV25=applyLanguage;applyLanguage=function(){applyLanguageBaseV25();applyV25Language();renderV25DocumentStatus();}
const V48_TEXT={
  en:{cvStatus:"CV Status",cvAvailable:"Available ✓",cvMissing:"Missing ⚠",cvTitle:"CV / Resume",cvText:"Store, manage and share professional CV versions for employers, agencies and clients.",cvUploaded:"CV Uploaded ✓",cvNotUploaded:"No CV Uploaded",uploadCV:"Upload CV",previewCV:"Preview CV",downloadCV:"Download CV",deleteCV:"Delete CV",cvBetaBadge:"COMING SOON",cvBetaTitle:"Generate ATSRS Profile CV",cvBetaText:"Generate a professional ATSRS formatted CV using stored profile and document data.",generateCV:"Generate ATSRS CV (Beta)",cvComingSoon:"ATSRS Profile CV generator will be connected in a later build.",cvNoFile:"No CV uploaded yet.",cvSaved:"CV saved",cvDeleted:"CV deleted."}
};
function v48(k){return (V48_TEXT[lang]&&V48_TEXT[lang][k])||V48_TEXT.en[k]||k}
function getCV(){let a=getData('cvFiles');return Array.isArray(a)&&a.length?a[0]:null}
function saveCV(cv){saveData('cvFiles',cv?[cv]:[])}
function handleCVUpload(event){
  const file=event.target.files&&event.target.files[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=function(){saveCV({name:file.name,type:file.type||'application/octet-stream',size:file.size,updated:new Date().toISOString(),data:reader.result});renderCVStatus();renderAll();};
  reader.readAsDataURL(file);
}
function previewCV(){const cv=getCV(); if(!cv){alert(v48('cvNoFile'));return;} const w=window.open('','_blank'); if(w){w.document.write(`<title>${cv.name}</title><iframe src="${cv.data}" style="border:0;width:100%;height:100vh"></iframe>`);w.document.close();}}
function downloadCV(){const cv=getCV(); if(!cv){alert(v48('cvNoFile'));return;} const a=document.createElement('a');a.href=cv.data;a.download=cv.name||'ATSRS-CV';document.body.appendChild(a);a.click();a.remove();}
function deleteCV(){const cv=getCV(); if(!cv){alert(v48('cvNoFile'));return;} saveCV(null); if(typeof cvUploadInput!=='undefined')cvUploadInput.value=''; renderCVStatus(); renderAll();}
function renderCVStatus(){
  const cv=getCV();
  if(typeof cvCardTitle!=='undefined')cvCardTitle.innerText=v48('cvTitle');
  if(typeof cvCardText!=='undefined')cvCardText.innerText=v48('cvText');
  if(typeof uploadCVBtn!=='undefined')uploadCVBtn.innerText=v48('uploadCV');
  if(typeof previewCVBtn!=='undefined')previewCVBtn.innerText=v48('previewCV');
  if(typeof downloadCVBtn!=='undefined')downloadCVBtn.innerText=v48('downloadCV');
  if(typeof deleteCVBtn!=='undefined')deleteCVBtn.innerText=v48('deleteCV');
  if(typeof cvBetaBadge!=='undefined')cvBetaBadge.innerText=v48('cvBetaBadge');
  if(typeof cvBetaTitle!=='undefined')cvBetaTitle.innerText=v48('cvBetaTitle');
  if(typeof cvBetaText!=='undefined')cvBetaText.innerText=v48('cvBetaText');
  if(typeof generateCVBtn!=='undefined')generateCVBtn.innerText=v48('generateCV');
  if(typeof cvStatusBadge!=='undefined'){cvStatusBadge.innerText=cv?v48('cvUploaded'):v48('cvNotUploaded');cvStatusBadge.className='badge '+(cv?'badge-ready':'badge-blocked');}
  if(typeof cvFileInfo!=='undefined')cvFileInfo.innerText=cv?`${cv.name} • ${Math.round((cv.size||0)/1024)} KB`:'';
  if(typeof cvStatusDashText!=='undefined')cvStatusDashText.innerText=v48('cvStatus');
  if(typeof cvStatusDash!=='undefined'){cvStatusDash.innerText=cv?v48('cvAvailable'):v48('cvMissing');cvStatusDash.className='stat '+(cv?'good':'missing');}
}
const V25_REQUIRED_DOCS_BASE_V48=V25_REQUIRED_DOCS.slice();
if(!V25_REQUIRED_DOCS.includes('CV'))V25_REQUIRED_DOCS.push('CV');
const normalizeDocTypeBaseV48=normalizeDocType;
normalizeDocType=function(t){t=String(t||''); if(t.toLowerCase().includes('cv')||t.toLowerCase().includes('resume'))return 'CV'; return normalizeDocTypeBaseV48(t);}
const missingDocCountForCertsBaseV48=missingDocCountForCerts;
missingDocCountForCerts=function(certs){let n=missingDocCountForCertsBaseV48(certs); if(!getCV())n++; return n;}
const renderV25DocumentStatusBaseV48=renderV25DocumentStatus;
renderV25DocumentStatus=function(){
  renderV25DocumentStatusBaseV48();
  if(typeof docCategoryGrid!=='undefined'){
    const cv=getCV();
    const existing=[...docCategoryGrid.querySelectorAll('.doc-chip')].some(x=>x.textContent.includes('CV'));
    if(!existing)docCategoryGrid.insertAdjacentHTML('beforeend',`<div class="doc-chip ${cv?'ok':'miss'}">${cv?'✓':'!'} CV</div>`);
  }
}
const renderAllBaseV48=renderAll;
renderAll=function(){renderAllBaseV48(); const cv=getCV(); if(typeof totalCerts!=='undefined'){let c=getData('certs');totalCerts.innerText=c.length+(cv?1:0);} renderCVStatus();}
const applyLanguageBaseV48=applyLanguage;
applyLanguage=function(){applyLanguageBaseV48();renderCVStatus();}
setTimeout(()=>{try{renderCVStatus()}catch(e){}},0);
const V49_FILE_TEXT={
  en:{appStatusUploaded:"Appraisal Uploaded ✓",appStatusMissing:"No Appraisal Uploaded",refStatusUploaded:"Reference Uploaded ✓",refStatusMissing:"No Reference Uploaded",preview:"Preview",download:"Download",deleteFile:"Delete",generate:"Generate ATSRS File (Beta)",comingSoon:"ATSRS document generator will be connected in a later build.",noFile:"No file uploaded yet.",uploadAppraisal:"Upload",uploadReference:"Upload",appBetaTitle:"Generate ATSRS Appraisal Summary",appBetaText:"Generate a professional ATSRS appraisal summary from stored career data.",refBetaTitle:"Generate ATSRS Reference Pack",refBetaText:"Generate a professional ATSRS reference pack from stored career data.",docTypePlaceholder:"Write document type manually",autoDocTypePlaceholder:"Write detected document type manually"}
};
function v49(k){return (V49_FILE_TEXT[lang]&&V49_FILE_TEXT[lang][k])||V49_FILE_TEXT.en[k]||k}
function getManagedFile(kind){let a=getData(kind+'Files');return Array.isArray(a)&&a.length?a[0]:null}
function saveManagedFile(kind,file){saveData(kind+'Files',file?[file]:[])}
function handleManagedUpload(kind,event){const file=event.target.files&&event.target.files[0]; if(!file)return; const reader=new FileReader(); reader.onload=function(){saveManagedFile(kind,{name:file.name,type:file.type||'application/octet-stream',size:file.size,updated:new Date().toISOString(),data:reader.result});renderManagedFiles();renderAll();}; reader.readAsDataURL(file);}
function previewManagedFile(kind){const f=getManagedFile(kind); if(!f){alert(v49('noFile'));return;} const w=window.open('','_blank'); if(w){w.document.write(`<title>${f.name}</title><iframe src="${f.data}" style="border:0;width:100%;height:100vh"></iframe>`);w.document.close();}}
function downloadManagedFile(kind){const f=getManagedFile(kind); if(!f){alert(v49('noFile'));return;} const a=document.createElement('a');a.href=f.data;a.download=f.name||('ATSRS-'+kind);document.body.appendChild(a);a.click();a.remove();}
function deleteManagedFile(kind){const f=getManagedFile(kind); if(!f){alert(v49('noFile'));return;} saveManagedFile(kind,null); const input=document.getElementById(kind+'UploadInput'); if(input)input.value=''; renderManagedFiles(); renderAll();}
function ensureManagedCard(kind){
 const isApp=kind==='appraisal';
 const card=document.getElementById(isApp?'appraisalCardTitle':'referenceCardTitle')?.closest('.ref-card');
 if(!card || card.dataset.v49Ready==='1')return;
 card.dataset.v49Ready='1';
 const title=document.getElementById(isApp?'appraisalCardTitle':'referenceCardTitle');
 if(title && !title.parentElement.classList.contains('ref-doc-head')){
   title.outerHTML=`<div class="ref-doc-head"><h3 id="${isApp?'appraisalCardTitle':'referenceCardTitle'}">${title.innerText}</h3><span id="${kind}StatusBadge" class="badge badge-blocked">—</span></div>`;
 }
 const oldBtn=document.getElementById(isApp?'uploadAppraisalBtn':'uploadReferenceBtn'); if(oldBtn)oldBtn.remove();
 card.insertAdjacentHTML('beforeend',`
   <input id="${kind}UploadInput" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" class="hidden" onchange="handleManagedUpload('${kind}',event)" multiple>
   <div id="${kind}FileInfo" class="preview-box ref-file-info"></div>
   <div class="ref-doc-actions">
     <button id="${kind}UploadBtn" class="secondary" onclick="document.getElementById('${kind}UploadInput').click()"></button>
     <button id="${kind}PreviewBtn" class="secondary" onclick="previewManagedFile('${kind}')"></button>
     <button id="${kind}DownloadBtn" class="secondary" onclick="downloadManagedFile('${kind}')"></button>
     <button id="${kind}DeleteBtn" class="action" onclick="deleteManagedFile('${kind}')"></button>
   </div>
`);
}
function renderManagedFiles(){
 ['appraisal','reference'].forEach(kind=>ensureManagedCard(kind));
 const app=getManagedFile('appraisal'), ref=getManagedFile('reference');
 const pairs=[['appraisal',app],['reference',ref]];
 pairs.forEach(([kind,file])=>{
  const isApp=kind==='appraisal';
  const badge=document.getElementById(kind+'StatusBadge'); if(badge){badge.innerText=file?(isApp?v49('appStatusUploaded'):v49('refStatusUploaded')):(isApp?v49('appStatusMissing'):v49('refStatusMissing')); badge.className='badge '+(file?'badge-ready':'badge-blocked');}
  const info=document.getElementById(kind+'FileInfo'); if(info)info.innerText=file?`${file.name} • ${Math.round((file.size||0)/1024)} KB`:'';
  const up=document.getElementById(kind+'UploadBtn'); if(up)up.innerText=isApp?v49('uploadAppraisal'):v49('uploadReference');
  const pr=document.getElementById(kind+'PreviewBtn'); if(pr)pr.innerText=v49('preview');
  const dl=document.getElementById(kind+'DownloadBtn'); if(dl)dl.innerText=v49('download');
  const del=document.getElementById(kind+'DeleteBtn'); if(del)del.innerText=v49('deleteFile');
  const bt=document.getElementById(kind+'BetaTitle'); if(bt)bt.innerText=isApp?v49('appBetaTitle'):v49('refBetaTitle');
  const bx=document.getElementById(kind+'BetaText'); if(bx)bx.innerText=isApp?v49('appBetaText'):v49('refBetaText');
  const gen=document.getElementById(kind+'GenerateBtn'); if(gen)gen.innerText=v49('generate');
 });
 if(typeof cType!=='undefined')cType.placeholder=v49('docTypePlaceholder');
 if(typeof autoDocType!=='undefined')autoDocType.placeholder=v49('autoDocTypePlaceholder');
}
const restoreCurrentPageBaseV49=restoreCurrentPage;
restoreCurrentPage=function(){let page=localStorage.getItem('atsrs_current_page')||'intro';let map={intro:navIntro,dashboard:navDashboard,personnel:navPersonnel,certificates:navCertificates,refs:navRefs,compliance:navCompliance,reports:navReports,profile:navProfile};showPage(map[page]?page:'intro',map[page]||navIntro);}
const renderAllBaseV49=renderAll;
renderAll=function(){renderAllBaseV49();renderManagedFiles();}
const applyLanguageBaseV49=applyLanguage;
applyLanguage=function(){applyLanguageBaseV49();renderManagedFiles();}
setTimeout(()=>{try{renderManagedFiles()}catch(e){}},0);
const V27_TEXT={
  en:{shareBadge:"SHARE PROFILE",shareTitle:"Share My ATSRS Profile",shareSub:"Send one secure profile link instead of attaching documents one by one.",copyLink:"Copy Link",preview:"Preview",manageAccess:"Manage Access",linkCopied:"Link copied.",companyView:"Company view",companyImportText:"A company can review shared documents and import selected records into ATSRS Company later.",importCompany:"Import to Company Profile",importDemoAlert:"Company import will be connected after backend and permissions are ready.",profileVisibility:"Profile Visibility",profileVisibilityNote:"Private by default. Shared link only when enabled.",sharedProfile:"ATSRS Shared Profile"}
};
function v27(k){return (V27_TEXT[lang]&&V27_TEXT[lang][k])||V27_TEXT.en[k]||k}
function toggleSharePreview(){sharePreviewBox.classList.toggle('hidden');renderSharePreview();}
function toggleShareAccess(){shareAccessBox.classList.toggle('hidden');}
function copyShareLink(){
  const val=shareProfileLink.value;
  if(navigator.clipboard){navigator.clipboard.writeText(val).catch(()=>{});}
  shareCopyMsg.innerText=v27('linkCopied');shareCopyMsg.classList.remove('hidden');
  setTimeout(()=>shareCopyMsg.classList.add('hidden'),1800);
}
function renderSharePreview(){
  if(typeof sharePreviewDocs==="undefined")return;
  let c=getData("certs");
  let have=new Set(c.map(x=>normalizeDocType(x.type)).filter(Boolean));
  sharePreviewDocs.innerHTML=V25_REQUIRED_DOCS.map(d=>`<div class="doc-chip ${have.has(d)?'ok':'miss'}">${have.has(d)?'✓':'!'} ${d}</div>`).join("");
  let prof=JSON.parse(localStorage.getItem(localKey("profile")))||{};
  let full=((prof.name||"Anar")+" "+(prof.surname||"Agasiyev")).trim();
  previewName.innerText=full;
  previewRole.innerText=prof.position||"Professional Document Holder";
}
function applyV27Language(){
  if(typeof shareBadge!=="undefined")shareBadge.innerText=v27('shareBadge');
  if(typeof shareTitle!=="undefined")shareTitle.innerText=v27('shareTitle');
  if(typeof shareSub!=="undefined")shareSub.innerText=v27('shareSub');
  if(typeof copyShareBtn!=="undefined")copyShareBtn.innerText=v27('copyLink');
  if(typeof previewShareBtn!=="undefined")previewShareBtn.innerText=v27('preview');
  if(typeof manageAccessBtn!=="undefined")manageAccessBtn.innerText=v27('manageAccess');
  if(typeof companyImportTitle!=="undefined")companyImportTitle.innerText=v27('companyView');
  if(typeof companyImportText!=="undefined")companyImportText.innerText=v27('companyImportText');
  if(typeof importDemoBtn!=="undefined")importDemoBtn.innerText=v27('importCompany');
  if(typeof previewStatus!=="undefined")previewStatus.innerText=v27('sharedProfile');
  if(typeof profileVisibilityTitle!=="undefined")profileVisibilityTitle.innerText=v27('profileVisibility');
  if(typeof profileVisibilityNote!=="undefined")profileVisibilityNote.innerText=v27('profileVisibilityNote');
  renderSharePreview();
}
const renderAllBaseV27=renderAll;renderAll=function(){renderAllBaseV27();renderSharePreview();}
const V29_TEXT={
  en:{introKicker:"PROFESSIONAL CAREER COMPLIANCE",introTitle:"Documents, expiry alerts and profile sharing.",introText:"Keep information organized and stay compliant.",featureDocsTitle:"Document Vault",featureDocsText:"Keep passports, licences, certifications, medical records and career documents in one secure place.",featureUploadTitle:"Easy Upload",featureUploadText:"Upload PDF, JPG or PNG files directly into your secure ATSRS register.",featureScanTitle:"Scan & Auto-fill",featureScanText:"Scan documents and let ATSRS prepare information for manual review.",featureAlertsTitle:"Expiry Tracking",featureAlertsText:"Stay ahead with reminders for licences, certificates, permits and compliance documents.",featureShareTitle:"Share Profile",featureShareText:"Share one secure ATSRS profile link instead of sending multiple attachments.",featureCompanyTitle:"Company Import",featureCompanyText:"Allow organisations to request access and import approved documents into their compliance records.",workflowBadge:"HOW ATSRS WORKS",workflowTitle:"From document upload to employer-ready profile",workflowSub:"A simple flow for personal users today and company compliance tomorrow.",step1Title:"Upload",step1Text:"Add documents manually or by scan.",step2Title:"Track",step2Text:"Monitor expiry and document dates.",step3Title:"Share",step3Text:"Send a controlled ATSRS profile link.",step4Title:"Approve",step4Text:"Allow companies to download or import selected documents.",snapshotBadge:"COMPLIANCE SNAPSHOT",snapshotTitle:"Quick status",snapValidLabel:"Valid documents",snapRiskLabel:"Expiry risk",snapMissingLabel:"Missing documents",snapShareLabel:"Profile sharing",snapShare:"Ready"}
};
function v29(k){return (V29_TEXT[lang]&&V29_TEXT[lang][k])||V29_TEXT.en[k]||k}
function applyV29Language(){
  ["introKicker","introTitle","introText","featureDocsTitle","featureDocsText","featureUploadTitle","featureUploadText","featureScanTitle","featureScanText","featureAlertsTitle","featureAlertsText","featureShareTitle","featureShareText","featureCompanyTitle","featureCompanyText","workflowBadge","workflowTitle","workflowSub","step1Title","step1Text","step2Title","step2Text","step3Title","step3Text","step4Title","step4Text","snapshotBadge","snapshotTitle","snapValidLabel","snapRiskLabel","snapMissingLabel","snapShareLabel"].forEach(id=>{let el=document.getElementById(id);if(el)el.innerText=v29(id);});
  if(typeof snapShare!=="undefined")snapShare.innerText=v29('snapShare');
}
function renderV29Snapshot(){
  if(typeof snapValid==="undefined")return;
  let c=getData("certs");
  let valid=0,risk=0;
  c.forEach(x=>{let s=status(x.expiry);if(!s.expired&&!s.risk)valid++;if(s.risk)risk++;});
  snapValid.innerText=valid; snapRisk.innerText=risk; if(typeof snapMissing!=="undefined"&&typeof missingDocs!=="undefined")snapMissing.innerText=missingDocs.innerText||0;
}
const applyLanguageBaseV29=applyLanguage;applyLanguage=function(){applyLanguageBaseV29();applyV29Language();renderV29Snapshot();}
const renderAllBaseV29=renderAll;renderAll=function(){renderAllBaseV29();renderV29Snapshot();}

applyLanguage();
useMode='';
if(typeof personalModeBtn!=='undefined'){personalModeBtn.classList.remove('active');companyModeBtn.classList.remove('active');}
showCertMode('scan');
renderSharePreview();
const V30_BG_TEXT={
  en:{bgDocPassportTitle:"Passport & Seaman Book",bgDocPassportText:"Store identity and travel documents securely.",bgDocMedicalTitle:"Medical & Certificates",bgDocMedicalText:"Track expiry dates before they become a compliance problem.",bgDocTrainingTitle:"Training & Competency",bgDocTrainingText:"Keep licences, training records, certificates and other proof in one place.",bgDocShareTitle:"Easy Upload",bgDocShareText:"Upload PDFs and images without complicated steps.",bgDocAccessTitle:"Scan & Auto-fill",bgDocAccessText:"Scan a document and confirm extracted fields manually.",bgDocCompanyTitle:"Company Import",bgDocCompanyText:"Approved documents can move into company compliance records."}
};
function v30bg(k){return (V30_BG_TEXT[lang]&&V30_BG_TEXT[lang][k])||V30_BG_TEXT.en[k]||k}
function applyV30BgLanguage(){["bgDocPassportTitle","bgDocPassportText","bgDocMedicalTitle","bgDocMedicalText","bgDocTrainingTitle","bgDocTrainingText","bgDocShareTitle","bgDocShareText","bgDocAccessTitle","bgDocAccessText","bgDocCompanyTitle","bgDocCompanyText"].forEach(id=>{let el=document.getElementById(id);if(el)el.innerText=v30bg(id);});}
const applyLanguageBaseV30=applyLanguage;applyLanguage=function(){applyLanguageBaseV30();applyV30BgLanguage();}
const V35_LOGIN_TEXT={
  en:{
    introKicker:"ATSRS Platform",
    introTitle:"Documents, expiry alerts and profile sharing.",
    introText:"Keep information organized and stay compliant.",
    featureDocsTitle:"Document Vault",featureDocsText:"Keep passports, licences, certifications, medical records and career documents in one secure place.",
    featureUploadTitle:"Easy Upload",featureUploadText:"Upload PDF, JPG or PNG files directly into your secure ATSRS register.",
    featureScanTitle:"Scan & Auto-fill",featureScanText:"Scan documents and let ATSRS prepare information for manual review.",
    featureAlertsTitle:"Expiry Tracking",featureAlertsText:"Stay ahead with reminders for licences, certificates, permits and compliance documents.",
    featureShareTitle:"Share Profile",featureShareText:"Share one secure ATSRS profile link instead of sending multiple attachments.",
    featureCompanyTitle:"Company Import",featureCompanyText:"Allow organisations to request access and import approved documents into their compliance records.",
    bgDocPassportTitle:"Passport & Seaman Book",bgDocPassportText:"Store identity and travel documents securely.",
    bgDocMedicalTitle:"Medical & Certificates",bgDocMedicalText:"Track expiry dates before they become a compliance problem.",
    bgDocTrainingTitle:"Training & Competency",bgDocTrainingText:"Keep licences, training records, certificates and other proof in one place.",
    bgDocShareTitle:"Share ATSRS Profile",bgDocShareText:"Send one controlled profile link instead of many attachments.",
    bgDocCompanyTitle:"Company Import",bgDocCompanyText:"Approved documents can move into company compliance records."
  }
};
function v35(k){return (V35_LOGIN_TEXT[lang]&&V35_LOGIN_TEXT[lang][k])||V35_LOGIN_TEXT.en[k]||k}
function applyV35LoginLanguage(){
  ["introKicker","introTitle","introText","featureDocsTitle","featureDocsText","featureUploadTitle","featureUploadText","featureScanTitle","featureScanText","featureAlertsTitle","featureAlertsText","featureShareTitle","featureShareText","featureCompanyTitle","featureCompanyText","bgDocPassportTitle","bgDocPassportText","bgDocMedicalTitle","bgDocMedicalText","bgDocTrainingTitle","bgDocTrainingText","bgDocShareTitle","bgDocShareText","bgDocCompanyTitle","bgDocCompanyText"].forEach(id=>{let el=document.getElementById(id);if(el)el.innerText=v35(id);});
}
const applyLanguageBaseV35=applyLanguage;
applyLanguage=function(){applyLanguageBaseV35();applyV35LoginLanguage();};
applyV35LoginLanguage();
const V36_LOGIN_TEXT={
  en:{
    introKicker:"ATSRS Platform",
    introTitle:"Documents, expiry alerts and profile sharing.",
    introText:"Keep information organized and stay compliant.",
    featureDocsTitle:"Document Vault",featureDocsText:"Keep passports, licences, certifications, medical records and career documents in one secure place.",
    featureUploadTitle:"Easy Upload",featureUploadText:"Upload PDF, JPG or PNG files directly into your secure ATSRS register.",
    featureScanTitle:"Scan & Auto-fill",featureScanText:"Scan documents and let ATSRS prepare information for manual review.",
    featureAlertsTitle:"Expiry Tracking",featureAlertsText:"Stay ahead with reminders for licences, certificates, permits and compliance documents.",
    featureShareTitle:"Share Profile",featureShareText:"Share one secure ATSRS profile link instead of sending multiple attachments.",
    featureCompanyTitle:"Company Import",featureCompanyText:"Allow organisations to request access and import approved documents into their compliance records.",
    bgDocPassportTitle:"Passport & Seaman Book",bgDocPassportText:"Store identity and travel documents securely.",
    bgDocMedicalTitle:"Medical & Certificates",bgDocMedicalText:"Track expiry dates before they become a compliance problem.",
    bgDocTrainingTitle:"Training & Competency",bgDocTrainingText:"Keep licences, training records, certificates and other proof in one place.",
    bgDocShareTitle:"Share ATSRS Profile",bgDocShareText:"Send one controlled profile link instead of many attachments.",
    bgDocCompanyTitle:"Company Import",bgDocCompanyText:"Approved documents can move into company compliance records."
  }
};
function applyV36LoginLanguage(){
  const dict=V36_LOGIN_TEXT[lang]||V36_LOGIN_TEXT.en;
  Object.keys(dict).forEach(id=>{const el=document.getElementById(id); if(el) el.textContent=dict[id];});
}
const _applyLanguageV36=applyLanguage;
applyLanguage=function(){_applyLanguageV36();applyV36LoginLanguage();};
const _changeLanguageV36=changeLanguage;
changeLanguage=function(v){_changeLanguageV36(v);applyV36LoginLanguage();setTimeout(applyV36LoginLanguage,0);};
applyV36LoginLanguage();
const V41R_TEXT={
  en:{notApplicable:"Not Applicable",noExpiry:"No Expiry",edit:"Edit",update:"Update Document",add:"Add Certificate",expiryRequired:"Expiry Date",requiredMsg:"Please complete all required fields."}
};
function v41r(k){return (V41R_TEXT[lang]&&V41R_TEXT[lang][k])||V41R_TEXT.en[k]||k}
let editCertIndex=null;
function ensureExpiryNAControls(){
  const items=[['cExpiry','cExpiryNA','cExpiryNALabel'],['autoExpiry','autoExpiryNA','autoExpiryNALabel']];
  items.forEach(([inputId,checkId,labelId])=>{
    const input=document.getElementById(inputId); if(!input||document.getElementById(checkId))return;
    const wrap=input.closest('.field-wrap'); if(!wrap)return;
    wrap.insertAdjacentHTML('beforeend',`<label class="na-check"><input id="${checkId}" type="checkbox"> <span id="${labelId}">${v41r('notApplicable')}</span></label>`);
    const cb=document.getElementById(checkId);
    cb.addEventListener('change',()=>{
      input.disabled=cb.checked;
      if(cb.checked){input.value='';input.classList.remove('required-missing');}
      if(typeof manualFormAlert!=='undefined')manualFormAlert.classList.remove('active');
      if(typeof autoFormAlert!=='undefined')autoFormAlert.classList.remove('active');
    });
  });
}
function applyV41RLanguage(){
  ensureExpiryNAControls();
  const m=document.getElementById('cExpiryNALabel'); if(m)m.innerText=v41r('notApplicable');
  const a=document.getElementById('autoExpiryNALabel'); if(a)a.innerText=v41r('notApplicable');
  const addBtn=document.getElementById('addCertBtn'); if(addBtn)addBtn.innerText=editCertIndex===null?(tr('addCert')||v41r('add')):v41r('update');
  if(typeof cExpiryLabel!=='undefined')cExpiryLabel.innerHTML='<span class="req-star">*</span>'+v41r('expiryRequired');
  if(typeof autoExpiryLabel!=='undefined')autoExpiryLabel.innerHTML='<span class="req-star">*</span>'+v41r('expiryRequired');
}
const statusBaseV41R=status;
status=function(expiry){
  if(!expiry || String(expiry).toUpperCase()==='N/A')return{txt:v41r('noExpiry'),cls:'good',expired:false,risk:false,days:99999,noExpiry:true};
  return statusBaseV41R(expiry);
};
function expiryNAValue(id){const cb=document.getElementById(id);return !!(cb&&cb.checked)}
function normalizeExpiry(inputId,cbId){return expiryNAValue(cbId)?'N/A':(document.getElementById(inputId)?.value||'')}
const clearManualValidationBaseV41R=clearManualValidation;
clearManualValidation=function(){clearManualValidationBaseV41R(); if(typeof cExpiryNA!=='undefined'&&cExpiryNA.checked)cExpiry.classList.remove('required-missing');}
validateManualCertificateForm=function(){
  clearManualValidation(); let ok=true;
  if(!cType.value){cType.classList.add('required-missing');ok=false;}
  if(!expiryNAValue('cExpiryNA')&&!cExpiry.value){cExpiry.classList.add('required-missing');ok=false;}
  if(!ok&&typeof manualFormAlert!=='undefined'){manualFormAlert.innerText=v41r('requiredMsg');manualFormAlert.classList.add('active');}
  return ok;
};
validateAutoConfirmForm=function(){
  clearAutoValidation(); let ok=true;
  if(!isPersonalMode()&&!autoPerson.value){autoPerson.classList.add('required-missing');ok=false;}
  if(!autoDocType.value){autoDocType.classList.add('required-missing');ok=false;}
  if(!expiryNAValue('autoExpiryNA')&&!autoExpiry.value){autoExpiry.classList.add('required-missing');ok=false;}
  if(!ok&&typeof autoFormAlert!=='undefined'){autoFormAlert.innerText=v41r('requiredMsg');autoFormAlert.classList.add('active');}
  return ok;
};
confirmExtractedDocument=function(){
  if(!validateAutoConfirmForm())return;
  let person=isPersonalMode()?soloOwnerName():autoPerson.value;
  let a=getData('certs');
  a.push({person,type:autoDocType.value,provider:autoProvider.value,expiry:normalizeExpiry('autoExpiry','autoExpiryNA'),docNo:autoDocNo.value,issue:autoIssue.value});
  saveData('certs',a);confirmBox.classList.add('hidden');documentPreview.innerText='';renderAll();
};
addCertificate=function(){
  let a=getData('certs'); let person=isPersonalMode()?soloOwnerName():cPerson.value;
  if(!validateManualCertificateForm()||!person)return;
  const item={person,type:cType.value,docNo:(cDocNo?.value||''),country:(cCountry?.value||''),provider:cProvider.value,issue:cIssue.value,expiry:normalizeExpiry('cExpiry','cExpiryNA')};
  if(editCertIndex!==null&&a[editCertIndex]){a[editCertIndex]=item; editCertIndex=null;} else {a.push(item);}
  saveData('certs',a);
  cProvider.value='';cIssue.value='';cExpiry.value=''; if(typeof cDocNo!=='undefined')cDocNo.value=''; if(typeof cCountry!=='undefined')cCountry.value='';
  if(typeof cExpiryNA!=='undefined'){cExpiryNA.checked=false;cExpiry.disabled=false;}
  clearManualValidation(); applyV41RLanguage(); renderAll();
};
function editCertificate(i){
  const a=getData('certs'); const x=a[i]; if(!x)return;
  editCertIndex=i;
  showPage('certificates',navCertificates); showCertMode('manual');
  cType.value=x.type||''; cProvider.value=x.provider||''; cIssue.value=x.issue||'';
  if(typeof cDocNo!=='undefined')cDocNo.value=x.docNo||''; if(typeof cCountry!=='undefined')cCountry.value=x.country||'';
  if(typeof cExpiryNA!=='undefined'){
    cExpiryNA.checked=String(x.expiry||'').toUpperCase()==='N/A';
    cExpiry.disabled=cExpiryNA.checked;
  }
  cExpiry.value=String(x.expiry||'').toUpperCase()==='N/A'?'':(x.expiry||'');
  applyV41RLanguage();
  document.getElementById('certManualPanel')?.scrollIntoView({behavior:'smooth',block:'start'});
}
const renderAllBaseV41R=renderAll;
renderAll=function(){
  renderAllBaseV41R();
  const certs=getData('certs');
  const rows=certTable?certTable.querySelectorAll('tr'):[];
  rows.forEach((row,i)=>{
    const cells=row.querySelectorAll('td');
    if(cells.length>=5){
      if(String(certs[i]?.expiry||'').toUpperCase()==='N/A'){
        cells[2].innerText='N/A'; cells[3].innerText=v41r('noExpiry'); cells[3].className='good';
      }
      const action=cells[4];
      if(action&&!action.querySelector('.edit-btn')){
        action.insertAdjacentHTML('afterbegin',`<button class="secondary edit-btn" onclick="editCertificate(${i})">${v41r('edit')}</button>`);
      }
    }
  });
};
const applyLanguageBaseV41R=applyLanguage;
applyLanguage=function(){applyLanguageBaseV41R();applyV41RLanguage();renderAll&&setTimeout(()=>{try{renderAll()}catch(e){}},0);}
setTimeout(()=>{ensureExpiryNAControls();applyV41RLanguage();},0);


/* ===== Original V178 inline script 2  ===== */
const V54_TEXT={
  en:{recommendations:'Recommendation Letters',recommendationsText:'Store recommendation letters from supervisors, clients and companies.',uploadRecommendation:'Upload',appraisalsCount:'Appraisals',referencesCount:'References',recommendationsCount:'Recommendation Letters',noRecords:'No files uploaded yet.',signedDate:'Signed Date',preview:'Preview',download:'Download',deleteFile:'Delete'}
};
function v54(k){return (V54_TEXT[lang]&&V54_TEXT[lang][k])||V54_TEXT.en[k]||k;}
function careerKey(kind){return kind+'Files';}
function getManagedFiles(kind){let a=getData(careerKey(kind));return Array.isArray(a)?a:[];}
function setManagedFiles(kind,arr){saveData(careerKey(kind),Array.isArray(arr)?arr:[]);}
function getManagedFile(kind){let a=getManagedFiles(kind);return a.length?a[0]:null;}
function saveManagedFile(kind,file){ if(file){let a=getManagedFiles(kind);a.unshift(file);setManagedFiles(kind,a);}else{setManagedFiles(kind,[]);} }
function formatCareerDate(x){return x&&x.signedDate?x.signedDate:(x&&x.updated?String(x.updated).slice(0,10):'');}
function sortedCareerFiles(kind){return getManagedFiles(kind).slice().sort((a,b)=>String(formatCareerDate(b)).localeCompare(String(formatCareerDate(a))));}
function ensureRecommendationCard(){
 if(document.getElementById('recommendationCardTitle'))return;
 const cvCard=document.getElementById('cvCardTitle')?.closest('.ref-card');
 const grid=cvCard?.parentElement||document.querySelector('#refsPage .ref-grid');
 if(!grid)return;
 const html=`<div class="ref-card"><h3 id="recommendationCardTitle">Recommendation Letters</h3><p id="recommendationCardText" class="sub">Store recommendation letters from supervisors, clients and companies.</p><button id="uploadRecommendationBtn" class="secondary" onclick="alert(ptr('authLiveNotice'))">Upload</button></div>`;
 if(cvCard)cvCard.insertAdjacentHTML('beforebegin',html); else grid.insertAdjacentHTML('beforeend',html);
}
function ensureManagedCard(kind){
 ensureRecommendationCard();
 const map={appraisal:['appraisalCardTitle','uploadAppraisalBtn'],reference:['referenceCardTitle','uploadReferenceBtn'],recommendation:['recommendationCardTitle','uploadRecommendationBtn']};
 const ids=map[kind]; if(!ids)return;
 const card=document.getElementById(ids[0])?.closest('.ref-card'); if(!card)return;
 if(card.dataset.v54Ready!=='1'){
   card.dataset.v54Ready='1';
   const title=document.getElementById(ids[0]);
   if(title && !title.parentElement.classList.contains('ref-doc-head')){
     title.outerHTML=`<div class="ref-doc-head"><h3 id="${ids[0]}">${title.innerText}</h3><span id="${kind}StatusBadge" class="badge badge-blocked">No File</span></div>`;
   }
   const oldBtn=document.getElementById(ids[1]); if(oldBtn)oldBtn.remove();
   const oldInfo=document.getElementById(kind+'FileInfo'); if(oldInfo)oldInfo.remove();
   const oldActions=card.querySelector('.ref-doc-actions'); if(oldActions)oldActions.remove();
   card.insertAdjacentHTML('beforeend',`
     <input id="${kind}UploadInput" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" class="hidden" onchange="handleManagedUpload('${kind}',event)" multiple>
     <button id="${kind}UploadBtn" class="secondary" onclick="document.getElementById('${kind}UploadInput').click()"></button>
     <div id="${kind}Count" class="career-count"></div>
     <div id="${kind}RecordList" class="career-record-list"></div>
   `);
 }
}
function handleManagedUpload(kind,event){
 const file=event.target.files&&event.target.files[0]; if(!file)return;
 const reader=new FileReader();
 reader.onload=function(){
   const item={id:Date.now()+'_'+Math.random().toString(36).slice(2),name:file.name,type:file.type||'application/octet-stream',size:file.size,updated:new Date().toISOString(),signedDate:new Date().toISOString().slice(0,10),data:reader.result};
   const a=getManagedFiles(kind);a.push(item);setManagedFiles(kind,a);event.target.value='';renderManagedFiles();renderAll();
 };
 reader.readAsDataURL(file);
}
function updateManagedDate(kind,id,value){const a=getManagedFiles(kind);const x=a.find(i=>i.id===id);if(x){x.signedDate=value;setManagedFiles(kind,a);renderManagedFiles();}}
function getCareerItem(kind,id){return getManagedFiles(kind).find(i=>i.id===id);}
function previewManagedFile(kind,id){const f=id?getCareerItem(kind,id):getManagedFile(kind); if(!f){alert(v54('noRecords'));return;} const w=window.open('','_blank'); if(w){w.document.write(`<title>${f.name}</title><iframe src="${f.data}" style="border:0;width:100%;height:100vh"></iframe>`);w.document.close();}}
function downloadManagedFile(kind,id){const f=id?getCareerItem(kind,id):getManagedFile(kind); if(!f){alert(v54('noRecords'));return;} const a=document.createElement('a');a.href=f.data;a.download=f.name||('ATSRS-'+kind);document.body.appendChild(a);a.click();a.remove();}
function deleteManagedFile(kind,id){let a=getManagedFiles(kind); if(id){a=a.filter(i=>i.id!==id);}else{a=[];} setManagedFiles(kind,a);renderManagedFiles();renderAll();}
function renderCareerList(kind){
 const list=document.getElementById(kind+'RecordList'); if(!list)return;
 const files=sortedCareerFiles(kind);
 if(!files.length){list.innerHTML=`<div class="preview-box">${v54('noRecords')}</div>`;return;}
 list.innerHTML=files.map(f=>`
   <div class="career-record-row">
     <div class="career-record-name"><b title="${String(f.name||'').replace(/"/g,'&quot;')}">${f.name||'File'}</b><span>${Math.round((f.size||0)/1024)} KB</span></div>
     <div class="career-record-date"><input type="date" value="${formatCareerDate(f)}" title="${v54('signedDate')}" onchange="updateManagedDate('${kind}','${f.id}',this.value)"></div>
     <div class="career-record-actions"><button class="secondary" onclick="previewManagedFile('${kind}','${f.id}')">${v54('preview')}</button><button class="secondary" onclick="downloadManagedFile('${kind}','${f.id}')">${v54('download')}</button><button class="action" onclick="deleteManagedFile('${kind}','${f.id}')">${v54('deleteFile')}</button></div>
   </div>`).join('');
}
function renderManagedFiles(){
 ['appraisal','reference','recommendation'].forEach(kind=>ensureManagedCard(kind));
 const labels={appraisal:['uploadAppraisal','appraisalsCount'],reference:['uploadReference','referencesCount'],recommendation:['uploadRecommendation','recommendationsCount']};
 ['appraisal','reference','recommendation'].forEach(kind=>{
   const files=getManagedFiles(kind);
   const badge=document.getElementById(kind+'StatusBadge'); if(badge){badge.innerText=(files.length?(files.length+' File'+(files.length>1?'s':'')):'No File');badge.className='badge '+(files.length?'badge-ready':'badge-blocked');}
   const up=document.getElementById(kind+'UploadBtn'); if(up)up.innerText=(kind==='appraisal'?v49('uploadAppraisal'):kind==='reference'?v49('uploadReference'):v54('uploadRecommendation'));
   const cnt=document.getElementById(kind+'Count'); if(cnt)cnt.innerText=`${v54(labels[kind][1])}: ${files.length?(files.length+' File'+(files.length>1?'s':'')):'No File'} • Newest first`;
   renderCareerList(kind);
 });
 if(typeof recommendationCardTitle!=='undefined')recommendationCardTitle.innerText=v54('recommendations');
 if(typeof recommendationCardText!=='undefined')recommendationCardText.innerText=v54('recommendationsText');
 if(typeof cType!=='undefined')cType.placeholder=v49('docTypePlaceholder');
 if(typeof autoDocType!=='undefined')autoDocType.placeholder=v49('autoDocTypePlaceholder');
}
function forceTopControlsFixed(){
 const el=document.querySelector('#app .top-actions'); if(!el)return;
 el.style.setProperty('position','absolute','important');
 el.style.setProperty('top',window.innerWidth<=800?'12px':'18px','important');
 el.style.setProperty('right',window.innerWidth<=800?'12px':'18px','important');
 el.style.setProperty('left','auto','important');
 el.style.setProperty('z-index','90','important');
}
const renderAllBaseV54=renderAll;
renderAll=function(){renderAllBaseV54();renderManagedFiles();forceTopControlsFixed();};
const applyLanguageBaseV54=applyLanguage;
applyLanguage=function(){applyLanguageBaseV54();renderManagedFiles();forceTopControlsFixed();};
window.addEventListener('scroll',forceTopControlsFixed,{passive:true});
window.addEventListener('resize',forceTopControlsFixed);
setInterval(forceTopControlsFixed,800);
setTimeout(()=>{try{renderManagedFiles();forceTopControlsFixed();}catch(e){}},0);
function v55DockTopActions(){
  const app=document.getElementById('app');
  const auth=document.getElementById('auth');
  let top=document.querySelector('.atsrs-global-top-actions') || document.querySelector('#app .top-actions');
  if(!top)return;
  if(!top.classList.contains('atsrs-global-top-actions')){
    top.classList.add('atsrs-global-top-actions');
    document.body.appendChild(top);
  }
  const appVisible=app && !app.classList.contains('hidden');
  top.style.setProperty('display',appVisible?'flex':'none','important');
  top.style.setProperty('position','absolute','important');
  top.style.setProperty('top',window.innerWidth<=800?'12px':'18px','important');
  top.style.setProperty('right',window.innerWidth<=800?'12px':'18px','important');
  top.style.setProperty('left','auto','important');
  top.style.setProperty('z-index','2147483647','important');
  top.style.setProperty('transform','none','important');
}
const v55ShowPageBase=typeof showPage==='function'?showPage:null;
if(v55ShowPageBase){
  showPage=function(){const r=v55ShowPageBase.apply(this,arguments);setTimeout(v55DockTopActions,0);return r;}
}
const v55LoginBase=typeof login==='function'?login:null;
if(v55LoginBase){
  login=function(){const r=v55LoginBase.apply(this,arguments);setTimeout(v55DockTopActions,80);setTimeout(v55DockTopActions,400);return r;}
}
const v55LocalTestLoginBase=typeof localTestLogin==='function'?localTestLogin:null;
if(v55LocalTestLoginBase){
  localTestLogin=function(){const r=v55LocalTestLoginBase.apply(this,arguments);setTimeout(v55DockTopActions,80);setTimeout(v55DockTopActions,400);return r;}
}
const v55LogoutBase=typeof logout==='function'?logout:null;
if(v55LogoutBase){
  logout=function(){const r=v55LogoutBase.apply(this,arguments);setTimeout(v55DockTopActions,0);return r;}
}
window.addEventListener('scroll',v55DockTopActions,{passive:true});
window.addEventListener('resize',v55DockTopActions);
setInterval(v55DockTopActions,500);
setTimeout(v55DockTopActions,0);
setTimeout(v55DockTopActions,500);


/* ===== Original V178 inline script 3  ===== */
(function(){
  function lockCareerLists(){
    ['appraisal','reference','recommendation'].forEach(function(kind){
      var list=document.getElementById(kind+'RecordList');
      if(!list)return;
      list.style.setProperty('max-height', window.innerWidth<=760?'216px':'196px', 'important');
      list.style.setProperty('overflow-y','auto','important');
      list.style.setProperty('overflow-x','hidden','important');
      list.style.setProperty('padding-right','6px','important');
      Array.prototype.forEach.call(list.querySelectorAll('.career-record-row'),function(row){
        row.style.setProperty('min-height', window.innerWidth<=760?'42px':'38px', 'important');
      });
    });
  }
  var baseRender=window.renderManagedFiles;
  if(typeof baseRender==='function'){
    window.renderManagedFiles=function(){var r=baseRender.apply(this,arguments); setTimeout(lockCareerLists,0); return r;};
  }
  var baseRun=window.atsrsV56ApplyLanguage;
  if(typeof baseRun==='function'){
    window.atsrsV56ApplyLanguage=function(){var r=baseRun.apply(this,arguments); setTimeout(lockCareerLists,0); return r;};
  }
  window.atsrsV57LockCareerLists=lockCareerLists;
  window.addEventListener('resize',lockCareerLists);
  document.addEventListener('DOMContentLoaded',lockCareerLists);
  setInterval(lockCareerLists,900);
  setTimeout(lockCareerLists,0);
  setTimeout(lockCareerLists,300);
})();


/* ===== Original V178 inline script 4  ===== */
(function(){
  function restoreV34Topbar(){
    var app=document.getElementById('app');
    var top=document.querySelector('#app > .top-actions') || document.querySelector('.top-actions');
    if(!app||!top)return;
    if(top.parentElement!==app) app.insertBefore(top, app.firstChild);
    top.classList.remove('atsrs-v56-top-actions','atsrs-global-top-actions');
    top.style.setProperty('position','absolute','important');
    top.style.setProperty('top',window.innerWidth<=800?'12px':'18px','important');
    top.style.setProperty('right',window.innerWidth<=800?'12px':'18px','important');
    top.style.setProperty('left','auto','important');
    top.style.setProperty('display',app.classList.contains('hidden')?'none':'flex','important');
    top.style.setProperty('visibility','visible','important');
    top.style.setProperty('pointer-events','auto','important');
    top.style.setProperty('z-index','2147483647','important');
  }
  var names=['openApp','showPage','renderAll','applyLanguage','changeLanguage','login','localTestLogin','logout','confirmLogout'];
  names.forEach(function(name){
    var base=window[name];
    if(typeof base==='function' && !base.__v60Topbar){
      var wrapped=function(){var r=base.apply(this,arguments);setTimeout(restoreV34Topbar,0);setTimeout(restoreV34Topbar,200);return r;};
      wrapped.__v60Topbar=true; window[name]=wrapped;
    }
  });
  window.atsrsV60RestoreTopbar=restoreV34Topbar;
  document.addEventListener('DOMContentLoaded',restoreV34Topbar);
  window.addEventListener('load',restoreV34Topbar);
  window.addEventListener('resize',restoreV34Topbar);
  window.addEventListener('scroll',restoreV34Topbar,{passive:true});
  setTimeout(restoreV34Topbar,0);setTimeout(restoreV34Topbar,500);
})();


/* ===== Original V178 inline script 5 id="v61-topbar-troubleshoot-script" ===== */
(function(){
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn(); }
  function shortNode(el){
    if(!el) return 'NOT FOUND';
    return el.tagName.toLowerCase()+(el.id?'#'+el.id:'')+(el.className?'.'+String(el.className).trim().replace(/\s+/g,'.'):'');
  }
  function cssInfo(el){
    if(!el) return null;
    var cs=getComputedStyle(el), r=el.getBoundingClientRect();
    return {
      node:shortNode(el),
      parent:shortNode(el.parentElement),
      position:cs.position,
      display:cs.display,
      top:cs.top,
      right:cs.right,
      left:cs.left,
      zIndex:cs.zIndex,
      transform:cs.transform,
      width:cs.width,
      rectTop:Math.round(r.top),
      rectRight:Math.round(r.right),
      rectLeft:Math.round(r.left),
      rectBottom:Math.round(r.bottom)
    };
  }
  function countSelectors(selector){
    var matches=[];
    for(var i=0;i<document.styleSheets.length;i++){
      var sh=document.styleSheets[i];
      var rules;
      try{ rules=sh.cssRules || sh.rules; }catch(e){ continue; }
      if(!rules) continue;
      for(var j=0;j<rules.length;j++){
        var rule=rules[j];
        var txt=rule.cssText||'';
        if(txt.indexOf(selector)!==-1) matches.push(txt.slice(0,240));
      }
    }
    return matches;
  }
  function ensurePanel(){
    var p=document.getElementById('atsrsTopbarTroublePanel');
    if(p) return p;
    p=document.createElement('div');
    p.id='atsrsTopbarTroublePanel';
    p.className='hidden';
    p.innerHTML='<h3>Topbar Troubleshoot Report</h3><div class="trouble-actions"><button class="trouble-fix" type="button" onclick="atsrsHardFixTopbar()">Apply Hard Fix</button><button class="trouble-close" type="button" onclick="document.getElementById(\'atsrsTopbarTroublePanel\').classList.add(\'hidden\')">Close</button></div><pre id="atsrsTopbarTroubleOutput">Press Troubleshoot.</pre>';
    document.body.appendChild(p);
    return p;
  }
  window.atsrsHardFixTopbar=function(){
    var app=document.getElementById('app');
    var top=document.querySelector('#app > .top-actions') || document.querySelector('.top-actions');
    if(!app||!top){ alert('App/top-actions not found'); return; }
    if(top.parentElement!==app) app.insertBefore(top, app.firstChild);
    top.setAttribute('style','position:fixed!important;top:18px!important;right:18px!important;left:auto!important;bottom:auto!important;z-index:2147483647!important;display:flex!important;align-items:center!important;gap:10px!important;transform:none!important;width:auto!important;height:auto!important;');
    var lang=top.querySelector('.lang-floating,.app-lang-switcher');
    if(lang) lang.setAttribute('style','position:relative!important;top:auto!important;right:auto!important;left:auto!important;bottom:auto!important;z-index:2147483647!important;transform:none!important;display:block!important;');
    var logout=document.getElementById('topLogoutBtn');
    if(logout) logout.setAttribute('style','width:auto!important;margin:0!important;background:#991b1b!important;color:#fff!important;border:1px solid #ef4444!important;padding:12px 14px!important;border-radius:12px!important;font-weight:800!important;display:block!important;position:relative!important;');
    var btn=document.getElementById('atsrsTopbarTroubleBtn');
    if(btn) btn.setAttribute('style','width:auto!important;margin:0!important;padding:12px 14px!important;border-radius:12px!important;border:1px solid #facc15!important;background:linear-gradient(135deg,#ca8a04,#eab308)!important;color:#07111d!important;font-weight:900!important;display:block!important;position:relative!important;');
    window.runTopbarTroubleshoot && window.runTopbarTroubleshoot('After Apply Hard Fix');
  };
  window.runTopbarTroubleshoot=function(label){
    var p=ensurePanel(); p.classList.remove('hidden');
    var out=document.getElementById('atsrsTopbarTroubleOutput');
    var top=document.querySelector('#app > .top-actions') || document.querySelector('.atsrs-global-top-actions') || document.querySelector('.atsrs-v56-top-actions') || document.querySelector('.top-actions');
    var lang=document.getElementById('appLangCircle');
    var logout=document.getElementById('topLogoutBtn');
    var y0=window.scrollY;
    var before=top?Math.round(top.getBoundingClientRect().top):null;
    var report=[];
    report.push('TEST: '+(label||'Manual troubleshoot'));
    report.push('Time: '+new Date().toLocaleString());
    report.push('ScrollY before: '+y0);
    report.push('Body classes: '+document.body.className);
    report.push('App hidden: '+(document.getElementById('app')?.classList.contains('hidden')));
    report.push('');
    report.push('TOP ACTIONS: '+JSON.stringify(cssInfo(top),null,2));
    report.push('LANG BUTTON: '+JSON.stringify(cssInfo(lang),null,2));
    report.push('LOGOUT: '+JSON.stringify(cssInfo(logout),null,2));
    report.push('');
    report.push('Topbar parent chain:');
    var x=top, chain=[]; while(x&&chain.length<8){chain.push(shortNode(x)); x=x.parentElement;} report.push(chain.join('  <-  '));
    report.push('');
    report.push('CSS rules containing .top-actions: '+countSelectors('.top-actions').length);
    countSelectors('.top-actions').slice(-12).forEach(function(r,i){report.push('RULE '+(i+1)+': '+r.replace(/\s+/g,' '));});
    report.push('');
    report.push('Running scroll movement test...');
    out.textContent=report.join('\n');
    var maxScroll=document.documentElement.scrollHeight-window.innerHeight;
    var target=Math.min(maxScroll, y0+350);
    window.scrollTo(0,target);
    setTimeout(function(){
      var after=top?Math.round(top.getBoundingClientRect().top):null;
      var y1=window.scrollY;
      report.push('');
      report.push('ScrollY after: '+y1);
      report.push('Top rectTop before: '+before);
      report.push('Top rectTop after: '+after);
      report.push('Delta: '+(after!==null&&before!==null ? (after-before) : 'N/A'));
      report.push('Expected for fixed topbar: Delta must be 0 or near 0.');
      report.push('Result: '+((after!==null&&before!==null&&Math.abs(after-before)<=2)?'PASS ✅ topbar is fixed':'FAIL ❌ topbar moves with page'));
      out.textContent=report.join('\n');
      window.scrollTo(0,y0);
    },250);
  };
  ready(function(){
    var top=document.querySelector('#app > .top-actions') || document.querySelector('.top-actions');
    if(top && !document.getElementById('atsrsTopbarTroubleBtn')){
      var b=document.createElement('button');
      b.type='button'; b.id='atsrsTopbarTroubleBtn'; b.textContent='Troubleshoot';
      b.onclick=function(){ window.runTopbarTroubleshoot && window.runTopbarTroubleshoot(); };
      top.appendChild(b);
    }
    ensurePanel();
  });
})();


/* ===== Original V178 inline script 6 id="v62-test-automation-script" ===== */
(function(){
  function el(id){ return document.getElementById(id); }
  function shown(node){ return !!node && getComputedStyle(node).display!=='none' && getComputedStyle(node).visibility!=='hidden'; }
  function add(result, level, title, detail, fixFn){ result.push({level:level,title:title,detail:detail||'',fixFn:fixFn||null}); }
  function ensurePanel(){
    var p=el('atsrsTestAutomationPanel'); if(p) return p;
    p=document.createElement('div'); p.id='atsrsTestAutomationPanel'; p.className='hidden';
    p.innerHTML='<h3>ATSRS Test Automation Report</h3><p class="qa-sub">Runs frontend QA checks, applies safe local fixes, and lists items requiring backend/manual work.</p><div class="qa-actions"><button class="qa-run" type="button" onclick="atsrsRunFullAutomation(false)">Run Test</button><button class="qa-fix" type="button" onclick="atsrsRunFullAutomation(true)">Run + Auto Fix</button><button class="qa-close" type="button" onclick="document.getElementById(\'atsrsTestAutomationPanel\').classList.add(\'hidden\')">Close</button></div><div id="atsrsQaOutput"></div>';
    document.body.appendChild(p); return p;
  }
  function hardFixTopbar(){
    var app=el('app'); var top=document.querySelector('#app > .top-actions') || document.querySelector('.top-actions');
    if(!app||!top) return false;
    if(top.parentElement!==app) app.insertBefore(top, app.firstChild);
    top.classList.remove('atsrs-v56-top-actions','atsrs-global-top-actions');
    top.style.cssText='position:fixed!important;top:18px!important;right:18px!important;left:auto!important;bottom:auto!important;z-index:2147483647!important;display:flex!important;align-items:center!important;gap:10px!important;transform:none!important;width:auto!important;height:auto!important;';
    var lang=top.querySelector('.lang-floating,.app-lang-switcher');
    if(lang) lang.style.cssText='position:relative!important;top:auto!important;right:auto!important;left:auto!important;bottom:auto!important;z-index:2147483647!important;transform:none!important;display:block!important;';
    var logout=el('topLogoutBtn');
    if(logout) logout.style.cssText='width:auto!important;margin:0!important;background:#991b1b!important;color:#fff!important;border:1px solid #ef4444!important;padding:12px 14px!important;border-radius:12px!important;font-weight:800!important;display:block!important;position:relative!important;';
    return true;
  }
  function fixRefScroll(){
    var fixed=0;
    var candidates=document.querySelectorAll('.ref-card,.cv-card,.panel');
    candidates.forEach(function(card){
      var text=(card.textContent||'').toLowerCase();
      if(text.indexOf('appraisal')!==-1 || text.indexOf('reference')!==-1 || text.indexOf('recommendation')!==-1 || text.indexOf('cv')!==-1){
        var lists=card.querySelectorAll('.preview-box,.ref-file-info,.ref-doc-list,.ref-upload-list,.cv-file-list,ul,tbody');
        lists.forEach(function(list){
          if(list && list.children && list.children.length>3){ list.classList.add('atsrs-ref-file-scroll'); fixed++; }
        });
      }
    });
    return fixed;
  }
  function fixMissingButtonStyles(){
    ['atsrsTopbarTroubleBtn','atsrsTestAutomationBtn'].forEach(function(id){ var b=el(id); if(b){b.style.width='auto';b.style.margin='0';} });
    return true;
  }
  function testTopbar(res, autoFix){
    var app=el('app'), top=document.querySelector('#app > .top-actions') || document.querySelector('.top-actions'), lang=el('appLangCircle'), logout=el('topLogoutBtn');
    if(!top){ add(res,'fail','Topbar not found','Language/logout container is missing.'); return; }
    if(!lang) add(res,'fail','App language button missing','appLangCircle not found.'); else add(res,'pass','App language button exists','appLangCircle found.');
    if(!logout) add(res,'fail','Logout button missing','topLogoutBtn not found.'); else add(res,'pass','Logout button exists','topLogoutBtn found.');
    var cs=getComputedStyle(top);
    if(cs.position==='fixed') add(res,'pass','Topbar CSS position is fixed','Current position: fixed.');
    else add(res,'fail','Topbar CSS position is not fixed','Current position: '+cs.position, hardFixTopbar);
    var y0=window.scrollY, before=Math.round(top.getBoundingClientRect().top), max=document.documentElement.scrollHeight-window.innerHeight, target=Math.min(max,y0+260);
    window.scrollTo(0,target);
    var after=Math.round(top.getBoundingClientRect().top); window.scrollTo(0,y0);
    if(Math.abs(after-before)<=2) add(res,'pass','Topbar scroll test passed','Before: '+before+', after: '+after+'.');
    else add(res,'fail','Topbar moves during scroll','Before: '+before+', after: '+after+'.', hardFixTopbar);
    if(autoFix) hardFixTopbar();
  }
  function testCoreDom(res){
    [['auth','Login section'],['app','App section'],['dashboardPage','Dashboard'],['certificatesPage','Certificates'],['refsPage','References/Appraisals'],['profilePage','Profile'],['navDashboard','Dashboard nav'],['navCertificates','Certificates nav'],['navRefs','Refs nav'],['navProfile','Profile nav']].forEach(function(x){
      add(res, el(x[0])?'pass':'fail', x[1]+' exists', x[0]+(el(x[0])?' found.':' missing.'));
    });
  }
  function testFunctions(res){
    ['changeLanguage','toggleAppLangMenu','showPage','renderAll','addCertificate','confirmLogout','logout','localTestLogin','saveProfile'].forEach(function(fn){
      add(res, typeof window[fn]==='function'?'pass':'fail', 'Function '+fn, typeof window[fn]==='function'?'Available.':'Missing or overwritten.');
    });
  }
  function testLanguage(res){
    try{
      if(typeof changeLanguage==='function'){
        changeLanguage('en');
        add(res,'pass','English-only language test','Only English is active.');
      } else add(res,'fail','English-only language test','changeLanguage function missing.');
    }catch(e){ add(res,'fail','English-only language test',String(e)); }
  }
  function testStorage(res){
    try{ localStorage.setItem('atsrs_qa_test','ok'); var ok=localStorage.getItem('atsrs_qa_test')==='ok'; localStorage.removeItem('atsrs_qa_test'); add(res,ok?'pass':'fail','LocalStorage availability',ok?'LocalStorage works.':'LocalStorage write/read failed.'); }
    catch(e){ add(res,'fail','LocalStorage blocked',String(e)); }
  }
  function testReferenceScroll(res, autoFix){
    var before=document.querySelectorAll('.atsrs-ref-file-scroll').length;
    var fixed=autoFix?fixRefScroll():0;
    var after=document.querySelectorAll('.atsrs-ref-file-scroll').length;
    add(res,(after>0||fixed>0||before>0)?'fixed':'warn','Reference/Appraisal file list scroll guard','Existing/fixed scroll containers: '+Math.max(after,before)+'. If no files are uploaded yet, this check can only prepare CSS.');
  }
  function testBackendLimits(res){
    add(res,'warn','Backend-required: real file storage','File persistence/upload must be verified with Supabase Storage or backend. Frontend can only preview/store local metadata.');
    add(res,'warn','Backend-required: WhatsApp/email alerts','Scheduled alerts cannot run from static HTML alone. Need backend cron/edge function.');
    add(res,'warn','Backend-required: OCR reliability','Tesseract loads from CDN; offline/weak network can fail. Production needs controlled OCR pipeline.');
    add(res,'warn','Backend-required: secure shared profile','Demo link is frontend-only. Real secure share requires backend auth, tokens and permissions.');
  }
  function renderOutput(results, autoFix){
    var out=el('atsrsQaOutput'); if(!out) return;
    var counts={pass:0,warn:0,fail:0,fixed:0}; results.forEach(function(r){counts[r.level]=(counts[r.level]||0)+1;});
    function group(level,label){
      var items=results.filter(function(r){return r.level===level;});
      if(!items.length) return '';
      return '<details open><summary class="qa-'+level+'">'+label+' ('+items.length+')</summary><ul>'+items.map(function(r){return '<li><b>'+r.title+'</b><br><span>'+r.detail+'</span></li>';}).join('')+'</ul></details>';
    }
    out.innerHTML='<div class="qa-summary"><div class="qa-box"><b class="qa-pass">'+counts.pass+'</b><span>PASS</span></div><div class="qa-box"><b class="qa-fixed">'+counts.fixed+'</b><span>FIXED</span></div><div class="qa-box"><b class="qa-warn">'+counts.warn+'</b><span>WARN</span></div><div class="qa-box"><b class="qa-fail">'+counts.fail+'</b><span>FAIL</span></div></div>'+
      '<p class="qa-sub">Mode: '+(autoFix?'Run + Auto Fix':'Run Test')+' · '+new Date().toLocaleString()+'</p>'+group('fail','Needs correction')+group('fixed','Auto-fix / guarded')+group('warn','Cannot be fully fixed from static frontend')+group('pass','Passed checks');
  }
  window.atsrsRunFullAutomation=function(autoFix){
    ensurePanel().classList.remove('hidden');
    var results=[];
    testCoreDom(results); testFunctions(results); testStorage(results); testLanguage(results); testTopbar(results, !!autoFix); testReferenceScroll(results, !!autoFix); testBackendLimits(results);
    if(autoFix){ fixMissingButtonStyles(); hardFixTopbar(); }
    renderOutput(results, !!autoFix);
  };
  ready(function(){
    var top=document.querySelector('#app > .top-actions') || document.querySelector('.top-actions');
    if(top && !el('atsrsTestAutomationBtn')){
      var b=document.createElement('button'); b.type='button'; b.id='atsrsTestAutomationBtn'; b.textContent='Test Automation';
      b.onclick=function(){ atsrsRunFullAutomation(false); };
      var trouble=el('atsrsTopbarTroubleBtn');
      if(trouble && trouble.parentElement===top) top.insertBefore(b,trouble); else top.appendChild(b);
    }
    ensurePanel();
  });
})();


/* ===== Original V178 inline script 7 id="v64-clean-login-topbar-fix-script" ===== */
(function(){
  function appVisible(){
    var app=document.getElementById('app');
    return !!(app && !app.classList.contains('hidden'));
  }
  function removeTempButtons(){
    ['atsrsTopbarTroubleBtn','atsrsTopbarTroublePanel','atsrsTestAutomationBtn','atsrsTestAutomationPanel'].forEach(function(id){
      var n=document.getElementById(id); if(n) n.remove();
    });
  }
  function syncBodyState(){
    document.body.classList.toggle('app-open', appVisible());
    document.body.classList.toggle('auth-open', !appVisible());
  }
  function dockTopbar(){
    var app=document.getElementById('app');
    var top=document.querySelector('body > .atsrs-v64-top-actions') || document.querySelector('.top-actions');
    if(!top) return;
    top.classList.remove('atsrs-global-top-actions','atsrs-v56-top-actions');
    top.classList.add('atsrs-v64-top-actions');
    if(app && top.parentElement!==app) app.insertBefore(top, app.firstChild);
    syncBodyState();
    top.style.setProperty('display',appVisible()?'flex':'none','important');
    top.style.setProperty('position','absolute','important');
    top.style.setProperty('top',window.innerWidth<=800?'12px':'18px','important');
    top.style.setProperty('right',window.innerWidth<=800?'12px':'18px','important');
    top.style.setProperty('left','auto','important');
    top.style.setProperty('bottom','auto','important');
    top.style.setProperty('z-index','2147483647','important');
    top.style.setProperty('transform','none','important');
    top.style.setProperty('width','auto','important');
    top.style.setProperty('height','auto','important');
    var lang=top.querySelector('.lang-floating,.app-lang-switcher');
    if(lang){
      lang.style.setProperty('position','relative','important');
      lang.style.setProperty('top','auto','important');
      lang.style.setProperty('right','auto','important');
      lang.style.setProperty('left','auto','important');
      lang.style.setProperty('bottom','auto','important');
      lang.style.setProperty('transform','none','important');
      lang.style.setProperty('display','block','important');
    }
    var logout=document.getElementById('topLogoutBtn');
    if(logout){
      logout.style.setProperty('display','inline-flex','important');
      logout.style.setProperty('position','relative','important');
      logout.style.setProperty('width','auto','important');
      logout.style.setProperty('margin','0','important');
      logout.style.setProperty('white-space','nowrap','important');
    }
    removeTempButtons();
  }
  function run(){ syncBodyState(); dockTopbar(); }
  ['openApp','showPage','renderAll','applyLanguage','changeLanguage','login','localTestLogin','logout','confirmLogout'].forEach(function(name){
    var base=window[name];
    if(typeof base==='function' && !base.__v64Dock){
      var wrapped=function(){ var r=base.apply(this,arguments); setTimeout(run,0); setTimeout(run,120); setTimeout(run,500); return r; };
      wrapped.__v64Dock=true; window[name]=wrapped;
    }
  });
  document.addEventListener('DOMContentLoaded',run);
  window.addEventListener('load',run);
  window.addEventListener('resize',run);
  window.addEventListener('scroll',function(){requestAnimationFrame(run);},{passive:true});
  setInterval(run,700);
  setTimeout(run,0); setTimeout(run,300); setTimeout(run,900);
})();


/* ===== Original V178 inline script 8  ===== */
(function(){
  function releaseBootIfNeeded(){
    try{
      var appEl=document.getElementById('app');
      var authEl=document.getElementById('auth');
      var localMode=localStorage.getItem('atsrs_auth_mode');
      var appOpen=appEl && !appEl.classList.contains('hidden');
      if(appOpen || localMode!=='local'){
        document.body.classList.remove('atsrs-booting');
      }
    }catch(e){
      document.body.classList.remove('atsrs-booting');
    }
  }
  window.addEventListener('load',function(){setTimeout(releaseBootIfNeeded,250);});
  setTimeout(releaseBootIfNeeded,1200);
})();


/* ===== Original V178 inline script 9 id="atsrs-v70-page-attached-top-actions-script" ===== */
(function(){
  function appVisible(){
    var app=document.getElementById('app');
    return !!(app && !app.classList.contains('hidden'));
  }
  function normaliseTopActions(){
    var app=document.getElementById('app');
    var top=document.querySelector('#app > .top-actions') ||
            document.querySelector('#app > .atsrs-global-top-actions') ||
            document.querySelector('#app > .atsrs-v56-top-actions') ||
            document.querySelector('#app > .atsrs-v64-top-actions') ||
            document.querySelector('body > .atsrs-v64-top-actions') ||
            document.querySelector('body > .atsrs-v56-top-actions') ||
            document.querySelector('body > .atsrs-global-top-actions') ||
            document.querySelector('body > .top-actions') ||
            document.querySelector('.top-actions');
    if(!app || !top) return;

    top.classList.remove('atsrs-v56-top-actions','atsrs-v64-top-actions');
    top.classList.add('top-actions','atsrs-global-top-actions');
    if(top.parentElement!==app){
      app.insertBefore(top, app.firstChild);
    }

    var visible=appVisible();
    top.style.setProperty('display',visible?'flex':'none','important');
    top.style.setProperty('position','absolute','important');
    top.style.setProperty('top',window.innerWidth<=800?'12px':'18px','important');
    top.style.setProperty('right',window.innerWidth<=800?'12px':'18px','important');
    top.style.setProperty('left','auto','important');
    top.style.setProperty('bottom','auto','important');
    top.style.setProperty('z-index','90','important');
    top.style.setProperty('transform','none','important');
    top.style.setProperty('will-change','auto','important');
    top.style.setProperty('width','auto','important');
    top.style.setProperty('height','auto','important');
    top.style.setProperty('margin','0','important');
    top.style.setProperty('padding','0','important');

    var lang=top.querySelector('.lang-floating,.app-lang-switcher');
    if(lang){
      lang.style.setProperty('position','relative','important');
      lang.style.setProperty('top','auto','important');
      lang.style.setProperty('right','auto','important');
      lang.style.setProperty('left','auto','important');
      lang.style.setProperty('bottom','auto','important');
      lang.style.setProperty('transform','none','important');
      lang.style.setProperty('display','block','important');
    }

    var menu=top.querySelector('.lang-menu');
    if(menu){
      menu.style.setProperty('position','absolute','important');
      menu.style.setProperty('top',window.innerWidth<=800?'52px':'56px','important');
      menu.style.setProperty('right','0','important');
      menu.style.setProperty('left','auto','important');
      menu.style.setProperty('bottom','auto','important');
    }

    var logout=document.getElementById('topLogoutBtn');
    if(logout){
      logout.style.setProperty('display','inline-flex','important');
      logout.style.setProperty('position','relative','important');
      logout.style.setProperty('width','auto','important');
      logout.style.setProperty('margin','0','important');
      logout.style.setProperty('white-space','nowrap','important');
    }
  }

  window.atsrsV70NormaliseTopActions=normaliseTopActions;
  window.forceTopControlsFixed=normaliseTopActions;
  window.v55DockTopActions=normaliseTopActions;

  ['openApp','showPage','renderAll','applyLanguage','changeLanguage','login','localTestLogin','logout','confirmLogout'].forEach(function(name){
    var base=window[name];
    if(typeof base==='function' && !base.__v70PageAttached){
      var wrapped=function(){
        var result=base.apply(this,arguments);
        setTimeout(normaliseTopActions,0);
        setTimeout(normaliseTopActions,120);
        setTimeout(normaliseTopActions,500);
        return result;
      };
      wrapped.__v70PageAttached=true;
      window[name]=wrapped;
    }
  });

  document.addEventListener('DOMContentLoaded',normaliseTopActions);
  window.addEventListener('load',normaliseTopActions);
  window.addEventListener('resize',normaliseTopActions);
  window.addEventListener('scroll',function(){requestAnimationFrame(normaliseTopActions);},{passive:true});
  setInterval(normaliseTopActions,80);
  setTimeout(normaliseTopActions,0);
  setTimeout(normaliseTopActions,300);
  setTimeout(normaliseTopActions,900);
})();


/* ===== Original V178 inline script 10 id="atsrs-v71-remove-fixed-portal-script" ===== */
(function(){
  function removeFixedPortal(){
    ['atsrsFixedPortalTopbar','atsrs-v63-portal-style','atsrs-v63-portal-script'].forEach(function(id){
      var n=document.getElementById(id);
      if(n) n.remove();
    });
    document.body.classList.remove('atsrs-app-visible','atsrs-auth-visible');
  }
  window.atsrsTogglePortalLangMenu=function(){};
  window.atsrsPortalChangeLanguage=function(l){
    if(typeof changeLanguage==='function') changeLanguage(l);
  };
  document.addEventListener('DOMContentLoaded',removeFixedPortal);
  window.addEventListener('load',removeFixedPortal);
  setTimeout(removeFixedPortal,0);
  setTimeout(removeFixedPortal,300);
  setInterval(removeFixedPortal,1000);
})();


/* ===== Original V178 inline script 11  ===== */
(function(){
  function getLang(){ return "en"; }
  try{
    Object.defineProperty(window,'lang',{
      configurable:true,
      get:function(){ return "en"; },
      set:function(v){ localStorage.setItem('atsrs_lang','en'); }
    });
  }catch(e){ window.lang='en'; }

  function forceLangApply(){
    try{ document.documentElement.lang='en'; document.documentElement.dir='ltr'; }catch(e){}
  }

  var prevChange = window.changeLanguage;
  window.changeLanguage=function(v){
    localStorage.setItem('atsrs_lang','en');
    var r = (typeof prevChange==='function') ? prevChange.apply(this,['en']) : undefined;
    try{ if(typeof applyLanguage==='function') applyLanguage(); }catch(e){}
    forceLangApply();
    setTimeout(forceLangApply,0);
    setTimeout(forceLangApply,150);
    setTimeout(forceLangApply,500);
    return r;
  };
})();


/* ===== Original V178 inline script 12 id="atsrs-v76-minimal-ui-and-audit-script" ===== */
(function(){
  'use strict';
  const BUILD='V120';
  window.atsrsV78EnglishOnlyNotice=function(){
    const m=document.getElementById('langMenu'); if(m)m.classList.add('hidden');
    const am=document.getElementById('appLangMenu'); if(am)am.classList.add('hidden');
  };
  function showModeInstruction(){const x=document.getElementById('modeInstruction');if(x)x.classList.add('active')}
  function hideModeInstruction(){const x=document.getElementById('modeInstruction');if(x)x.classList.remove('active')}
  const baseValidateUseMode=window.validateUseMode;
  window.validateUseMode=function(){
    const ok=typeof baseValidateUseMode==='function'?baseValidateUseMode():true;
    if(ok){hideModeInstruction();}
    else{showModeInstruction();const r=document.getElementById('modeRule');if(r)r.classList.remove('active');}
    return ok;
  };
  const baseSetUseMode=window.setUseMode;
  window.setUseMode=function(mode){if(typeof baseSetUseMode==='function')baseSetUseMode(mode);hideModeInstruction();};
  function forceEnglish(){
    try{localStorage.setItem('atsrs_lang','en');localStorage.setItem('lang','en')}catch(e){}
    window.lang='en';
    document.documentElement.setAttribute('lang','en');
    document.documentElement.setAttribute('dir','ltr');
    ['langCircle','appLangCircle'].forEach(id=>{const b=document.getElementById(id);if(b)b.textContent='🇬🇧';});
    ['langMenu','appLangMenu'].forEach(id=>{const m=document.getElementById(id);if(m)m.classList.add('hidden');});
    document.querySelectorAll('.lang-menu button').forEach(b=>{b.classList.toggle('v76-selected-lang',true);b.setAttribute('aria-current','true')});
  }
  function simplifyModeError(){const err=document.getElementById('modeErrorText')||document.querySelector('.mode-error-text');if(err&&err.id!=='modeErrorText')err.id='modeErrorText'}
  window.atsrsV76ToggleSidebar=function(){const app=document.getElementById('app');const side=document.querySelector('#app .sidebar');if(!app||app.classList.contains('hidden'))return;if(window.innerWidth<=800&&side){side.classList.toggle('v76-mobile-closed');return;}document.body.classList.toggle('v76-sidebar-collapsed');};
  function v78Apply(){forceEnglish();simplifyModeError();}
  function row(label,state,detail){return{label,state,detail}}
  function computed(el,prop){return el?getComputedStyle(el).getPropertyValue(prop):''}
  function duplicateIds(){const map={},dups=[];document.querySelectorAll('[id]').forEach(e=>{map[e.id]=(map[e.id]||0)+1});Object.keys(map).forEach(k=>{if(map[k]>1)dups.push(k+' ×'+map[k])});return dups;}
  function riskyFunctionRepeats(){
    const src=document.documentElement.outerHTML;
    const names=[...src.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]);
    const count={};names.forEach(n=>count[n]=(count[n]||0)+1);
    const legacyAllow=new Set(['status','getManagedFile','saveManagedFile','handleManagedUpload','previewManagedFile','downloadManagedFile','deleteManagedFile','ensureManagedCard','renderManagedFiles','ready','ensurePanel','appVisible','langFromFlag','activeLang','runSoon']);
    return Object.entries(count).filter(([n,c])=>c>1&&!legacyAllow.has(n)).map(([n,c])=>n+' ×'+c).slice(0,20);
  }
  function rectInfo(el){if(!el)return null;const r=el.getBoundingClientRect();return{left:Math.round(r.left),right:Math.round(r.right),top:Math.round(r.top),height:Math.round(r.height),width:Math.round(r.width)}}
  window.atsrsV76RunAudit=function(){
    v78Apply();
    const results=[];
    const langBtns=[document.getElementById('langCircle'),document.getElementById('appLangCircle')].filter(Boolean);
    const nonEn=langBtns.filter(b=>!(b.textContent||'').includes('🇬🇧')).length;
    results.push(row('English-only mode',nonEn===0?'PASS':'FAIL',nonEn===0?'Only English is active. extra language switches are disabled for now.':'A non-English flag is still visible.'));
    const menusVisible=[...document.querySelectorAll('.lang-menu')].filter(m=>computed(m,'display')!=='none'&&!m.classList.contains('hidden')).length;
    results.push(row('Language dropdown disabled',menusVisible===0?'PASS':'WARN',menusVisible===0?'Language dropdowns are hidden until multilingual build is reintroduced.':'A language menu is still opening.'));
    const toggle=document.getElementById('sidebarToggleBtn'),brand=document.querySelector('#app .sidebar .brand'),side=document.querySelector('#app .sidebar');
    const tr=rectInfo(toggle),br=rectInfo(brand),sr=rectInfo(side);
    const rightGap=(tr&&sr)?Math.round(sr.right-tr.right):999;
    const sameLine=(tr&&br)?Math.abs((tr.top+tr.height/2)-(br.top+br.height/2))<=4:false;
    results.push(row('Hamburger placement',toggle&&rightGap<=22&&sameLine?'PASS':'WARN',toggle?`Right gap: ${rightGap}px. Same line with ATSRS: ${sameLine}. Size: ${tr.width}×${tr.height}px.`:'Hamburger button missing.'));
    const before=document.body.classList.contains('v76-sidebar-collapsed');
    if(toggle&&window.innerWidth>800){toggle.click();var changed=document.body.classList.contains('v76-sidebar-collapsed')!==before;toggle.click();}else{var changed=!!toggle;}
    results.push(row('Sidebar toggle function',changed?'PASS':'FAIL',changed?'Sidebar collapse state changes when hamburger is clicked.':'Hamburger click did not change sidebar state.'));
    const modeBox=document.getElementById('modeChoiceBox');
    results.push(row('Mode warning style',modeBox&&computed(modeBox,'border-top-width')==='0px'?'PASS':'WARN','Personal/Company warning should be simple text with a small red icon.'));
    const activeNav=document.querySelector('#app .nav button.active');
    const navBg=(computed(activeNav,'background-image')||'')+(computed(activeNav,'background-color')||'');
    results.push(row('Menu simplicity',navBg.includes('gradient')?'WARN':'PASS','Left menu should be minimal without blue gradient selection.'));
    const top=document.querySelector('#app .top-actions');
    results.push(row('Top actions',top&&computed(top,'position')==='fixed'?'PASS':'WARN','Language/logout/test controls should remain available in app view.'));
    const dups=duplicateIds();
    results.push(row('Duplicate IDs',dups.length?'FAIL':'PASS',dups.length?dups.join(', '):'No duplicate element IDs found.'));
    const fn=riskyFunctionRepeats();
    results.push(row('Duplicate functions',fn.length?'WARN':'PASS',fn.length?fn.join(', '):'No risky duplicate function declarations found. Legacy overrides ignored.'));
    const sx=Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-window.innerWidth;
    results.push(row('Horizontal overflow',sx>2?'WARN':'PASS',sx>2?'Page is wider than viewport by '+Math.round(sx)+'px.':'No visible horizontal overflow.'));
    const visibleFetch=[...document.querySelectorAll('p,div,span')].filter(e=>(e.textContent||'').toLowerCase().includes('failed to fetch')).length;
    results.push(row('Fetch errors',visibleFetch?'WARN':'PASS',visibleFetch?'A visible Failed to fetch message is present. Usually network/Supabase/VPN related.':'No visible Failed to fetch message.'));
    const counts=results.reduce((a,r)=>(a[r.state]=(a[r.state]||0)+1,a),{});
    const reportText=results.map(r=>`${r.state}\n${r.label}\n${r.detail}`).join('\n\n');
    const body=results.map(r=>`<div class="v76-audit-row"><div class="v76-status v76-${r.state.toLowerCase()}">${r.state}</div><div><b>${r.label}</b><p>${r.detail}</p></div></div>`).join('');
    const old=document.getElementById('v76AuditModal');if(old)old.remove();
    const modal=document.createElement('div');modal.id='v76AuditModal';modal.className='v76-audit-modal';
    modal.innerHTML=`<div class="v76-audit-card"><div class="v76-audit-head"><h3>ATSRS ${BUILD} Audit</h3><div style="display:flex;gap:8px"><button class="v76-copy-btn" id="v78CopyAuditBtn">Copy report</button><button class="v76-audit-close" onclick="document.getElementById('v76AuditModal').remove()">Close</button></div></div><div class="v76-summary"><span class="v76-chip v76-pass">PASS ${counts.PASS||0}</span><span class="v76-chip v76-warn">WARN ${counts.WARN||0}</span><span class="v76-chip v76-fail">FAIL ${counts.FAIL||0}</span></div>${body}</div>`;
    document.body.appendChild(modal);
    const copy=document.getElementById('v78CopyAuditBtn');if(copy)copy.onclick=()=>{navigator.clipboard&&navigator.clipboard.writeText(reportText);copy.textContent='Copied';};
  };
  const originalChangeLanguage=window.changeLanguage;
  window.changeLanguage=function(){
    let r;
    if(typeof originalChangeLanguage==='function')r=originalChangeLanguage.call(this,'en');
    setTimeout(v78Apply,0);setTimeout(v78Apply,160);return r;
  };
  window.toggleLangMenu=window.atsrsV78EnglishOnlyNotice;
  window.toggleAppLangMenu=window.atsrsV78EnglishOnlyNotice;
  document.addEventListener('DOMContentLoaded',v78Apply);window.addEventListener('load',v78Apply);setTimeout(v78Apply,0);setTimeout(v78Apply,400);setInterval(v78Apply,1000);
})();


/* ===== Original V178 inline script 13 id="atsrs-v85-remember-and-compact-login-script" ===== */
(function(){
  'use strict';
  function el(id){return document.getElementById(id)}
  function loadRememberedLogin(){
    const remember=el('rememberMe');
    const email=el('loginEmail');
    if(!remember||!email)return;
    const saved=localStorage.getItem('atsrs_remember_me')==='1';
    remember.checked=saved;
    if(saved){
      const savedEmail=localStorage.getItem('atsrs_saved_login_email')||'';
      if(savedEmail&&!email.value)email.value=savedEmail;
    }
  }
  function saveRememberPreference(){
    const remember=el('rememberMe');
    const email=el('loginEmail');
    if(!remember||!email)return;
    if(remember.checked){
      localStorage.setItem('atsrs_remember_me','1');
      localStorage.setItem('atsrs_saved_login_email',(email.value||'').trim());
      if(window.useMode)localStorage.setItem('atsrs_use_mode',window.useMode);
    }else{
      localStorage.removeItem('atsrs_remember_me');
      localStorage.removeItem('atsrs_saved_login_email');
    }
  }
  const baseLogin=window.login;
  window.login=function(){
    saveRememberPreference();
    return typeof baseLogin==='function'?baseLogin.apply(this,arguments):undefined;
  };
  const baseLocalTestLogin=window.localTestLogin;
  window.localTestLogin=function(){
    saveRememberPreference();
    return typeof baseLocalTestLogin==='function'?baseLocalTestLogin.apply(this,arguments):undefined;
  };
  document.addEventListener('DOMContentLoaded',loadRememberedLogin);
  window.addEventListener('load',function(){setTimeout(loadRememberedLogin,80)});
  setTimeout(loadRememberedLogin,0);
})();


/* ===== Original V178 inline script 14 id="atsrs-v87-social-auth-script" ===== */
(function(){
  'use strict';
  const PROVIDERS={google:'google',microsoft:'azure',linkedin:'linkedin_oidc'};
  const LABELS={google:'Google',microsoft:'Microsoft',linkedin:'LinkedIn'};
  function messageTarget(flow){
    return document.getElementById(flow==='register'?'regMsg':'loginMsg') || document.getElementById('loginMsg');
  }
  function getUseModeForSocial(){
    try{return window.useMode || localStorage.getItem('atsrs_use_mode') || '';}catch(e){return window.useMode || '';}
  }
  function validateModeForSocial(flow){
    if(typeof window.validateUseMode==='function')return window.validateUseMode();
    const mode=getUseModeForSocial();
    if(mode==='personal'||mode==='company')return true;
    const target=messageTarget(flow);
    if(target)target.textContent='Select Personal or Corporate account to register.';
    return false;
  }
  window.atsrsSocialAuth=async function(providerKey,flow){
    const label=LABELS[providerKey]||providerKey;
    const provider=PROVIDERS[providerKey];
    const target=messageTarget(flow);
    if(target)target.textContent='';
    if(!validateModeForSocial(flow)){try{document.getElementById('modeChoiceBox')?.scrollIntoView({behavior:'smooth',block:'center'});}catch(e){}return;}
    if(window.useMode){try{localStorage.setItem('atsrs_use_mode',window.useMode);}catch(e){}}
    if(!window.supabaseClient || !window.supabaseClient.auth || typeof window.supabaseClient.auth.signInWithOAuth!=='function'){
      if(target)target.textContent=label+' sign-in will be available after OAuth is configured in Supabase.';
      return;
    }
    try{
      const redirectTo=(typeof window.APP_URL==='string'&&window.APP_URL)?window.APP_URL:(window.location.origin+window.location.pathname);
      const result=await window.supabaseClient.auth.signInWithOAuth({provider:provider,options:{redirectTo:redirectTo}});
      if(result && result.error && target)target.textContent=result.error.message || (label+' sign-in failed.');
    }catch(e){
      if(target)target.textContent=(e&&e.message)?e.message:(label+' sign-in is not configured yet.');
    }
  };
})();


/* ===== Original V178 inline script 15  ===== */
(function(){
  var desiredHTML='<span class="intro-kicker-main">ATSRS Platform</span><span class="intro-kicker-sub">Automated Tracking <span class="meaning-and">&amp;</span> Reporting System</span>';
  var applying=false;
  function atsrsCompactMeaning(){
    var el=document.getElementById('introKicker');
    if(!el || applying)return;
    if(el.innerHTML!==desiredHTML){
      applying=true;
      el.innerHTML=desiredHTML;
      applying=false;
    }
  }
  atsrsCompactMeaning();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',atsrsCompactMeaning);
  window.addEventListener('load',atsrsCompactMeaning);
  [0,100,300,800,1500].forEach(function(ms){setTimeout(atsrsCompactMeaning,ms);});
  var baseApplyLanguage=window.applyLanguage;
  if(typeof baseApplyLanguage==='function'){
    window.applyLanguage=function(){
      var result=baseApplyLanguage.apply(this,arguments);
      atsrsCompactMeaning();
      return result;
    };
  }
  var observer=new MutationObserver(function(){atsrsCompactMeaning();});
  var startObserver=function(){
    var el=document.getElementById('introKicker');
    if(el)observer.observe(el,{childList:true,characterData:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startObserver); else startObserver();
})();


/* ===== Original V178 inline script 16  ===== */
(function(){
  'use strict';
  const BUILD = 'ATSRS V168';
  const UPDATE = 'Last Update: 01 Jul 2026';
  const TEST = 'TEST BUILD';
  const ACCOUNT_LOGIN = 'Select Personal or Corporate account to login.';
  const ACCOUNT_REGISTER = 'Select Personal or Corporate account to register.';
  const ATSRS_MEANING = 'Automated Tracking & Reporting System';
  function byId(id){ return document.getElementById(id); }
  function currentAccountMode(){
    return window.useMode || localStorage.getItem('atsrs_use_mode') || '';
  }
  function applyBuildBadge(){
    const rows = document.querySelectorAll('.build-badge div');
    if(rows[0]) rows[0].textContent = BUILD;
    if(rows[1]) rows[1].textContent = UPDATE;
    if(rows[2]) rows[2].textContent = TEST;
  }
  function lockIntro(){
    const kicker = byId('introKicker');
    if(kicker){
      kicker.innerHTML = '<span class="intro-kicker-main">ATSRS Platform</span><span class="intro-kicker-sub">Automated Tracking <span class="meaning-and">&amp;</span> Reporting System</span>';
    }
    const title = byId('introTitle');
    if(title) title.textContent = 'Documents, expiry alerts and profile sharing.';
    const text = byId('introText');
    if(text) text.textContent = 'Keep information organized and stay compliant.';
    const subtitle = byId('authSubtitle');
    if(subtitle) subtitle.textContent = ATSRS_MEANING;
  }
  function showAccountWarning(kind){
    const box = byId('modeChoiceBox');
    const rule = byId('modeRule');
    const instruction = byId('modeInstruction');
    const msg = kind === 'register' ? ACCOUNT_REGISTER : ACCOUNT_LOGIN;
    if(box) box.classList.add('mode-error');
    if(rule){ rule.textContent = msg; rule.classList.add('active'); }
    if(instruction){ instruction.innerHTML = '<span class="mode-instruction-icon">!</span><span>'+msg+'</span>'; instruction.classList.add('active'); }
  }
  function clearAccountWarning(){
    const box = byId('modeChoiceBox');
    const rule = byId('modeRule');
    const instruction = byId('modeInstruction');
    if(box) box.classList.remove('mode-error');
    if(rule) rule.classList.remove('active');
    if(instruction) instruction.classList.remove('active');
  }
  function requireAccount(kind){
    if(currentAccountMode()){ clearAccountWarning(); return true; }
    showAccountWarning(kind);
    const box = byId('modeChoiceBox');
    if(box && box.scrollIntoView) box.scrollIntoView({behavior:'smooth', block:'center'});
    return false;
  }
  function scrollToRegister(){
    const target = byId('registerBox') || byId('registerForm') || byId('createBox') || byId('signupSocialArea');
    if(target && target.scrollIntoView){ setTimeout(()=>target.scrollIntoView({behavior:'smooth', block:'center'}), 80); }
  }
  function bindValidation(){
    const loginBtn = byId('loginBtn');
    const testBtn = byId('localTestBtn');
    const createBtn = byId('createBtn');
    if(loginBtn && !loginBtn.dataset.cuBound){
      const old = loginBtn.onclick;
      loginBtn.onclick = function(e){ if(!requireAccount('login')) return false; return old ? old.call(this,e) : true; };
      loginBtn.dataset.cuBound = '1';
    }
    if(testBtn && !testBtn.dataset.cuBound){
      const old = testBtn.onclick;
      testBtn.onclick = function(e){ if(!requireAccount('login')) return false; return old ? old.call(this,e) : true; };
      testBtn.dataset.cuBound = '1';
    }
    if(createBtn && !createBtn.dataset.cuBound){
      const old = createBtn.onclick;
      createBtn.onclick = function(e){ if(!requireAccount('register')) return false; const r = old ? old.call(this,e) : true; scrollToRegister(); return r; };
      createBtn.dataset.cuBound = '1';
    }
    ['personalModeBtn','companyModeBtn'].forEach(id=>{
      const btn = byId(id);
      if(btn && !btn.dataset.cuClear){ btn.addEventListener('click', clearAccountWarning); btn.dataset.cuClear='1'; }
    });
  }
  function boot(){ applyBuildBadge(); lockIntro(); bindValidation(); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.addEventListener('load', boot);
  setTimeout(boot, 100);
  setTimeout(boot, 700);
})();


/* ===== Original V178 inline script 17 id="atsrs-v110-clean-register-flow-script" ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V179';
  var UPDATE='Last Update: 01 Jul 2026';
  var TEST='TEST BUILD';
  var pendingProvider=null;
  var baseRegister=window.register;
  var baseSocialAuth=window.atsrsSocialAuth;
  var baseSetUseMode=window.setUseMode;
  var baseOpenApp=window.openApp;

  function byId(id){return document.getElementById(id);}
  function currentMode(){
    var p=byId('personalModeBtn'), c=byId('companyModeBtn');
    if(p && p.classList.contains('active')) return 'personal';
    if(c && c.classList.contains('active')) return 'company';
    try{
      var m=window.useMode || localStorage.getItem('atsrs_use_mode') || '';
      return (m==='personal'||m==='company') ? m : '';
    }catch(e){return window.useMode || '';}
  }
  function providerLabel(p){return p==='microsoft'?'Microsoft':p==='linkedin'?'LinkedIn':'Google';}
  function updateBuild(){
    var rows=document.querySelectorAll('.build-badge div');
    if(rows[0])rows[0].textContent=BUILD;
    if(rows[1])rows[1].textContent=UPDATE;
    if(rows[2])rows[2].textContent=TEST;
  }
  function clearOldWarnings(){
    ['modeRule','modeInstruction'].forEach(function(id){var el=byId(id);if(el){el.classList.remove('active');el.style.display='none';}});
    var mc=byId('modeChoiceBox'); if(mc) mc.classList.remove('mode-error');
    ['loginMsg','regMsg'].forEach(function(id){
      var el=byId(id); if(el && /Select Personal or Corporate account/i.test(el.textContent||'')) el.textContent='';
    });
  }
  function ensureRegisterAccountArea(){
    var rb=byId('registerBox'), title=byId('registerTitle'), choice=byId('modeChoiceBox');
    if(!rb || !title || !choice) return null;
    var area=byId('registerAccountTypeArea');
    if(!area){
      area=document.createElement('div');
      area.id='registerAccountTypeArea';
      title.insertAdjacentElement('afterend',area);
    }
    if(choice.parentElement!==area) area.insertBefore(choice,area.firstChild);
    var notice=byId('registerAccountNotice');
    if(!notice){
      notice=document.createElement('div');
      notice.id='registerAccountNotice';
      notice.innerHTML='<div class="notice-icon">✓</div><div><b id="registerAccountNoticeTitle">Choose Account Type</b><span id="registerAccountNoticeText">Select Personal or Corporate before creating your ATSRS account.</span></div>';
      area.appendChild(notice);
    }else if(notice.parentElement!==area){area.appendChild(notice);}
    updateNotice();
    return area;
  }
  function updateNotice(){
    var mode=currentMode();
    var area=byId('registerAccountTypeArea');
    if(area) area.classList.toggle('needs-choice',!mode);
    var title=byId('registerAccountNoticeTitle'), text=byId('registerAccountNoticeText');
    if(!title||!text)return;
    if(mode==='personal'){
      title.textContent='';
      text.textContent='Create a personal profile to keep documents, certificates, references, appraisals and expiry alerts organized.';
    }else if(mode==='company'){
      title.textContent='Corporate Account';
      text.textContent='Create an organization account for personnel documents, expiry tracking, compliance readiness and controlled profile sharing.';
    }else if(pendingProvider){
      title.textContent='Choose Account Type';
      text.textContent='Select Personal or Corporate to continue registration with '+providerLabel(pendingProvider)+'.';
    }else{
      title.textContent='Choose Account Type';
      text.textContent='Select Personal or Corporate before creating your ATSRS account.';
    }
  }
  function openRegisterAndScroll(){
    pendingProvider=pendingProvider||null;
    clearOldWarnings();
    try{
      if(typeof window.hideAuthBoxes==='function') window.hideAuthBoxes();
      else{
        ['loginBox','forgotBox','newPasswordBox'].forEach(function(id){var el=byId(id);if(el)el.classList.add('hidden');});
      }
      var rb=byId('registerBox'); if(rb) rb.classList.remove('hidden');
    }catch(e){}
    setTimeout(function(){
      var area=ensureRegisterAccountArea();
      clearOldWarnings();
      updateNotice();
      if(area && area.scrollIntoView) area.scrollIntoView({behavior:'smooth',block:'center'});
    },80);
    return false;
  }
  function canRegister(){
    ensureRegisterAccountArea();
    updateNotice();
    var ok=!!currentMode();
    var area=byId('registerAccountTypeArea');
    if(area) area.classList.toggle('needs-choice',!ok);
    if(!ok && area && area.scrollIntoView) area.scrollIntoView({behavior:'smooth',block:'center'});
    return ok;
  }
  function continuePendingProvider(){
    if(!pendingProvider || !currentMode()) return;
    var provider=pendingProvider;
    pendingProvider=null;
    updateNotice();
    setTimeout(function(){
      if(typeof baseSocialAuth==='function') baseSocialAuth(provider,'register');
    },220);
  }

  /* Login does not ask for Personal/Corporate anymore. The mode is resolved after sign-in/profile load. */
  window.validateUseMode=function(){return true;};

  window.login=async function(){
    var email=(byId('loginEmail')&&byId('loginEmail').value||'').trim();
    var password=(byId('loginPassword')&&byId('loginPassword').value||'').trim();
    var msg=byId('loginMsg'); if(msg)msg.textContent='';
    if(!email||!password){if(msg)msg.textContent=(typeof tr==='function'?tr('enterLogin'):'Enter email and password.');return;}
    if(typeof markEmail==='function' && byId('loginEmail') && byId('loginEmailRule') && !markEmail(byId('loginEmail'),byId('loginEmailRule'))) return;
    if(!window.supabaseClient){if(msg)msg.textContent='Supabase library did not load.';return;}
    try{
      var res=await window.supabaseClient.auth.signInWithPassword({email:email,password:password});
      if(res.error){if(msg)msg.textContent=res.error.message;return;}
      window.currentUser=res.data.user;
      try{localStorage.setItem('atsrs_auth_mode','supabase');}catch(e){}
      if(typeof window.openApp==='function') window.openApp();
    }catch(e){if(msg)msg.textContent=(typeof tr==='function'?tr('connection'):'Connection failed.');}
  };
  window.localTestLogin=function(){
    window.currentUser={id:'local_test_user',email:'local-test@atsrs.com'};
    try{
      localStorage.setItem('atsrs_auth_mode','local');
      if(!localStorage.getItem('atsrs_use_mode')) localStorage.setItem('atsrs_use_mode','personal');
    }catch(e){}
    if(typeof window.openApp==='function') window.openApp();
  };
  window.showRegister=function(){pendingProvider=null;return openRegisterAndScroll();};
  window.register=function(){
    if(!canRegister()) return false;
    if(typeof baseRegister==='function') return baseRegister.apply(this,arguments);
    return false;
  };
  window.atsrsSocialAuth=function(providerKey,flow){
    if(!currentMode()){
      pendingProvider=providerKey;
      openRegisterAndScroll();
      updateNotice();
      return false;
    }
    pendingProvider=null;
    if(typeof baseSocialAuth==='function') return baseSocialAuth(providerKey,'register');
    return false;
  };
  window.setUseMode=function(mode){
    if(mode!=='personal' && mode!=='company') return;
    if(typeof baseSetUseMode==='function') baseSetUseMode(mode);
    else{
      window.useMode=mode;
      try{localStorage.setItem('atsrs_use_mode',mode);}catch(e){}
      var p=byId('personalModeBtn'), c=byId('companyModeBtn');
      if(p)p.classList.toggle('active',mode==='personal');
      if(c)c.classList.toggle('active',mode==='company');
      document.body.classList.toggle('personal-mode',mode==='personal');
      document.body.classList.toggle('company-mode',mode==='company');
    }
    clearOldWarnings();
    ensureRegisterAccountArea();
    updateNotice();
    continuePendingProvider();
  };

  function bind(){
    updateBuild();
    clearOldWarnings();
    var create=byId('createBtn'); if(create) create.onclick=function(e){if(e)e.preventDefault();pendingProvider=null;return openRegisterAndScroll();};
    var login=byId('loginBtn'); if(login) login.onclick=function(e){if(e)e.preventDefault();return window.login();};
    var test=byId('localTestBtn'); if(test) test.onclick=function(e){if(e)e.preventDefault();return window.localTestLogin();};
    var reg=byId('registerBtn'); if(reg) reg.onclick=function(e){if(e)e.preventDefault();return window.register();};
    [['socialGoogleBtn','google'],['socialMicrosoftBtn','microsoft'],['socialLinkedInBtn','linkedin']].forEach(function(pair){
      var b=byId(pair[0]); if(b) b.onclick=function(e){if(e)e.preventDefault();return window.atsrsSocialAuth(pair[1],'register');};
    });
    var rb=byId('registerBox'); if(rb && !rb.classList.contains('hidden')) ensureRegisterAccountArea();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind); else bind();
  window.addEventListener('load',bind);
  [100,400,900,1600].forEach(function(ms){setTimeout(bind,ms);});
})();


/* ===== Original V178 inline script 18 id="atsrs-v111-register-choice-script" ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V179';
  var UPDATE='Last Update: 01 Jul 2026';
  var TEST='TEST BUILD';
  var selectedMode='';
  var pendingProvider=null;
  var baseRegister=window.register;
  var baseSocialAuth=window.atsrsSocialAuth;
  function byId(id){return document.getElementById(id);}
  function providerLabel(p){return p==='microsoft'?'Microsoft':p==='linkedin'?'LinkedIn':'Google';}
  function updateBuild(){
    var rows=document.querySelectorAll('.build-badge div');
    if(rows[0]) rows[0].textContent=BUILD;
    if(rows[1]) rows[1].textContent=UPDATE;
    if(rows[2]) rows[2].textContent=TEST;
  }
  function setButtons(mode){
    selectedMode=mode || '';
    var p=byId('personalModeBtn'), c=byId('companyModeBtn');
    if(p) p.classList.toggle('active',selectedMode==='personal');
    if(c) c.classList.toggle('active',selectedMode==='company');
  }
  function clearOldWarnings(){
    ['modeRule','modeInstruction'].forEach(function(id){var el=byId(id); if(el){el.classList.remove('active'); el.style.display='none'; el.textContent='';}});
    var mc=byId('modeChoiceBox'); if(mc) mc.classList.remove('mode-error');
    ['loginMsg','regMsg'].forEach(function(id){var el=byId(id); if(el && /Select Personal or Corporate account/i.test(el.textContent||'')) el.textContent='';});
  }
  function ensureRegisterAccountArea(){
    var rb=byId('registerBox'), title=byId('registerTitle'), choice=byId('modeChoiceBox');
    if(!rb || !title || !choice) return null;
    var area=byId('registerAccountTypeArea');
    if(!area){
      area=document.createElement('div');
      area.id='registerAccountTypeArea';
      title.insertAdjacentElement('afterend',area);
    }
    if(choice.parentElement!==area) area.insertBefore(choice,area.firstChild);
    var notice=byId('registerAccountNotice');
    if(!notice){
      notice=document.createElement('div');
      notice.id='registerAccountNotice';
      notice.innerHTML='<div class="notice-icon">!</div><div><b id="registerAccountNoticeTitle">Choose Account Type</b><span id="registerAccountNoticeText">Select Personal or Corporate before creating your ATSRS account.</span></div>';
      area.appendChild(notice);
    }else if(notice.parentElement!==area){area.appendChild(notice);}
    updateNotice();
    return area;
  }
  function updateNotice(){
    var area=byId('registerAccountTypeArea');
    var notice=byId('registerAccountNotice');
    var icon=notice?notice.querySelector('.notice-icon'):null;
    var title=byId('registerAccountNoticeTitle'), text=byId('registerAccountNoticeText');
    if(area) area.classList.toggle('needs-choice',!selectedMode);
    if(!notice || !title || !text) return;
    notice.classList.toggle('choice-missing',!selectedMode);
    notice.classList.toggle('choice-selected',!!selectedMode);
    if(!selectedMode){
      if(icon) icon.textContent='!';
      title.textContent='Choose Account Type';
      text.textContent=pendingProvider ? ('Select Personal or Corporate to continue registration with '+providerLabel(pendingProvider)+'.') : 'Select Personal or Corporate before creating your ATSRS account.';
    }else if(selectedMode==='personal'){
      if(icon) icon.textContent='✓';
      title.textContent='';
      text.textContent='Create a personal profile to keep documents, certificates, references, appraisals and expiry alerts organized.';
    }else{
      if(icon) icon.textContent='✓';
      title.textContent='Corporate Account';
      text.textContent='Create an organization account to manage personnel, compliance records, shared documents and workforce information.';
    }
  }
  function showRegisterOnly(){
    ['loginBox','forgotBox','newPasswordBox'].forEach(function(id){var el=byId(id); if(el) el.classList.add('hidden');});
    var rb=byId('registerBox'); if(rb) rb.classList.remove('hidden');
  }
  function openRegister(provider){
    pendingProvider=provider || null;
    setButtons('');
    clearOldWarnings();
    showRegisterOnly();
    var area=ensureRegisterAccountArea();
    updateNotice();
    setTimeout(function(){area=ensureRegisterAccountArea(); updateNotice(); if(area && area.scrollIntoView) area.scrollIntoView({behavior:'smooth',block:'center'});},90);
    return false;
  }
  function continueProvider(){
    if(!pendingProvider || !selectedMode) return;
    var p=pendingProvider;
    pendingProvider=null;
    updateNotice();
    try{localStorage.setItem('atsrs_use_mode',selectedMode); window.useMode=selectedMode;}catch(e){}
    setTimeout(function(){if(typeof baseSocialAuth==='function') baseSocialAuth(p,'register');},180);
  }
  function bind(){
    updateBuild(); clearOldWarnings();
    var create=byId('createBtn'); if(create) create.onclick=function(e){if(e)e.preventDefault(); return openRegister(null);};
    [['socialGoogleBtn','google'],['socialMicrosoftBtn','microsoft'],['socialLinkedInBtn','linkedin']].forEach(function(pair){
      var b=byId(pair[0]); if(b) b.onclick=function(e){if(e)e.preventDefault(); return openRegister(pair[1]);};
    });
    var p=byId('personalModeBtn'); if(p) p.onclick=function(e){if(e)e.preventDefault(); setButtons('personal'); updateNotice(); continueProvider(); return false;};
    var c=byId('companyModeBtn'); if(c) c.onclick=function(e){if(e)e.preventDefault(); setButtons('company'); updateNotice(); continueProvider(); return false;};
    var reg=byId('registerBtn'); if(reg) reg.onclick=function(e){
      if(e)e.preventDefault();
      ensureRegisterAccountArea();
      if(!selectedMode){updateNotice(); var area=byId('registerAccountTypeArea'); if(area&&area.scrollIntoView) area.scrollIntoView({behavior:'smooth',block:'center'}); return false;}
      try{localStorage.setItem('atsrs_use_mode',selectedMode); window.useMode=selectedMode;}catch(ex){}
      if(typeof baseRegister==='function') return baseRegister();
      return false;
    };
    var rb=byId('registerBox'); if(rb && !rb.classList.contains('hidden')) ensureRegisterAccountArea();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind); else bind();
  window.addEventListener('load',bind);
  [120,500,1000,1800].forEach(function(ms){setTimeout(bind,ms);});
})();


/* ===== Original V178 inline script 19 id="atsrs-v112-compact-register-choice-script" ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V179';
  var UPDATE='Last Update: 01 Jul 2026';
  var TEST='TEST BUILD';
  function byId(id){return document.getElementById(id);}
  function updateBuild(){
    var rows=document.querySelectorAll('.build-badge div');
    if(rows[0])rows[0].textContent=BUILD;
    if(rows[1])rows[1].textContent=UPDATE;
    if(rows[2])rows[2].textContent=TEST;
  }
  function getSelectedMode(){
    var p=byId('personalModeBtn'), c=byId('companyModeBtn');
    if(p&&p.classList.contains('active'))return 'personal';
    if(c&&c.classList.contains('active'))return 'company';
    return '';
  }
  function normalizeNotice(){
    var notice=byId('registerAccountNotice');
    var title=byId('registerAccountNoticeTitle');
    var text=byId('registerAccountNoticeText');
    var icon=notice?notice.querySelector('.notice-icon'):null;
    if(!notice||!title||!text)return;
    var mode=getSelectedMode();
    notice.classList.toggle('choice-missing',!mode);
    notice.classList.toggle('choice-selected',!!mode);
    if(!mode){
      if(icon)icon.textContent='!';
      title.textContent='Choose Account Type';
      if(!/continue registration with/i.test(text.textContent||'')){
        text.textContent='Select Personal or Corporate before creating your ATSRS account.';
      }
    }else if(mode==='personal'){
      if(icon)icon.textContent='✓';
      title.textContent='';
      text.textContent='You are creating a Personal account to keep your documents, certificates, references, appraisals and expiry alerts organized.';
    }else{
      if(icon)icon.textContent='✓';
      title.textContent='Corporate Account';
      text.textContent='You are creating a Corporate account to manage personnel, compliance records, shared documents and workforce information.';
    }
  }
  function boot(){
    updateBuild();
    normalizeNotice();
    ['personalModeBtn','companyModeBtn','createBtn','registerBtn','socialGoogleBtn','socialMicrosoftBtn','socialLinkedInBtn'].forEach(function(id){
      var el=byId(id); if(el && !el.dataset.v112Watch){el.dataset.v112Watch='1'; el.addEventListener('click',function(){setTimeout(normalizeNotice,80);setTimeout(normalizeNotice,220);},true);}
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  window.addEventListener('load',boot);
  [100,400,900,1600,2600].forEach(function(ms){setTimeout(boot,ms);});
})();


/* ===== Original V178 inline script 20 id="atsrs-v113-test-social-flow-script" ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V179';
  var UPDATE='Last Update: 01 Jul 2026';
  var TEST='TEST BUILD';
  var socialProviderPending=null;
  function byId(id){return document.getElementById(id);}
  function label(provider){return provider==='microsoft'?'Microsoft':provider==='linkedin'?'LinkedIn':'Google';}
  function updateBuild(){
    var rows=document.querySelectorAll('.build-badge div');
    if(rows[0])rows[0].textContent=BUILD;
    if(rows[1])rows[1].textContent=UPDATE;
    if(rows[2])rows[2].textContent=TEST;
  }
  function ensureTestButtons(){
    var old=byId('localTestBtn');
    if(!old || byId('atsrsV113TestLoginGroup'))return;
    var wrap=document.createElement('div');
    wrap.id='atsrsV113TestLoginGroup';
    wrap.innerHTML='<button type="button" id="atsrsV113TestPersonal">Test Personal</button><button type="button" id="atsrsV113TestCorporate">Test Corporate</button>';
    old.insertAdjacentElement('afterend',wrap);
    byId('atsrsV113TestPersonal').onclick=function(e){if(e)e.preventDefault();directTestLogin('personal');return false;};
    byId('atsrsV113TestCorporate').onclick=function(e){if(e)e.preventDefault();directTestLogin('company');return false;};
  }
  function directTestLogin(mode){
    try{
      window.useMode=mode;
      localStorage.setItem('atsrs_use_mode',mode);
      localStorage.setItem('atsrs_auth_mode','local');
      localStorage.setItem('atsrs_current_page',mode==='company'?'dashboard':'intro');
    }catch(e){}
    if(typeof window.setUseMode==='function'){
      try{window.setUseMode(mode);}catch(e){}
    }
    window.currentUser={id:'local_test_'+mode,email:mode==='company'?'corporate-test@atsrs.com':'personal-test@atsrs.com'};
    if(typeof window.openApp==='function')window.openApp();
  }
  function ensureSocialNotice(){
    var rb=byId('registerBox');
    if(!rb)return null;
    var n=byId('atsrsV113SocialNotice');
    if(!n){
      n=document.createElement('div');
      n.id='atsrsV113SocialNotice';
      n.innerHTML='<span class="notice-icon">!</span><div><b>Social sign in is not available yet.</b><span>Google, Microsoft and LinkedIn sign in will be enabled in a future update.</span></div>';
      var area=byId('registerAccountTypeArea');
      if(area)area.insertAdjacentElement('afterend',n);
      else rb.insertBefore(n,rb.children[1]||null);
    }
    return n;
  }
  function hideAuthBoxes(){
    ['loginBox','forgotBox','newPasswordBox'].forEach(function(id){var el=byId(id); if(el)el.classList.add('hidden');});
    var rb=byId('registerBox'); if(rb)rb.classList.remove('hidden');
  }
  function resetRegisterMode(){
    var rb=byId('registerBox');
    if(rb)rb.classList.remove('social-register-mode');
    socialProviderPending=null;
  }
  function openSocialChoice(provider){
    socialProviderPending=provider;
    hideAuthBoxes();
    var rb=byId('registerBox'); if(rb)rb.classList.add('social-register-mode');
    if(typeof window.setUseMode==='function'){
      try{window.setUseMode('');}catch(e){}
    }
    var p=byId('personalModeBtn'), c=byId('companyModeBtn');
    if(p)p.classList.remove('active');
    if(c)c.classList.remove('active');
    ensureSocialNotice();
    if(typeof window.atsrsV113UpdateNotice==='function')window.atsrsV113UpdateNotice(provider);
    setTimeout(function(){
      var area=byId('registerAccountTypeArea');
      if(area && area.scrollIntoView)area.scrollIntoView({behavior:'smooth',block:'center'});
    },80);
    return false;
  }
  function updateAccountNotice(provider){
    var area=byId('registerAccountTypeArea');
    var notice=byId('registerAccountNotice');
    var title=byId('registerAccountNoticeTitle');
    var text=byId('registerAccountNoticeText');
    var icon=notice?notice.querySelector('.notice-icon'):null;
    if(!notice || !title || !text)return;
    var p=byId('personalModeBtn'), c=byId('companyModeBtn');
    var mode=(p&&p.classList.contains('active'))?'personal':((c&&c.classList.contains('active'))?'company':'');
    if(area)area.classList.toggle('needs-choice',!mode);
    notice.classList.toggle('choice-missing',!mode);
    notice.classList.toggle('choice-selected',!!mode);
    if(!mode){
      if(icon)icon.textContent='!';
      title.textContent='Choose Account Type';
      text.textContent=provider?('Select Personal or Corporate to prepare '+label(provider)+' sign in.'):('Select Personal or Corporate before creating your ATSRS account.');
    }else if(mode==='personal'){
      if(icon)icon.textContent='✓';
      title.textContent='';
      text.textContent='You are creating a Personal account to keep your documents, certificates, references, appraisals and expiry alerts organized.';
    }else{
      if(icon)icon.textContent='✓';
      title.textContent='Corporate Account';
      text.textContent='You are creating a Corporate account to manage personnel, compliance records, shared documents and workforce information.';
    }
  }
  window.atsrsV113UpdateNotice=updateAccountNotice;
  function bind(){
    updateBuild();
    ensureTestButtons();
    ensureSocialNotice();
    var create=byId('createBtn');
    if(create && !create.dataset.v113Bound){
      create.dataset.v113Bound='1';
      create.addEventListener('click',function(){resetRegisterMode();setTimeout(function(){updateAccountNotice(null);},120);},true);
    }
    [['socialGoogleBtn','google'],['socialMicrosoftBtn','microsoft'],['socialLinkedInBtn','linkedin']].forEach(function(pair){
      var b=byId(pair[0]);
      if(b){b.onclick=function(e){if(e)e.preventDefault();return openSocialChoice(pair[1]);};}
    });
    ['personalModeBtn','companyModeBtn'].forEach(function(id){
      var el=byId(id);
      if(el && !el.dataset.v113ModeWatch){
        el.dataset.v113ModeWatch='1';
        el.addEventListener('click',function(){
          setTimeout(function(){
            updateAccountNotice(socialProviderPending);
            if(socialProviderPending){
              var msg=byId('regMsg');
              if(msg)msg.textContent='Social sign in is not available yet. Google, Microsoft and LinkedIn sign in will be enabled in a future update.';
            }
          },90);
        },true);
      }
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
  window.addEventListener('load',bind);
  [100,400,900,1600,2600].forEach(function(ms){setTimeout(bind,ms);});
})();


/* ===== Original V178 inline script 21  ===== */
(function(){
  'use strict';
  var BUILD_LABEL = 'ATSRS V168';
  var UPDATE_LABEL = 'Last Update: 01 Jul 2026';
  var BUILD_TYPE = 'TEST BUILD';
  function lockBuildBadge(){
    var badge = document.getElementById('buildBadge') || document.querySelector('.build-badge');
    if(!badge) return;
    var rows = badge.querySelectorAll('div');
    if(rows.length >= 3){
      rows[0].textContent = BUILD_LABEL;
      rows[1].textContent = UPDATE_LABEL;
      rows[2].textContent = BUILD_TYPE;
    }else{
      badge.innerHTML = '<div>'+BUILD_LABEL+'</div><div>'+UPDATE_LABEL+'</div><div>'+BUILD_TYPE+'</div>';
    }
  }
  lockBuildBadge();
  document.addEventListener('DOMContentLoaded', lockBuildBadge);
  window.addEventListener('load', lockBuildBadge);
  setInterval(lockBuildBadge, 250);
})();


/* ===== Original V178 inline script 22 id="atsrs-v115-flow-fix-script" ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V179';
  var UPDATE='Last Update: 01 Jul 2026';
  var TYPE='TEST BUILD';
  function byId(id){return document.getElementById(id);}
  function lockBuild(){
    var badge=byId('buildBadge')||document.querySelector('.build-badge');
    if(!badge)return;
    var rows=badge.querySelectorAll('div');
    if(rows.length>=3){rows[0].textContent=BUILD;rows[1].textContent=UPDATE;rows[2].textContent=TYPE;}
    else{badge.innerHTML='<div>'+BUILD+'</div><div>'+UPDATE+'</div><div>'+TYPE+'</div>';}
  }
  function directTestLogin(mode){
    try{
      window.useMode=mode;
      localStorage.setItem('atsrs_use_mode',mode);
      localStorage.setItem('atsrs_auth_mode','local');
      localStorage.setItem('atsrs_current_page',mode==='company'?'dashboard':'intro');
    }catch(e){}
    if(typeof window.setUseMode==='function')try{window.setUseMode(mode);}catch(e){}
    window.currentUser={id:'local_test_'+mode,email:mode==='company'?'corporate-test@atsrs.com':'personal-test@atsrs.com'};
    if(typeof window.openApp==='function')window.openApp();
  }
  function placeTestButtons(){
    var remember=byId('rememberRow');
    var old=byId('localTestBtn');
    var group=byId('atsrsV113TestLoginGroup')||byId('atsrsV115TestLoginGroup');
    if(!remember)return;
    if(!group){
      group=document.createElement('div');
      group.id='atsrsV115TestLoginGroup';
      group.innerHTML='<button type="button" id="atsrsV115TestPersonal">Test Personal</button><button type="button" id="atsrsV115TestCorporate">Test Corporate</button>';
    }
    if(group.previousElementSibling!==remember) remember.insertAdjacentElement('afterend',group);
    if(old)old.style.display='none';
    var p=byId('atsrsV115TestPersonal')||byId('atsrsV113TestPersonal');
    var c=byId('atsrsV115TestCorporate')||byId('atsrsV113TestCorporate');
    if(p)p.onclick=function(e){if(e)e.preventDefault();directTestLogin('personal');return false;};
    if(c)c.onclick=function(e){if(e)e.preventDefault();directTestLogin('company');return false;};
  }
  function ensureSocialNotice(){
    var rb=byId('registerBox'); if(!rb)return null;
    var n=byId('atsrsV113SocialNotice')||byId('atsrsV115SocialNotice');
    if(!n){
      n=document.createElement('div');
      n.id='atsrsV115SocialNotice';
      n.innerHTML='<span class="notice-icon">!</span><div><b>Social sign in is not available yet.</b><span>Google, Microsoft and LinkedIn sign in will be enabled in a future update.</span></div>';
      var title=byId('registerTitle');
      if(title)title.insertAdjacentElement('afterend',n); else rb.insertBefore(n,rb.firstChild);
    }
    return n;
  }
  function openSocialPlaceholder(provider){
    ['loginBox','forgotBox','newPasswordBox'].forEach(function(id){var el=byId(id);if(el)el.classList.add('hidden');});
    var rb=byId('registerBox');
    if(rb){rb.classList.remove('hidden');rb.classList.add('social-register-mode');}
    var n=ensureSocialNotice();
    if(n){
      n.style.display='flex';
      var txt=n.querySelector('span:last-child');
      if(txt)txt.textContent='Google, Microsoft and LinkedIn sign in will be enabled in a future update.';
    }
    var area=byId('registerAccountTypeArea'); if(area)area.classList.remove('needs-choice');
    var p=byId('personalModeBtn'), c=byId('companyModeBtn');
    if(p)p.classList.remove('active'); if(c)c.classList.remove('active');
    setTimeout(function(){var rb2=byId('registerBox'); if(rb2&&rb2.scrollIntoView)rb2.scrollIntoView({behavior:'smooth',block:'start'});},60);
    return false;
  }
  function normalCreateMode(){
    var rb=byId('registerBox');
    if(rb)rb.classList.remove('social-register-mode');
    var n=byId('atsrsV113SocialNotice')||byId('atsrsV115SocialNotice');
    if(n)n.style.display='none';
  }
  function bind(){
    lockBuild();
    placeTestButtons();
    ensureSocialNotice();
    var create=byId('createBtn');
    if(create && !create.dataset.v115Create){
      create.dataset.v115Create='1';
      create.addEventListener('click',function(){setTimeout(normalCreateMode,20);},true);
    }
    [['socialGoogleBtn','google'],['socialMicrosoftBtn','microsoft'],['socialLinkedInBtn','linkedin']].forEach(function(pair){
      var b=byId(pair[0]);
      if(b){
        b.onclick=function(e){if(e)e.preventDefault();return openSocialPlaceholder(pair[1]);};
        if(!b.dataset.v115Social){
          b.dataset.v115Social='1';
          b.addEventListener('click',function(e){if(e){e.preventDefault();e.stopImmediatePropagation();}return openSocialPlaceholder(pair[1]);},true);
        }
      }
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
  window.addEventListener('load',bind);
  [80,250,700,1300,2400].forEach(function(ms){setTimeout(bind,ms);});
  setInterval(lockBuild,250);
})();


/* ===== Original V178 inline script 23 id="atsrs-v117-test-placement-script" ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V179';
  var UPDATE='Last Update: 01 Jul 2026';
  var TYPE='TEST BUILD';
  function byId(id){return document.getElementById(id);}
  function lockBuild(){
    var badge=byId('buildBadge')||document.querySelector('.build-badge');
    if(!badge)return;
    var rows=badge.querySelectorAll('div');
    if(rows.length>=3){rows[0].textContent=BUILD;rows[1].textContent=UPDATE;rows[2].textContent=TYPE;}
    else{badge.innerHTML='<div>'+BUILD+'</div><div>'+UPDATE+'</div><div>'+TYPE+'</div>';}
  }
  function directTestLogin(mode){
    try{
      window.useMode=mode;
      localStorage.setItem('atsrs_use_mode',mode);
      localStorage.setItem('atsrs_auth_mode','local');
      localStorage.setItem('atsrs_current_page',mode==='company'?'dashboard':'intro');
    }catch(e){}
    if(typeof window.setUseMode==='function')try{window.setUseMode(mode);}catch(e){}
    window.currentUser={id:'local_test_'+mode,email:mode==='company'?'corporate-test@atsrs.com':'personal-test@atsrs.com'};
    if(typeof window.openApp==='function')window.openApp();
  }
  function getOrCreateGroup(){
    var group=byId('atsrsV113TestLoginGroup')||byId('atsrsV115TestLoginGroup')||byId('atsrsV117TestLoginGroup');
    if(!group){
      group=document.createElement('div');
      group.id='atsrsV117TestLoginGroup';
      group.innerHTML='<button type="button" id="atsrsV117TestPersonal">Test Personal</button><button type="button" id="atsrsV117TestCorporate">Test Corporate</button>';
    }
    return group;
  }
  function placeTestButtons(){
    var remember=byId('rememberRow');
    var loginBox=byId('loginBox');
    if(!remember||!loginBox)return;
    var old=byId('localTestBtn'); if(old)old.style.display='none';
    var group=getOrCreateGroup();
    if(group.previousElementSibling!==remember){remember.insertAdjacentElement('afterend',group);}
    var p=byId('atsrsV117TestPersonal')||byId('atsrsV115TestPersonal')||byId('atsrsV113TestPersonal');
    var c=byId('atsrsV117TestCorporate')||byId('atsrsV115TestCorporate')||byId('atsrsV113TestCorporate');
    if(p)p.onclick=function(e){if(e)e.preventDefault();directTestLogin('personal');return false;};
    if(c)c.onclick=function(e){if(e)e.preventDefault();directTestLogin('company');return false;};
  }
  function run(){lockBuild();placeTestButtons();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',run);
  [50,150,400,900,1600,2600].forEach(function(ms){setTimeout(run,ms);});
  setInterval(run,800);
  setInterval(lockBuild,250);
})();


/* ===== Original V178 inline script 24  ===== */
/* V118 dashboard simplification and account badge sync */
(function(){
  function byId(id){return document.getElementById(id);}
  function getMode(){return localStorage.getItem('atsrs_use_mode') || (window.useMode || 'personal');}
  function getEmail(){
    if(window.currentUser && window.currentUser.email) return window.currentUser.email;
    var saved=localStorage.getItem('atsrs_saved_login_email');
    var login=byId('loginEmail');
    return saved || (login && login.value) || 'Not signed in';
  }
  function updateAccountBadge(){
    var type=byId('atsrsAccountTypeLabel');
    var mail=byId('atsrsAccountEmailLabel');
    if(!type || !mail) return;
    var mode=getMode();
    type.textContent = mode === 'company' ? '' : '';
    mail.textContent = getEmail();
  }
  function simplifyDashboard(){
    ['missingDocsText','missingDocs','docStatusTitle','docStatusSub','docCategoryGrid'].forEach(function(id){var el=byId(id); if(el) el.style.display='none';});
    var missingCard=document.querySelector('#dashboardPage .missing-card'); if(missingCard) missingCard.remove();
    var snapMissing=byId('snapMissing'); if(snapMissing){var row=snapMissing.closest('.snapshot-item'); if(row) row.remove();}
    var docStatus=byId('docStatusTitle'); if(docStatus){var panel=docStatus.closest('.panel'); if(panel) panel.remove();}
    var totalCertsText=byId('totalCertsText'); if(totalCertsText) totalCertsText.textContent='Uploaded Documents';
    var soloHeroTitle=byId('soloHeroTitle'); if(soloHeroTitle) soloHeroTitle.textContent='Your document overview';
    var soloHeroText=byId('soloHeroText'); if(soloHeroText) soloHeroText.textContent='Keep your uploaded documents and expiry dates in one clean view.';
    var snapshotTitle=byId('snapshotTitle'); if(snapshotTitle) snapshotTitle.textContent='Quick overview';
  }
  var oldOpen=window.openApp;
  if(typeof oldOpen==='function'){
    window.openApp=function(){ oldOpen.apply(this,arguments); setTimeout(function(){updateAccountBadge(); simplifyDashboard();},0); };
  }
  var oldRender=window.renderAll;
  if(typeof oldRender==='function'){
    window.renderAll=function(){ oldRender.apply(this,arguments); simplifyDashboard(); updateAccountBadge(); };
  }
  document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){updateAccountBadge(); simplifyDashboard();},80);});
})();


/* ===== Original V178 inline script 25 id="ATSRS_V119_BUILD_AND_TOPBAR_LOCK" ===== */
(function(){
  var BUILD='ATSRS V179';
  var UPDATE='Last Update: 01 Jul 2026';
  function lockBuild(){
    var b=document.getElementById('buildBadge');
    if(!b)return;
    var d=b.querySelectorAll('div');
    if(d[0])d[0].textContent=BUILD;
    if(d[1])d[1].textContent=UPDATE;
    if(d[2])d[2].textContent='TEST BUILD';
  }
  function cleanTopbar(){
    var badge=document.getElementById('atsrsAccountBadge');
    var type=document.getElementById('atsrsAccountTypeLabel');
    var email=document.getElementById('atsrsAccountEmailLabel');
    var mode='';
    if(type) type.textContent=mode;
    if(email && (!email.textContent || /local-test|undefined|null/i.test(email.textContent))) {
      var stored=localStorage.getItem('atsrsUserEmail') || localStorage.getItem('atsrsEmail') || localStorage.getItem('email') || 'local-test@atsrs.com';
      email.textContent=stored;
    }
    if(badge){badge.removeAttribute('style');}
    var logout=document.getElementById('topLogoutBtn');
    if(logout){logout.removeAttribute('style');logout.textContent='Exit';}
  }
  ['DOMContentLoaded','load'].forEach(function(evt){window.addEventListener(evt,function(){lockBuild();cleanTopbar();setTimeout(cleanTopbar,300);});});
  setInterval(function(){lockBuild();cleanTopbar();},1200);
})();


/* ===== Original V178 inline script 26 id="ATSRS_V125_ACCOUNT_REFS_LANG_CLEANUP_JS" ===== */
/* V125: stabilize current pages before new features */
(function(){
  'use strict';
  var PROFILE_KEY='profile';
  function byId(id){return document.getElementById(id)}
  function safeUserId(){
    try{return (window.currentUser&&currentUser.id)?currentUser.id:'local_test_user';}
    catch(e){return 'local_test_user';}
  }
  function key(name){
    try{ if(typeof window.localKey==='function' && window.currentUser && currentUser.id) return window.localKey(name); }
    catch(e){}
    return 'atsrs_'+safeUserId()+'_'+name;
  }
  function readJson(name, fallback){
    try{var raw=localStorage.getItem(key(name)); return raw?JSON.parse(raw):fallback;}
    catch(e){return fallback;}
  }
  function writeJson(name, data){
    try{localStorage.setItem(key(name),JSON.stringify(data)); return true;}
    catch(e){return false;}
  }
  function val(id){var e=byId(id); return e?e.value:'';}
  function setVal(id,v){var e=byId(id); if(e)e.value=v||'';}
  function ensureProfileStatus(){
    var btn=byId('saveProfileBtn'); if(!btn)return null;
    var status=byId('profileSaveStatus');
    if(!status){status=document.createElement('div');status.id='profileSaveStatus';status.setAttribute('role','status');btn.insertAdjacentElement('afterend',status);}
    return status;
  }
  function showSaved(){
    var s=ensureProfileStatus(); if(!s)return;
    s.textContent='Saved ✓'; s.classList.add('active');
    clearTimeout(window.__atsrsV125ProfileSavedTimer);
    window.__atsrsV125ProfileSavedTimer=setTimeout(function(){s.classList.remove('active');},2200);
  }
  window.saveProfile=function(){
    var data={
      name:val('profileName'),surname:val('profileSurname'),phone:val('profilePhone'),country:val('profileCountry'),
      company:val('profileCompany'),position:val('profilePosition'),altEmail:val('profileAltEmail'),
      timezone:val('profileTimezone')||'UTC',visibility:val('profileVisibility')||'Private',savedAt:new Date().toISOString()
    };
    writeJson(PROFILE_KEY,data); showSaved(); return true;
  };
  window.loadProfile=function(){
    try{ if(typeof window.fillCountries==='function') window.fillCountries(); }catch(e){}
    var p=readJson(PROFILE_KEY,{});
    setVal('profileName',p.name); setVal('profileSurname',p.surname); setVal('profilePhone',p.phone); setVal('profileCountry',p.country);
    setVal('profileCompany',p.company); setVal('profilePosition',p.position); setVal('profileAltEmail',p.altEmail);
    setVal('profileTimezone',p.timezone||'UTC'); setVal('profileVisibility',p.visibility||'Private'); ensureProfileStatus();
  };
  function forceFlagOnly(){
    ['langCircle','appLangCircle'].forEach(function(id){var b=byId(id); if(b){b.textContent=''; b.setAttribute('aria-label','Language'); b.removeAttribute('title');}});
    document.querySelectorAll('.lang-menu button[data-lang="en"]').forEach(function(b){
      b.childNodes.forEach(function(n){ if(n.nodeType===3)n.textContent=''; });
      var s=b.querySelector('span'); if(s)s.textContent='🇬🇧';
    });
  }
  var oldApply=window.applyLanguage;
  if(typeof oldApply==='function') window.applyLanguage=function(){var r=oldApply.apply(this,arguments); forceFlagOnly(); return r;};
  function coverFiles(){return readJson('coverLetterFiles',[]);}
  function saveCoverFiles(arr){writeJson('coverLetterFiles',Array.isArray(arr)?arr:[]);}
  function firstCover(){var a=coverFiles();return a&&a.length?a[0]:null;}
  function ensureCoverLetterCard(){
    if(byId('coverLetterCard'))return;
    var cv=byId('cvCardTitle'); var cvCard=cv?cv.closest('.ref-card'):null; var grid=cvCard?cvCard.parentElement:document.querySelector('#refsPage .ref-grid'); if(!grid)return;
    var card=document.createElement('div'); card.className='ref-card cover-letter-card'; card.id='coverLetterCard';
    card.innerHTML='<div class="cv-card-head"><h3 id="coverLetterCardTitle">Cover Letter</h3><span id="coverLetterStatusBadge" class="badge badge-blocked">No File</span></div>'+
      '<p class="sub">Store cover letter versions next to your CV for faster applications.</p>'+
      '<input id="coverLetterUploadInput" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" class="hidden" multiple>'+
      '<div id="coverLetterFileInfo" class="preview-box"></div>'+
      '<div class="cv-actions"><button id="uploadCoverLetterBtn" class="secondary">Upload</button><button id="previewCoverLetterBtn" class="secondary">Preview</button><button id="downloadCoverLetterBtn" class="secondary">Download</button><button id="deleteCoverLetterBtn" class="action">Delete</button></div>';
    if(cvCard&&cvCard.nextSibling)cvCard.parentNode.insertBefore(card,cvCard.nextSibling); else grid.appendChild(card);
    byId('uploadCoverLetterBtn').onclick=function(){byId('coverLetterUploadInput').click();};
    byId('previewCoverLetterBtn').onclick=previewCoverLetter;
    byId('downloadCoverLetterBtn').onclick=downloadCoverLetter;
    byId('deleteCoverLetterBtn').onclick=deleteCoverLetter;
    byId('coverLetterUploadInput').onchange=handleCoverLetterUpload;
  }
  window.handleCoverLetterUpload=function(event){
    var files=event.target.files||[]; if(!files.length)return;
    var remaining=files.length, saved=coverFiles();
    Array.prototype.forEach.call(files,function(file){
      var reader=new FileReader();
      reader.onload=function(){saved.unshift({id:Date.now()+'_'+Math.random().toString(36).slice(2),name:file.name,type:file.type||'application/octet-stream',size:file.size,updated:new Date().toISOString(),data:reader.result}); if(--remaining===0){saveCoverFiles(saved);event.target.value='';renderCoverLetter();}};
      reader.readAsDataURL(file);
    });
  };
  window.previewCoverLetter=function(){var f=firstCover(); if(!f){alert('No cover letter uploaded yet.');return;} var w=window.open('','_blank'); if(w){w.document.write('<title>'+String(f.name||'Cover Letter').replace(/[<>]/g,'')+'</title><iframe src="'+f.data+'" style="border:0;width:100%;height:100vh"></iframe>');w.document.close();}};
  window.downloadCoverLetter=function(){var f=firstCover(); if(!f){alert('No cover letter uploaded yet.');return;} var a=document.createElement('a');a.href=f.data;a.download=f.name||'ATSRS-cover-letter';document.body.appendChild(a);a.click();a.remove();};
  window.deleteCoverLetter=function(){saveCoverFiles([]);renderCoverLetter();};
  function renderCoverLetter(){
    ensureCoverLetterCard(); var files=coverFiles(); var badge=byId('coverLetterStatusBadge'), info=byId('coverLetterFileInfo');
    if(badge){badge.textContent=files.length?String(files.length)+' file'+(files.length>1?'s':''):'No File';badge.className='badge '+(files.length?'badge-ready':'badge-blocked');}
    if(info){info.innerHTML=files.length?files.slice(0,5).map(function(f){return '<div>'+String(f.name||'File').replace(/[<>&]/g,'')+' • '+Math.round((f.size||0)/1024)+' KB</div>';}).join(''):'No cover letter uploaded yet.';}
  }
  var oldRender=window.renderAll;
  if(typeof oldRender==='function') window.renderAll=function(){var r=oldRender.apply(this,arguments); renderCoverLetter(); forceFlagOnly(); return r;};
  var oldShow=window.showPage;
  if(typeof oldShow==='function') window.showPage=function(){var r=oldShow.apply(this,arguments); if(String(arguments[0]||'')==='refs'||byId('refsPage'))setTimeout(renderCoverLetter,40); if(String(arguments[0]||'')==='profile')setTimeout(window.loadProfile,40); forceFlagOnly(); return r;};
  document.addEventListener('DOMContentLoaded',function(){ensureProfileStatus(); window.loadProfile(); renderCoverLetter(); forceFlagOnly();});
  window.addEventListener('load',function(){ensureProfileStatus(); window.loadProfile(); renderCoverLetter(); forceFlagOnly();});
  setInterval(function(){forceFlagOnly(); if(byId('refsPage')&&!byId('refsPage').classList.contains('hidden'))renderCoverLetter();},1500);
})();


/* ===== Original V178 inline script 27 id="ATSRS_V126_LAYOUT_BUTTON_LANG_CLEANUP_JS" ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V179';
  var UPDATE='Last Update: 01 Jul 2026';
  function byId(id){return document.getElementById(id);}
  function applyBuild(){
    document.querySelectorAll('.build-badge').forEach(function(b){
      var d=b.querySelectorAll('div');
      if(d[0])d[0].textContent=BUILD;
      if(d[1])d[1].textContent=UPDATE;
      if(d[2])d[2].textContent='TEST BUILD';
    });
  }
  function forceFlagOnly(){
    ['langCircle','appLangCircle'].forEach(function(id){
      var b=byId(id);
      if(!b)return;
      b.textContent='';
      b.innerHTML='';
      b.setAttribute('aria-label','Language');
      b.removeAttribute('title');
    });
    document.querySelectorAll('.lang-menu button[data-lang="en"]').forEach(function(b){
      b.innerHTML='';
      b.setAttribute('aria-label','English');
      b.setAttribute('title','English');
    });
  }
  function ensureCoverAfterCv(){
    var grid=document.querySelector('#refsPage .ref-grid');
    var cv=byId('cvCardTitle');
    var cvCard=cv?cv.closest('.ref-card'):document.querySelector('#refsPage .cv-card');
    var cover=byId('coverLetterCard');
    if(grid&&cvCard&&cover&&cover.previousElementSibling!==cvCard){
      grid.insertBefore(cover,cvCard.nextSibling);
    }
  }
  function classifyRefCards(){
    var grid=document.querySelector('#refsPage .ref-grid'); if(!grid)return;
    var cards=[].slice.call(grid.children).filter(function(x){return x.classList&&x.classList.contains('ref-card');});
    cards.forEach(function(card){card.style.removeProperty('grid-column');});
    var cv=byId('cvCardTitle');
    var cvCard=cv?cv.closest('.ref-card'):document.querySelector('#refsPage .cv-card');
    if(cvCard){cvCard.classList.add('cv-card');cvCard.style.order='-100';}
    var cover=byId('coverLetterCard'); if(cover)cover.style.order='40';
    var app=byId('appraisalCardTitle'); if(app&&app.closest('.ref-card'))app.closest('.ref-card').style.order='10';
    var ref=byId('referenceCardTitle'); if(ref&&ref.closest('.ref-card'))ref.closest('.ref-card').style.order='20';
    var rec=byId('recommendationCardTitle'); if(rec&&rec.closest('.ref-card'))rec.closest('.ref-card').style.order='30';
  }
  function calmDashboardButtons(){
    document.querySelectorAll('#dashboardPage button').forEach(function(b){
      b.classList.add('atsrs-v126-calm-dashboard-button');
    });
  }
  function run(){applyBuild();forceFlagOnly();ensureCoverAfterCv();classifyRefCards();calmDashboardButtons();}
  var oldApply=window.applyLanguage;
  if(typeof oldApply==='function')window.applyLanguage=function(){var r=oldApply.apply(this,arguments);run();return r;};
  var oldRender=window.renderAll;
  if(typeof oldRender==='function')window.renderAll=function(){var r=oldRender.apply(this,arguments);setTimeout(run,0);return r;};
  var oldShow=window.showPage;
  if(typeof oldShow==='function')window.showPage=function(){var r=oldShow.apply(this,arguments);setTimeout(run,40);setTimeout(run,220);return r;};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',function(){run();setTimeout(run,500);});
  setInterval(run,1500);
})();


/* ===== Original V178 inline script 28 id="ATSRS_V127_DASHBOARD_STABILITY_JS" ===== */
(function(){
  function q(s,r){return (r||document).querySelector(s)}
  function qa(s,r){return Array.from((r||document).querySelectorAll(s))}
  function applyBuild(){
    var BUILD='ATSRS V179';
    var UPDATE='Last Update: 01 Jul 2026';
    qa('.build-badge').forEach(function(b){
      var d=b.querySelectorAll('div');
      if(d[0])d[0].textContent=BUILD;
      if(d[1])d[1].textContent=UPDATE;
      if(d[2])d[2].textContent='TEST BUILD';
    });
  }
  function parkDashboardBuilder(){
    var page=q('#dashboardPage'); if(!page)return;
    qa('.dash-card-tools,.dash-resize-handle,.dash-placeholder',page).forEach(function(x){x.remove();});
    qa('.dash-minimized',page).forEach(function(x){x.classList.remove('dash-minimized');});
    qa('.dash-custom-ready,.dash-resizable,.dash-drag-float',page).forEach(function(el){
      el.classList.remove('dash-drag-float');
      ['width','height','left','top','right','bottom','position','transform','opacity','minWidth','maxWidth'].forEach(function(p){el.style[p]='';});
    });
    var dock=q('#dashboardDock'); if(dock){dock.innerHTML='';dock.classList.add('hidden');dock.style.display='none';}
  }
  function attachTopActionsToPage(){
    var app=q('#app'); if(!app)return;
    var top=q('body > .top-actions') || q('body > .atsrs-global-top-actions') || q('body > .atsrs-v56-top-actions') || q('body > .atsrs-v64-top-actions') || q('#app > .top-actions');
    if(!top)return;
    if(top.parentElement!==app)app.insertBefore(top,app.firstChild);
    top.classList.remove('atsrs-global-top-actions','atsrs-v56-top-actions','atsrs-v64-top-actions');
    top.classList.add('top-actions');
    top.style.position='absolute';
    top.style.top='18px';
    top.style.right='18px';
    top.style.left='auto';
    top.style.zIndex='90';
  }
  function compactShareProfile(){
    var p=q('#shareProfilePanel'); if(!p)return;
    p.classList.add('atsrs-v127-share-compact');
    var sub=q('#shareSub',p); if(sub)sub.textContent='Share one controlled profile link when needed.';
  }
  function run(){applyBuild();parkDashboardBuilder();attachTopActionsToPage();compactShareProfile();}
  /* Park older interval-based dashboard builder by replacing exposed init with stable cleanup. */
  window.initDashboardBuilderV123=function(){setTimeout(run,0);return true;};
  var oldShow=window.showPage;
  if(typeof oldShow==='function')window.showPage=function(){var r=oldShow.apply(this,arguments);setTimeout(run,30);setTimeout(run,250);return r;};
  var oldRender=window.renderAll;
  if(typeof oldRender==='function')window.renderAll=function(){var r=oldRender.apply(this,arguments);setTimeout(run,30);return r;};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',function(){run();setTimeout(run,300);});
  setTimeout(run,800);
})();


/* ===== Original V178 inline script 29 id="ATSRS_V134_REFERENCES_STABLE_SINGLE_SYSTEM_JS" ===== */
(function(){
  'use strict';

  var BUILD='ATSRS V179';
  var UPDATE='Last Update: 01 Jul 2026';
  var CONFIGS=[
    {kind:'appraisal',title:'Appraisals',desc:'Upload annual appraisals, performance reviews and evaluation forms.',upload:'Upload',order:10,oldKeys:['atsrs_v105_appraisal_files','appraisalFiles']},
    {kind:'reference',title:'References',desc:'Store reference letters and contact-ready career proof.',upload:'Upload',order:20,oldKeys:['atsrs_v105_reference_files','referenceFiles']},
    {kind:'recommendation',title:'Recommendation Letters',desc:'Store recommendation letters from supervisors, clients and companies.',upload:'Upload',order:30,oldKeys:['recommendationFiles']},
    {kind:'coverLetter',title:'Cover Letter',desc:'Store cover letter versions next to your CV for faster applications.',upload:'Upload',order:40,oldKeys:['coverLetterFiles']}
  ];

  function byId(id){return document.getElementById(id);}
  function q(s,r){return (r||document).querySelector(s);}
  function qa(s,r){return Array.from((r||document).querySelectorAll(s));}
  function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c;});}
  function parse(raw){try{var p=JSON.parse(raw||'[]');return Array.isArray(p)?p:[];}catch(e){return [];}}
  function safeUserId(){try{return (window.currentUser&&window.currentUser.id)?window.currentUser.id:'local_test_user';}catch(e){return 'local_test_user';}}
  function scopedKey(name){try{if(typeof window.localKey==='function'&&window.currentUser&&window.currentUser.id)return window.localKey(name);}catch(e){} return 'atsrs_'+safeUserId()+'_'+name;}
  function newKey(kind){return scopedKey('v134_'+kind+'_files');}
  function label(n){return n>0?(n+' File'+(n>1?'s':'')):'No File';}

  function readRawKey(k){
    try{return parse(localStorage.getItem(k));}catch(e){return [];}
  }
  function readPossibleStorage(kind,cfg){
    var arr=readRawKey(newKey(kind));
    if(arr.length)return arr;
    var sources=[];
    (cfg.oldKeys||[]).forEach(function(k){
      sources=sources.concat(readRawKey(k));
      sources=sources.concat(readRawKey(scopedKey(k)));
    });
    try{ if(kind!=='coverLetter' && typeof window.getManagedFiles==='function'){var m=window.getManagedFiles(kind); if(Array.isArray(m))sources=sources.concat(m);} }catch(e){}
    var seen={}, out=[];
    sources.forEach(function(f){
      if(!f || !f.name)return;
      var id=f.id || (Date.now()+'_'+Math.random().toString(36).slice(2));
      var key=String(f.name)+'|'+String(f.size||'')+'|'+String(f.updated||f.signedDate||'');
      if(seen[key])return; seen[key]=1;
      out.push({
        id:id,name:f.name,type:f.type||'application/octet-stream',size:f.size||0,
        updated:f.updated||new Date().toISOString(),data:f.data||''
      });
    });
    if(out.length)writeFiles(kind,out);
    return out;
  }
  function readFiles(kind){
    var cfg=CONFIGS.find(function(x){return x.kind===kind;});
    return readPossibleStorage(kind,cfg||{});
  }
  function writeFiles(kind,arr){
    try{localStorage.setItem(newKey(kind),JSON.stringify(Array.isArray(arr)?arr:[]));}catch(e){}
  }

  function setBuild(){
    qa('.build-badge').forEach(function(b){
      var d=b.querySelectorAll('div');
      if(d[0])d[0].textContent=BUILD;
      if(d[1])d[1].textContent=UPDATE;
      if(d[2])d[2].textContent='TEST BUILD';
    });
  }

  function findGrid(){
    return q('#refsPage .ref-grid');
  }
  function findCard(kind){
    if(kind==='coverLetter')return byId('coverLetterCard');
    var titleId=kind==='appraisal'?'appraisalCardTitle':kind==='reference'?'referenceCardTitle':'recommendationCardTitle';
    var title=byId(titleId);
    return title?title.closest('.ref-card'):null;
  }
  function createCard(kind){
    var grid=findGrid(); if(!grid)return null;
    var card=document.createElement('div');
    card.className='ref-card atsrs-v134-career-card';
    if(kind==='coverLetter')card.id='coverLetterCard';
    grid.appendChild(card);
    return card;
  }

  function buildCard(cfg){
    var grid=findGrid(); if(!grid)return;
    var card=findCard(cfg.kind)||createCard(cfg.kind); if(!card)return;
    card.className='ref-card atsrs-v134-career-card'+(cfg.kind==='coverLetter'?' cover-letter-card':'');
    card.style.order=String(cfg.order);
    card.dataset.atsrsV134Kind=cfg.kind;
    var titleId=cfg.kind==='appraisal'?'appraisalCardTitle':cfg.kind==='reference'?'referenceCardTitle':cfg.kind==='recommendation'?'recommendationCardTitle':'coverLetterCardTitle';
    card.innerHTML=
      '<h3 id="'+titleId+'">'+esc(cfg.title)+'</h3>'+
      '<p class="atsrs-v134-desc">'+esc(cfg.desc)+'</p>'+
      '<input id="v134_'+cfg.kind+'_input" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" class="hidden" multiple>'+
      '<div class="atsrs-v134-statusbar"><button id="v134_'+cfg.kind+'_upload" class="atsrs-v134-upload" type="button">Upload</button><select id="v134_'+cfg.kind+'_filter" class="atsrs-v134-filter"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="az">A-Z</option><option value="za">Z-A</option></select><span id="v134_'+cfg.kind+'_status" class="atsrs-v134-status empty">No File</span></div>'+
      '<div id="v134_'+cfg.kind+'_list" class="atsrs-v134-list"><div class="atsrs-v134-empty">No files uploaded yet.</div></div>';
    var btn=byId('v134_'+cfg.kind+'_upload');
    var inp=byId('v134_'+cfg.kind+'_input');
    if(btn&&inp){
      btn.onclick=function(){inp.click();};
      inp.onchange=function(e){handleUpload(cfg.kind,e);};
    }
    var fil=byId('v134_'+cfg.kind+'_filter');
    if(fil){ fil.onchange=function(){ render(); }; }
  }

  function ensureLayout(){
    var grid=findGrid(); if(!grid)return;
    var cvTitle=byId('cvCardTitle');
    var cvCard=cvTitle?cvTitle.closest('.ref-card'):q('#refsPage .cv-card');
    if(cvCard){cvCard.classList.add('cv-card');cvCard.style.order='-100';cvCard.style.gridColumn='1 / -1';}
    CONFIGS.forEach(buildCard);
  }

  function handleUpload(kind,event){
    var files=event.target.files||[]; if(!files.length)return;
    var arr=readFiles(kind), left=files.length;
    Array.prototype.forEach.call(files,function(file){
      var reader=new FileReader();
      reader.onload=function(){
        arr.unshift({id:Date.now()+'_'+Math.random().toString(36).slice(2),name:file.name,type:file.type||'application/octet-stream',size:file.size||0,updated:new Date().toISOString(),data:reader.result});
        left--;
        if(left===0){writeFiles(kind,arr);event.target.value='';render();}
      };
      reader.readAsDataURL(file);
    });
  }

  window.atsrsV134Preview=function(kind,id){
    var f=readFiles(kind).find(function(x){return x.id===id;}); if(!f||!f.data){alert('File preview is not available.');return;}
    var w=window.open('','_blank'); if(w){w.document.write('<title>'+esc(f.name||'File')+'</title><iframe src="'+f.data+'" style="border:0;width:100%;height:100vh"></iframe>');w.document.close();}
  };
  window.atsrsV134Download=function(kind,id){
    var f=readFiles(kind).find(function(x){return x.id===id;}); if(!f||!f.data){alert('File download is not available.');return;}
    var a=document.createElement('a');a.href=f.data;a.download=f.name||('ATSRS-'+kind);document.body.appendChild(a);a.click();a.remove();
  };
  window.atsrsV134Delete=function(kind,id){
    writeFiles(kind,readFiles(kind).filter(function(f){return f.id!==id;})); render();
  };

  function row(kind,f){
    return '<div class="atsrs-v134-row">'+
      '<div><b title="'+esc(f.name)+'">'+esc(f.name||'File')+'</b><span>'+Math.round((f.size||0)/1024)+' KB</span></div>'+
      '<div class="atsrs-v134-actions">'+
      '<button class="secondary" onclick="atsrsV134Preview(\''+kind+'\',\''+esc(f.id)+'\')">Preview</button>'+
      '<button class="secondary" onclick="atsrsV134Download(\''+kind+'\',\''+esc(f.id)+'\')">Download</button>'+
      '<button class="action" onclick="atsrsV134Delete(\''+kind+'\',\''+esc(f.id)+'\')">Delete</button>'+
      '</div></div>';
  }

  function render(){
    setBuild(); ensureLayout();
    CONFIGS.forEach(function(cfg){
      var arr=readFiles(cfg.kind).slice();
      var filter=byId('v134_'+cfg.kind+'_filter');
      var mode=filter?filter.value:'newest';
      arr.sort(function(a,b){
        if(mode==='oldest')return String(a.updated||'').localeCompare(String(b.updated||''));
        if(mode==='az')return String(a.name||'').localeCompare(String(b.name||''));
        if(mode==='za')return String(b.name||'').localeCompare(String(a.name||''));
        return String(b.updated||'').localeCompare(String(a.updated||''));
      });
      var status=byId('v134_'+cfg.kind+'_status');
      var list=byId('v134_'+cfg.kind+'_list');
      if(status){
        status.textContent=label(arr.length);
        status.className='atsrs-v134-status '+(arr.length?'ready':'empty');
      }
      if(filter){
        filter.classList.toggle('active',arr.length>0);
      }
      if(list){
        list.innerHTML=arr.length?arr.map(function(f){return row(cfg.kind,f);}).join(''):'<div class="atsrs-v134-empty">No files uploaded yet.</div>';
      }
    });
  }

  function hideLegacyNoise(){
    qa('#refsPage #appraisalStatusBadge,#refsPage #referenceStatusBadge,#refsPage #recommendationStatusBadge,#refsPage #coverLetterStatusBadge,#refsPage #v105_appraisal_badge,#refsPage #v105_reference_badge,#refsPage .ref-doc-head .badge').forEach(function(x){x.remove();});
  }

  function run(){setBuild();ensureLayout();hideLegacyNoise();render();}

  ['renderAll','showPage','applyLanguage','renderManagedFiles'].forEach(function(name){
    var old=window[name];
    if(typeof old==='function'&&!old.__atsrsV134){
      var wrapped=function(){var r=old.apply(this,arguments);setTimeout(run,40);setTimeout(run,240);return r;};
      wrapped.__atsrsV134=true;
      window[name]=wrapped;
    }
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',function(){run();setTimeout(run,500);});
  setTimeout(run,900);
})();


/* ===== Original V178 inline script 30 id="ATSRS_V136_DASHBOARD_STABILITY_DC_CU_JS" ===== */
(function(){
  var BUILD='ATSRS V179';
  var UPDATE='Last Update: 01 Jul 2026';
  function q(s,r){return (r||document).querySelector(s)}
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function setBuild(){
    qa('.build-badge').forEach(function(b){
      var d=b.querySelectorAll('div');
      if(d[0])d[0].textContent=BUILD;
      if(d[1])d[1].textContent=UPDATE;
      if(d[2])d[2].textContent='TEST BUILD';
    });
  }
  function clearDashboardStorageOnce(){
    try{
      ['atsrs_dashboard_order_v124','atsrs_dashboard_size_v124','atsrs_dashboard_min_v124'].forEach(function(k){localStorage.removeItem(k);});
    }catch(e){}
  }
  function parkDashboardBuilder(){
    var page=q('#dashboardPage'); if(!page)return;
    qa('.dash-card-tools,.dash-resize-handle,.dash-placeholder',page).forEach(function(x){x.remove();});
    qa('.dash-minimized',page).forEach(function(x){x.classList.remove('dash-minimized');});
    qa('.dash-custom-ready,.dash-resizable,.dash-drag-float',page).forEach(function(el){
      el.classList.remove('dash-drag-float','dash-resizable');
      ['width','height','left','top','right','bottom','transform','opacity','minWidth','maxWidth','zIndex'].forEach(function(p){el.style[p]='';});
      if(el.classList.contains('dash-custom-ready')) el.classList.remove('dash-custom-ready');
    });
    var dock=q('#dashboardDock');
    if(dock){dock.innerHTML='';dock.className='hidden';dock.style.display='none';}
  }
  function attachTopActionsToApp(){
    var app=q('#app'); if(!app)return;
    var top=q('body > .top-actions') || q('body > .atsrs-global-top-actions') || q('body > .atsrs-v56-top-actions') || q('body > .atsrs-v64-top-actions') || q('#app > .top-actions');
    if(!top)return;
    if(top.parentElement!==app)app.insertBefore(top,app.firstChild);
    top.classList.remove('atsrs-global-top-actions','atsrs-v56-top-actions','atsrs-v64-top-actions');
    top.classList.add('top-actions');
    top.removeAttribute('style');
  }
  function stabilizeDashboard(){
    var page=q('#dashboardPage'); if(!page)return;
    var stats=q('.stats-grid',page);
    if(stats){stats.style.cssText=''; qa(':scope > .card',stats).forEach(function(card){card.style.cssText=card.style.cssText.replace(/(?:width|height|left|top|right|bottom|transform|opacity|z-index)\s*:[^;]+;?/gi,'');});}
    var share=q('#shareProfilePanel'); if(share){share.classList.add('atsrs-v136-share-compact');}
  }
  function run(){setBuild();clearDashboardStorageOnce();parkDashboardBuilder();attachTopActionsToApp();stabilizeDashboard();}
  window.initDashboardBuilderV123=function(){setTimeout(run,0);return true;};
  ['showPage','renderAll','applyLanguage'].forEach(function(name){
    var old=window[name];
    if(typeof old==='function' && !old.__atsrsV136){
      var wrapped=function(){var r=old.apply(this,arguments);setTimeout(run,30);setTimeout(run,220);return r;};
      wrapped.__atsrsV136=true; window[name]=wrapped;
    }
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',function(){run();setTimeout(run,500);});
  setTimeout(run,900);
  setInterval(function(){setBuild();parkDashboardBuilder();attachTopActionsToApp();},2500);
})();


/* ===== Original V178 inline script 31 id="ATSRS_V137_TOP_ACTIONS_SCROLL_FIX_JS" ===== */
(function(){
  var BUILD='ATSRS V179';
  var UPDATE='Last Update: 01 Jul 2026';
  function q(s,r){return (r||document).querySelector(s)}
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function setBuild(){qa('.build-badge').forEach(function(b){var d=b.querySelectorAll('div');if(d[0])d[0].textContent=BUILD;if(d[1])d[1].textContent=UPDATE;if(d[2])d[2].textContent='TEST BUILD';});}
  function topbar(){
    var app=q('#app'); if(!app)return;
    var top=q('#app > .top-actions') || q('#app > .atsrs-global-top-actions') || q('#app > .atsrs-v56-top-actions') || q('#app > .atsrs-v64-top-actions') || q('body > .top-actions') || q('body > .atsrs-global-top-actions') || q('body > .atsrs-v56-top-actions') || q('body > .atsrs-v64-top-actions');
    if(!top)return;
    if(top.parentElement!==app) app.insertBefore(top, app.firstChild);
    top.classList.remove('atsrs-global-top-actions','atsrs-v56-top-actions','atsrs-v64-top-actions');
    top.classList.add('top-actions');
    top.style.setProperty('display',app.classList.contains('hidden')?'none':'flex','important');
    top.style.setProperty('position','absolute','important');
    top.style.setProperty('top',window.innerWidth<=800?'12px':'18px','important');
    top.style.setProperty('right',window.innerWidth<=800?'12px':'18px','important');
    top.style.setProperty('left','auto','important');
    top.style.setProperty('bottom','auto','important');
    top.style.setProperty('z-index','90','important');
    top.style.setProperty('transform','none','important');
    top.style.setProperty('will-change','auto','important');
    top.style.setProperty('position','absolute','important');
    var lang=top.querySelector('.lang-floating,.app-lang-switcher');
    if(lang){lang.style.setProperty('position','relative','important');lang.style.setProperty('top','auto','important');lang.style.setProperty('right','auto','important');lang.style.setProperty('left','auto','important');lang.style.setProperty('bottom','auto','important');lang.style.setProperty('transform','none','important');}
  }
  function run(){setBuild();topbar();}
  window.forceTopControlsFixed=topbar;
  window.v55DockTopActions=topbar;
  window.atsrsV70NormaliseTopActions=topbar;
  ['openApp','showPage','renderAll','applyLanguage','changeLanguage','login','localTestLogin','logout','confirmLogout'].forEach(function(name){
    var old=window[name];
    if(typeof old==='function' && !old.__atsrsV137){
      var wrapped=function(){var r=old.apply(this,arguments);setTimeout(run,0);setTimeout(run,100);setTimeout(run,400);return r;};
      wrapped.__atsrsV137=true; window[name]=wrapped;
    }
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',function(){run();setTimeout(run,300);});
  window.addEventListener('resize',run);
  setTimeout(run,0);setTimeout(run,500);setTimeout(run,1200);
})();


/* ===== Original V178 inline script 32 id="ATSRS_V138_CV_PREVIEW_DIRECT_JS" ===== */
(function(){
  function dataUrlToBlob(dataUrl){
    var parts=String(dataUrl||'').split(',');
    if(parts.length<2) return null;
    var meta=parts[0]||'';
    var mimeMatch=meta.match(/data:([^;]+)/i);
    var mime=mimeMatch?mimeMatch[1]:'application/octet-stream';
    var binary=atob(parts.slice(1).join(','));
    var len=binary.length;
    var bytes=new Uint8Array(len);
    for(var i=0;i<len;i++) bytes[i]=binary.charCodeAt(i);
    return new Blob([bytes],{type:mime});
  }
  window.previewCV=function(){
    var cv=(typeof getCV==='function')?getCV():null;
    if(!cv){
      if(typeof v48==='function') alert(v48('cvNoFile'));
      else alert('No CV uploaded yet.');
      return;
    }
    try{
      var targetUrl=cv.data;
      if(String(cv.data||'').indexOf('data:')===0){
        var blob=dataUrlToBlob(cv.data);
        if(blob) targetUrl=URL.createObjectURL(blob);
      }
      var w=window.open(targetUrl,'_blank','noopener');
      if(!w){
        var a=document.createElement('a');
        a.href=targetUrl;
        a.target='_blank';
        a.rel='noopener';
        a.click();
      }
      if(targetUrl!==cv.data){setTimeout(function(){try{URL.revokeObjectURL(targetUrl)}catch(e){}},60000);}
    }catch(e){
      if(cv.data){window.open(cv.data,'_blank','noopener');}
    }
  };
})();


/* ===== Original V178 inline script 33 id="ATSRS_V141_REFERENCES_CARD_MAXIMIZE_JS" ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V179';
  var UPDATE='Last Update: 01 Jul 2026';
  function qa(s,r){return Array.from((r||document).querySelectorAll(s));}
  function setBuild(){
    qa('.build-badge').forEach(function(b){
      var d=b.querySelectorAll('div');
      if(d[0])d[0].textContent=BUILD;
      if(d[1])d[1].textContent=UPDATE;
      if(d[2])d[2].textContent='TEST BUILD';
    });
  }
  function ensureReferenceMaxIcons(){
    var cards=qa('#refsPage .atsrs-v134-career-card');
    cards.forEach(function(card){
      if(card.querySelector('.atsrs-v134-max-icon'))return;
      var btn=document.createElement('button');
      btn.type='button';
      btn.className='atsrs-v134-max-icon';
      btn.setAttribute('aria-label','Maximize card');
      btn.title='Maximize';
      btn.textContent='□';
      btn.onclick=function(e){
        e.preventDefault();
        e.stopPropagation();
        var expanded=card.classList.toggle('atsrs-v141-expanded');
        btn.textContent=expanded?'—':'□';
        btn.title=expanded?'Minimize':'Maximize';
        btn.setAttribute('aria-label',expanded?'Minimize card':'Maximize card');
      };
      card.appendChild(btn);
    });
  }
  function run(){setBuild();ensureReferenceMaxIcons();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',function(){run();setTimeout(run,250);setTimeout(run,900);});
  ['renderAll','showPage','applyLanguage'].forEach(function(name){
    var old=window[name];
    if(typeof old==='function'&&!old.__atsrsV141){
      var wrapped=function(){var r=old.apply(this,arguments);setTimeout(run,50);setTimeout(run,300);return r;};
      wrapped.__atsrsV141=true;
      window[name]=wrapped;
    }
  });
  setInterval(function(){if(document.getElementById('refsPage'))run();},1500);
})();


/* ===== Original V178 inline script 34 id="ATSRS_V142_REFERENCES_ICON_EXPAND_JS" ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V179';
  var UPDATE='Last Update: 01 Jul 2026';
  function qa(s,r){return Array.from((r||document).querySelectorAll(s));}
  function setBuild(){
    qa('.build-badge').forEach(function(b){
      var d=b.querySelectorAll('div');
      if(d[0])d[0].textContent=BUILD;
      if(d[1])d[1].textContent=UPDATE;
      if(d[2])d[2].textContent='TEST BUILD';
    });
  }
  function applyIcons(){
    qa('#refsPage .atsrs-v134-career-card').forEach(function(card){
      var btn=card.querySelector('.atsrs-v134-max-icon');
      if(!btn){
        btn=document.createElement('button');
        btn.type='button';
        btn.className='atsrs-v134-max-icon';
        card.appendChild(btn);
      }
      btn.textContent=card.classList.contains('atsrs-v142-expanded')||card.classList.contains('atsrs-v141-expanded')?'⤡':'⤢';
      btn.title=card.classList.contains('atsrs-v142-expanded')||card.classList.contains('atsrs-v141-expanded')?'Minimize':'Maximize';
      btn.setAttribute('aria-label',btn.title+' card');
      btn.onclick=function(e){
        e.preventDefault();
        e.stopPropagation();
        var isExpanded=card.classList.contains('atsrs-v142-expanded')||card.classList.contains('atsrs-v141-expanded');
        card.classList.toggle('atsrs-v142-expanded',!isExpanded);
        card.classList.remove('atsrs-v141-expanded');
        btn.textContent=!isExpanded?'⤡':'⤢';
        btn.title=!isExpanded?'Minimize':'Maximize';
        btn.setAttribute('aria-label',btn.title+' card');
      };
    });
  }
  function run(){setBuild();applyIcons();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',function(){run();setTimeout(run,250);setTimeout(run,900);});
  ['renderAll','showPage','applyLanguage'].forEach(function(name){
    var old=window[name];
    if(typeof old==='function'&&!old.__atsrsV142){
      var wrapped=function(){var r=old.apply(this,arguments);setTimeout(run,50);setTimeout(run,300);return r;};
      wrapped.__atsrsV142=true;
      window[name]=wrapped;
    }
  });
  setInterval(function(){if(document.getElementById('refsPage'))run();},1200);
})();


/* ===== Original V178 inline script 35 id="ATSRS_V144_REFERENCES_OVERLAY_MAXIMIZE_JS" ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V179';
  var UPDATE='Last Update: 01 Jul 2026';
  function qa(s,r){return Array.from((r||document).querySelectorAll(s));}
  function q(s,r){return (r||document).querySelector(s);}
  function setBuild(){
    qa('.build-badge').forEach(function(b){
      var d=b.querySelectorAll('div');
      if(d[0])d[0].textContent=BUILD;
      if(d[1])d[1].textContent=UPDATE;
      if(d[2])d[2].textContent='TEST BUILD';
    });
  }
  function grid(){return q('#refsPage .ref-grid');}
  function careerCards(){return qa('#refsPage .atsrs-v134-career-card');}
  function firstCareerTop(g){
    var cards=careerCards();
    if(!g || !cards.length)return 0;
    var gr=g.getBoundingClientRect();
    var top=Math.min.apply(null,cards.map(function(c){return c.getBoundingClientRect().top;}));
    return Math.max(0, Math.round(top-gr.top+g.scrollTop));
  }
  function removePlaceholder(card){
    var phId=card&&card.getAttribute('data-v144-placeholder');
    if(phId){var ph=document.getElementById(phId); if(ph)ph.remove(); card.removeAttribute('data-v144-placeholder');}
    if(card){
      var old=card.getAttribute('data-v143-placeholder');
      if(old){var oldPh=document.getElementById(old); if(oldPh)oldPh.remove(); card.removeAttribute('data-v143-placeholder');}
    }
  }
  function setIcon(card,on){
    var btn=card.querySelector('.atsrs-v134-max-icon');
    if(btn){btn.textContent=on?'⤡':'⤢';btn.title=on?'Minimize':'Maximize';btn.setAttribute('aria-label',btn.title+' card');}
  }
  function collapse(card){
    if(!card)return;
    card.classList.remove('atsrs-v144-expanded','atsrs-v143-expanded','atsrs-v142-expanded','atsrs-v141-expanded');
    removePlaceholder(card);
    setIcon(card,false);
    var g=grid();
    if(g && !q('#refsPage .atsrs-v134-career-card.atsrs-v144-expanded')){
      g.classList.remove('atsrs-v144-overlay-active','atsrs-v143-overlay-active');
      g.style.removeProperty('--atsrs-v144-overlay-top');
    }
  }
  function collapseAll(except){
    careerCards().forEach(function(c){if(c!==except)collapse(c);});
    qa('#refsPage .atsrs-v143-placeholder').forEach(function(p){p.remove();});
  }
  function expand(card){
    var g=grid(); if(!g || !card)return;
    collapseAll(card);
    removePlaceholder(card);
    g.style.setProperty('--atsrs-v144-overlay-top', firstCareerTop(g)+'px');
    var ph=document.createElement('div');
    ph.className='ref-card atsrs-v144-placeholder';
    ph.id='atsrsV144Ph_'+Math.random().toString(36).slice(2);
    ph.style.order=card.style.order || getComputedStyle(card).order || '0';
    ph.style.gridColumn=getComputedStyle(card).gridColumn || 'auto';
    ph.style.minHeight=Math.max(card.getBoundingClientRect().height,580)+'px';
    card.parentNode.insertBefore(ph,card);
    card.setAttribute('data-v144-placeholder',ph.id);
    g.classList.add('atsrs-v144-overlay-active');
    g.classList.remove('atsrs-v143-overlay-active');
    card.classList.remove('atsrs-v143-expanded','atsrs-v142-expanded','atsrs-v141-expanded');
    card.classList.add('atsrs-v144-expanded');
    setIcon(card,true);
  }
  function bind(){
    setBuild();
    qa('#refsPage .atsrs-v143-placeholder').forEach(function(p){p.remove();});
    careerCards().forEach(function(card){
      card.classList.remove('atsrs-v143-expanded');
      var btn=card.querySelector('.atsrs-v134-max-icon');
      if(!btn){btn=document.createElement('button');btn.type='button';btn.className='atsrs-v134-max-icon';card.appendChild(btn);}
      setIcon(card,card.classList.contains('atsrs-v144-expanded'));
      btn.onclick=function(e){
        e.preventDefault(); e.stopPropagation();
        if(card.classList.contains('atsrs-v144-expanded'))collapse(card); else expand(card);
        return false;
      };
    });
  }
  function run(){bind();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',function(){run();setTimeout(run,250);setTimeout(run,900);});
  ['renderAll','showPage','applyLanguage'].forEach(function(name){
    var old=window[name];
    if(typeof old==='function'&&!old.__atsrsV144){
      var wrapped=function(){var r=old.apply(this,arguments);setTimeout(run,80);setTimeout(run,350);return r;};
      wrapped.__atsrsV144=true;
      window[name]=wrapped;
    }
  });
  setInterval(function(){if(document.getElementById('refsPage'))run();},500);
})();


/* ===== Original V178 inline script 36 id="ATSRS_V145_REFERENCES_FULL_WIDTH_STACK_JS" ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V179';
  var UPDATE='Last Update: 01 Jul 2026';
  function qa(s,r){return Array.from((r||document).querySelectorAll(s));}
  function q(s,r){return (r||document).querySelector(s);}
  function setBuild(){qa('.build-badge').forEach(function(b){var d=b.querySelectorAll('div');if(d[0])d[0].textContent=BUILD;if(d[1])d[1].textContent=UPDATE;if(d[2])d[2].textContent='TEST BUILD';});}
  function normalizeRefs(){
    setBuild();
    var grid=q('#refsPage .ref-grid');
    if(grid){
      grid.classList.remove('atsrs-v144-overlay-active','atsrs-v143-overlay-active');
      grid.style.removeProperty('--atsrs-v144-overlay-top');
    }
    qa('#refsPage .atsrs-v143-placeholder,#refsPage .atsrs-v144-placeholder').forEach(function(x){x.remove();});
    qa('#refsPage .atsrs-v134-career-card').forEach(function(card){
      card.classList.remove('atsrs-v144-expanded','atsrs-v143-expanded','atsrs-v142-expanded','atsrs-v141-expanded');
      card.removeAttribute('data-v144-placeholder');
      card.removeAttribute('data-v143-placeholder');
      var kind=card.getAttribute('data-atsrs-v134-kind');
      if(kind==='appraisal')card.style.order='10';
      if(kind==='reference')card.style.order='20';
      if(kind==='recommendation')card.style.order='30';
      if(kind==='coverLetter')card.style.order='40';
      qa('.atsrs-v134-max-icon',card).forEach(function(b){b.remove();});
    });
    var cv=q('#refsPage .cv-card'); if(cv)cv.style.order='0';
  }
  function run(){setBuild();normalizeRefs();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',function(){run();setTimeout(run,250);setTimeout(run,900);});
  ['renderAll','showPage','applyLanguage'].forEach(function(name){
    var old=window[name];
    if(typeof old==='function'&&!old.__atsrsV145){
      var wrapped=function(){var r=old.apply(this,arguments);setTimeout(run,80);setTimeout(run,350);return r;};
      wrapped.__atsrsV145=true; window[name]=wrapped;
    }
  });
  setInterval(function(){if(document.getElementById('refsPage')&&!document.getElementById('refsPage').classList.contains('hidden'))normalizeRefs();},700);
})();


/* ===== Original V178 inline script 37 id="ATSRS_V146_REFERENCES_COMPACT_LIST_FIVE_FILES_SCROLL_JS" ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V179';
  var UPDATE='Last Update: 01 Jul 2026';
  function byId(id){return document.getElementById(id);}
  function qa(s,r){return Array.from((r||document).querySelectorAll(s));}
  function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function readJson(k,d){try{var v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}}
  function writeJson(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
  function setBuild(){qa('.build-badge').forEach(function(b){var d=b.querySelectorAll('div');if(d[0])d[0].textContent=BUILD;if(d[1])d[1].textContent=UPDATE;if(d[2])d[2].textContent='TEST BUILD';});}
  function fileRow(kind,f,api){
    return '<div class="atsrs-v146-row">'+
      '<div class="atsrs-v146-name"><b title="'+esc(f.name)+'">'+esc(f.name||'File')+'</b><span class="atsrs-v146-size">'+Math.round((f.size||0)/1024)+' KB</span></div>'+
      '<div class="atsrs-v146-actions"><button class="secondary" onclick="'+api+'.preview(\''+esc(kind)+'\',\''+esc(f.id)+'\')">Preview</button><button class="secondary" onclick="'+api+'.download(\''+esc(kind)+'\',\''+esc(f.id)+'\')">Download</button><button class="action" onclick="'+api+'.del(\''+esc(kind)+'\',\''+esc(f.id)+'\')">Delete</button></div>'+
    '</div>';
  }
  function openFile(f){if(!f||!f.data){alert('File preview is not available.');return;}var w=window.open('','_blank');if(w){w.document.write('<title>'+esc(f.name||'File')+'</title><iframe src="'+f.data+'" style="border:0;width:100%;height:100vh"></iframe>');w.document.close();}}
  function dlFile(f,prefix){if(!f||!f.data){alert('File download is not available.');return;}var a=document.createElement('a');a.href=f.data;a.download=f.name||prefix;document.body.appendChild(a);a.click();a.remove();}
  window.atsrsV146CV={
    files:function(){var a=readJson('cvFiles',[]);return Array.isArray(a)?a:[];},
    save:function(a){writeJson('cvFiles',Array.isArray(a)?a:[]);},
    preview:function(kind,id){openFile(this.files().find(function(x){return x.id===id;})||this.files()[0]);},
    download:function(kind,id){dlFile(this.files().find(function(x){return x.id===id;})||this.files()[0],'ATSRS-CV');},
    del:function(kind,id){this.save(this.files().filter(function(x){return x.id!==id;})); renderCVStatus();}
  };
  window.handleCVUpload=function(event){
    var files=event.target.files||[]; if(!files.length)return; var saved=window.atsrsV146CV.files(), left=files.length;
    Array.prototype.forEach.call(files,function(file){var reader=new FileReader();reader.onload=function(){saved.unshift({id:Date.now()+'_'+Math.random().toString(36).slice(2),name:file.name,type:file.type||'application/octet-stream',size:file.size||0,updated:new Date().toISOString(),data:reader.result}); if(--left===0){window.atsrsV146CV.save(saved);event.target.value='';renderCVStatus();}};reader.readAsDataURL(file);});
  };
  window.previewCV=function(){window.atsrsV146CV.preview('cv','');};
  window.downloadCV=function(){window.atsrsV146CV.download('cv','');};
  window.deleteCV=function(){var a=window.atsrsV146CV.files(); if(!a.length){alert('No CV uploaded yet.');return;} window.atsrsV146CV.save([]); var input=byId('cvUploadInput'); if(input)input.value=''; renderCVStatus();};
  window.renderCVStatus=function(){
    var files=window.atsrsV146CV.files();
    var badge=byId('cvStatusBadge'); if(badge){badge.textContent=files.length?(files.length+' file'+(files.length>1?'s':'')):'No File';badge.className='badge '+(files.length?'badge-ready':'badge-blocked');}
    var info=byId('cvFileInfo'); if(info){info.classList.add('atsrs-v146-list');info.innerHTML=files.length?files.map(function(f){return fileRow('cv',f,'atsrsV146CV');}).join(''):'<div class="atsrs-v146-empty">No files uploaded yet.</div>';}
    var t=byId('cvCardTitle'); if(t)t.textContent='CV / Resume';
    var b=byId('uploadCVBtn'); if(b)b.textContent='Upload CV';
    var p=byId('previewCVBtn'); if(p)p.textContent='Preview';
    var d=byId('downloadCVBtn'); if(d)d.textContent='Download';
    var del=byId('deleteCVBtn'); if(del)del.textContent='Delete';
  };
  window.atsrsV146Cover={
    files:function(){var a=readJson('coverLetterFiles',[]);return Array.isArray(a)?a:[];},
    save:function(a){writeJson('coverLetterFiles',Array.isArray(a)?a:[]);},
    preview:function(kind,id){openFile(this.files().find(function(x){return x.id===id;})||this.files()[0]);},
    download:function(kind,id){dlFile(this.files().find(function(x){return x.id===id;})||this.files()[0],'ATSRS-cover-letter');},
    del:function(kind,id){this.save(this.files().filter(function(x){return x.id!==id;})); renderCoverLetterV146();}
  };
  function renderCoverLetterV146(){
    var info=byId('coverLetterFileInfo'), badge=byId('coverLetterStatusBadge'), files=window.atsrsV146Cover.files();
    if(badge){badge.textContent=files.length?(files.length+' file'+(files.length>1?'s':'')):'No File';badge.className='badge '+(files.length?'badge-ready':'badge-blocked');}
    if(info){info.classList.add('atsrs-v146-list');info.innerHTML=files.length?files.map(function(f){return fileRow('coverLetter',f,'atsrsV146Cover');}).join(''):'<div class="atsrs-v146-empty">No files uploaded yet.</div>';}
    var p=byId('previewCoverLetterBtn'); if(p)p.textContent='Preview';
    var d=byId('downloadCoverLetterBtn'); if(d)d.textContent='Download';
    var del=byId('deleteCoverLetterBtn'); if(del)del.textContent='Delete';
  }
  window.previewCoverLetter=function(){window.atsrsV146Cover.preview('coverLetter','');};
  window.downloadCoverLetter=function(){window.atsrsV146Cover.download('coverLetter','');};
  window.deleteCoverLetter=function(){var a=window.atsrsV146Cover.files(); if(!a.length){alert('No cover letter uploaded yet.');return;} window.atsrsV146Cover.save([]);renderCoverLetterV146();};
  function normalizeRefs(){
    setBuild();
    var grid=document.querySelector('#refsPage .ref-grid'); if(grid)grid.classList.remove('atsrs-v144-overlay-active','atsrs-v143-overlay-active');
    qa('#refsPage .atsrs-v143-placeholder,#refsPage .atsrs-v144-placeholder,#refsPage .atsrs-v134-max-icon').forEach(function(x){x.remove();});
    qa('#refsPage .atsrs-v134-career-card').forEach(function(card){card.classList.remove('atsrs-v144-expanded','atsrs-v143-expanded','atsrs-v142-expanded','atsrs-v141-expanded');});
    renderCVStatus(); renderCoverLetterV146();
  }
  function run(){try{normalizeRefs();}catch(e){setBuild();}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',function(){run();setTimeout(run,250);setTimeout(run,900);});
  ['renderAll','showPage','applyLanguage'].forEach(function(name){var old=window[name];if(typeof old==='function'&&!old.__atsrsV146){var wrapped=function(){var r=old.apply(this,arguments);setTimeout(run,80);setTimeout(run,350);return r;};wrapped.__atsrsV146=true;window[name]=wrapped;}});
  setInterval(function(){var refs=byId('refsPage');if(refs&&!refs.classList.contains('hidden'))run();},900);
})();


/* ===== Original V178 inline script 38 id="ATSRS_V147_BUILD_LABEL_SCRIPT" ===== */
(function(){
  function qa(s,r){return Array.from((r||document).querySelectorAll(s));}
  function setBuild(){qa('.build-badge').forEach(function(b){var d=b.querySelectorAll('div');if(d[0])d[0].textContent='ATSRS V168';if(d[1])d[1].textContent='Last Update: 01 Jul 2026';if(d[2])d[2].textContent='TEST BUILD';});}
  setBuild();
  document.addEventListener('DOMContentLoaded',setBuild);
  setTimeout(setBuild,300);
})();


/* ===== Original V178 inline script 39 id="ATSRS_V148_BUILD_LABEL_SCRIPT" ===== */
(function(){
  function qa(s,r){return Array.from((r||document).querySelectorAll(s));}
  function setBuild(){qa('.build-badge').forEach(function(b){var d=b.querySelectorAll('div');if(d[0])d[0].textContent='ATSRS V168';if(d[1])d[1].textContent='Last Update: 01 Jul 2026';if(d[2])d[2].textContent='TEST BUILD';});}
  setBuild();document.addEventListener('DOMContentLoaded',setBuild);setTimeout(setBuild,300);setTimeout(setBuild,900);
})();


/* ===== Original V178 inline script 40 id="ATSRS_V150_OLD_LOCK_REMOVED_COMPACT_ROWS_JS" ===== */
(function(){
  var BUILD='ATSRS V179';
  var UPDATED='22 Jun 2026';
  function qa(s,r){return Array.from((r||document).querySelectorAll(s));}
  function setBuild(){
    qa('.build-badge').forEach(function(b){
      var d=b.querySelectorAll('div');
      if(d[0])d[0].textContent=BUILD;
      if(d[1])d[1].textContent='Last Update: 01 Jul 2026'+UPDATED;
      if(d[2])d[2].textContent='TEST BUILD';
    });
  }
  function compactRows(){
    setBuild();
    qa('#refsPage .career-record-list, #refsPage .atsrs-v134-list, #refsPage #cvFileInfo.atsrs-v146-list, #refsPage #coverLetterFileInfo.atsrs-v146-list').forEach(function(list){
      list.style.setProperty('max-height', window.innerWidth<=760?'216px':'196px','important');
      list.style.setProperty('min-height','0','important');
      list.style.setProperty('height','auto','important');
      list.style.setProperty('overflow-y','auto','important');
      list.style.setProperty('overflow-x','hidden','important');
      list.style.setProperty('padding','0 4px 0 0','important');
      list.style.setProperty('margin','6px 0 4px','important');
    });
    qa('#refsPage .career-record-row, #refsPage .atsrs-v134-row, #refsPage .atsrs-v146-row').forEach(function(row){
      var h=window.innerWidth<=760?'42px':'38px';
      row.style.setProperty('display','grid','important');
      row.style.setProperty('grid-template-columns','minmax(0,1fr) auto','important');
      row.style.setProperty('align-items','center','important');
      row.style.setProperty('min-height',h,'important');
      row.style.setProperty('height',h,'important');
      row.style.setProperty('max-height',h,'important');
      row.style.setProperty('padding','0 8px','important');
      row.style.setProperty('margin','0','important');
      row.style.setProperty('gap','10px','important');
      row.style.setProperty('border-radius','0','important');
      row.style.setProperty('background','transparent','important');
      row.style.setProperty('box-shadow','none','important');
      row.style.setProperty('overflow','hidden','important');
    });
  }
  window.atsrsV150CompactRows=compactRows;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',compactRows);else compactRows();
  window.addEventListener('load',function(){compactRows();setTimeout(compactRows,100);setTimeout(compactRows,500);setTimeout(compactRows,1200);});
  ['renderManagedFiles','renderAll','showPage','applyLanguage'].forEach(function(name){
    var old=window[name];
    if(typeof old==='function'&&!old.__atsrsV150Compact){
      var wrapped=function(){var r=old.apply(this,arguments);setTimeout(compactRows,0);setTimeout(compactRows,120);return r;};
      wrapped.__atsrsV150Compact=true;window[name]=wrapped;
    }
  });
  setInterval(compactRows,250);
})();


/* ===== Original V178 inline script 41 id="ATSRS_V151_INDEXEDDB_REFERENCES_UPLOAD_FIX_JS" ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V179';
  var UPDATE='Last Update: 01 Jul 2026';
  var KINDS=['appraisal','reference','recommendation','coverLetter'];
  var DB_NAME='ATSRS_FILE_DB_V151';
  var STORE='files';
  var dbPromise=null;
  function byId(id){return document.getElementById(id);} 
  function qa(s,r){return Array.from((r||document).querySelectorAll(s));}
  function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function uid(){try{return (window.currentUser&&window.currentUser.id)||localStorage.getItem('atsrs_saved_login_email')||'local_test_user';}catch(e){return 'local_test_user';}}
  function scoped(kind){return uid()+'::'+kind;}
  function openDB(){
    if(dbPromise)return dbPromise;
    dbPromise=new Promise(function(resolve,reject){
      if(!window.indexedDB){reject(new Error('IndexedDB not available'));return;}
      var req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=function(){var db=req.result;if(!db.objectStoreNames.contains(STORE)){var st=db.createObjectStore(STORE,{keyPath:'id'});st.createIndex('scopeKind','scopeKind',{unique:false});}};
      req.onsuccess=function(){resolve(req.result);}; req.onerror=function(){reject(req.error||new Error('IndexedDB open failed'));};
    });
    return dbPromise;
  }
  async function tx(mode,fn){var db=await openDB();return new Promise(function(resolve,reject){var t=db.transaction(STORE,mode);var st=t.objectStore(STORE);var val; t.oncomplete=function(){resolve(val);}; t.onerror=function(){reject(t.error);}; val=fn(st);});}
  async function getAll(kind){
    var key=scoped(kind); var db=await openDB();
    return new Promise(function(resolve,reject){
      var t=db.transaction(STORE,'readonly'); var idx=t.objectStore(STORE).index('scopeKind'); var req=idx.getAll(key);
      req.onsuccess=function(){resolve((req.result||[]).sort(function(a,b){return String(b.updated||'').localeCompare(String(a.updated||''));}));};
      req.onerror=function(){reject(req.error);};
    });
  }
  async function putFiles(kind,fileList){
    var files=Array.from(fileList||[]); if(!files.length)return;
    await tx('readwrite',function(st){files.forEach(function(file){st.put({id:Date.now()+'_'+Math.random().toString(36).slice(2),scopeKind:scoped(kind),userId:uid(),kind:kind,name:file.name,type:file.type||'application/octet-stream',size:file.size||0,updated:new Date().toISOString(),blob:file});});});
  }
  async function del(kind,id){await tx('readwrite',function(st){st.delete(id);});}
  async function getOne(kind,id){var arr=await getAll(kind);return arr.find(function(x){return x.id===id;});}
  function setBuild(){qa('.build-badge').forEach(function(b){var d=b.querySelectorAll('div'); if(d[0])d[0].textContent=BUILD; if(d[1])d[1].textContent=UPDATE; if(d[2])d[2].textContent='TEST BUILD';});}
  function label(n){return n>0?(n+' File'+(n>1?'s':'')):'No File';}
  function row(kind,f){return '<div class="atsrs-v134-row"><div><b title="'+esc(f.name)+'">📄 '+esc(f.name||'File')+'</b><span>'+Math.round((f.size||0)/1024)+' KB</span></div><div class="atsrs-v134-actions"><button class="secondary" onclick="atsrsV151Preview(\''+kind+'\',\''+esc(f.id)+'\')">Preview</button><button class="secondary" onclick="atsrsV151Download(\''+kind+'\',\''+esc(f.id)+'\')">Download</button><button class="action" onclick="atsrsV151Delete(\''+kind+'\',\''+esc(f.id)+'\')">Delete</button></div></div>';}
  async function renderKind(kind){
    var arr=[]; try{arr=await getAll(kind);}catch(e){console.warn(e);} 
    var status=byId('v134_'+kind+'_status'), list=byId('v134_'+kind+'_list'), filter=byId('v134_'+kind+'_filter');
    if(status){status.textContent=label(arr.length);status.className='atsrs-v134-status '+(arr.length?'ready':'empty');}
    if(filter){filter.classList.toggle('active',arr.length>0);} 
    if(list){list.innerHTML=arr.length?arr.map(function(f){return row(kind,f);}).join(''):'<div class="atsrs-v134-empty">No files uploaded yet.</div>';}
  }
  async function renderAllV151(){setBuild(); for(var i=0;i<KINDS.length;i++) await renderKind(KINDS[i]);}
  function bindInputs(){KINDS.forEach(function(kind){var inp=byId('v134_'+kind+'_input'); if(inp && !inp.__v151Bound){inp.__v151Bound=true; inp.onchange=async function(e){try{await putFiles(kind,e.target.files); e.target.value=''; await renderAllV151();}catch(err){alert('Upload could not be saved. Browser storage may be blocked or full.'); console.error(err);}};}});}
  window.atsrsV151Preview=async function(kind,id){var f=await getOne(kind,id); if(!f||!f.blob){alert('File preview is not available.');return;} var url=URL.createObjectURL(f.blob); var w=window.open('','_blank'); if(w){w.document.write('<title>'+esc(f.name||'File')+'</title><iframe src="'+url+'" style="border:0;width:100%;height:100vh"></iframe>');w.document.close();} setTimeout(function(){URL.revokeObjectURL(url);},60000);};
  window.atsrsV151Download=async function(kind,id){var f=await getOne(kind,id); if(!f||!f.blob){alert('File download is not available.');return;} var url=URL.createObjectURL(f.blob); var a=document.createElement('a'); a.href=url; a.download=f.name||('ATSRS-'+kind); document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){URL.revokeObjectURL(url);},30000);};
  window.atsrsV151Delete=async function(kind,id){await del(kind,id); await renderAllV151();};
  function run(){setBuild(); bindInputs(); renderAllV151();}
  ['renderAll','showPage','applyLanguage'].forEach(function(name){var old=window[name]; if(typeof old==='function'&&!old.__atsrsV151){var wrapped=function(){var r=old.apply(this,arguments);setTimeout(run,80);setTimeout(run,350);return r;}; wrapped.__atsrsV151=true; window[name]=wrapped;}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run); else run();
  window.addEventListener('load',function(){run();setTimeout(run,700);}); setTimeout(run,1100);
})();


/* ===== Original V178 inline script 42 id="ATSRS_V152_REFERENCES_PERSISTENCE_HARD_FIX_JS" ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V179';
  var UPDATE='Last Update: 01 Jul 2026';
  var KINDS=['appraisal','reference','recommendation','coverLetter'];
  var DB_NAME='ATSRS_FILE_DB_MAIN';
  var STORE='referenceFiles';
  var dbp=null;
  function byId(id){return document.getElementById(id);} 
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
  function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function uid(){try{return (window.currentUser&&window.currentUser.id)||localStorage.getItem('atsrs_saved_login_email')||localStorage.getItem('atsrs_local_uid')||'local_test_user';}catch(e){return 'local_test_user';}}
  function scope(kind){return uid()+'::'+kind;}
  function setBuild(){qa('.build-badge').forEach(function(b){var d=b.querySelectorAll('div');if(d[0])d[0].textContent=BUILD;if(d[1])d[1].textContent=UPDATE;if(d[2])d[2].textContent='TEST BUILD';});}
  function openDB(){
    if(dbp)return dbp;
    dbp=new Promise(function(resolve,reject){
      if(!window.indexedDB){reject(new Error('IndexedDB is blocked'));return;}
      var req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=function(){var db=req.result;if(!db.objectStoreNames.contains(STORE)){var st=db.createObjectStore(STORE,{keyPath:'id'});st.createIndex('scopeKind','scopeKind',{unique:false});}};
      req.onsuccess=function(){resolve(req.result);};
      req.onerror=function(){reject(req.error||new Error('IndexedDB open failed'));};
    });
    return dbp;
  }
  function asDataURL(file){return new Promise(function(resolve,reject){var r=new FileReader();r.onload=function(){resolve(r.result);};r.onerror=function(){reject(r.error||new Error('File read failed'));};r.readAsDataURL(file);});}
  async function all(kind){
    var db=await openDB(); var key=scope(kind);
    return new Promise(function(resolve,reject){var t=db.transaction(STORE,'readonly');var st=t.objectStore(STORE);var idx=st.index('scopeKind');var req=idx.getAll(key);req.onsuccess=function(){resolve((req.result||[]).sort(function(a,b){return String(b.updated||'').localeCompare(String(a.updated||''));}));};req.onerror=function(){reject(req.error);};});
  }
  async function put(kind,files){
    files=Array.from(files||[]); if(!files.length)return;
    var rows=[];
    for(var i=0;i<files.length;i++){var f=files[i];rows.push({id:Date.now()+'_'+i+'_'+Math.random().toString(36).slice(2),scopeKind:scope(kind),userId:uid(),kind:kind,name:f.name,type:f.type||'application/octet-stream',size:f.size||0,updated:new Date().toISOString(),data:await asDataURL(f)});} 
    var db=await openDB();
    await new Promise(function(resolve,reject){var t=db.transaction(STORE,'readwrite');var st=t.objectStore(STORE);rows.forEach(function(x){st.put(x);});t.oncomplete=resolve;t.onerror=function(){reject(t.error);};});
    mirrorMeta(kind, await all(kind));
  }
  async function del(kind,id){var db=await openDB();await new Promise(function(resolve,reject){var t=db.transaction(STORE,'readwrite');t.objectStore(STORE).delete(id);t.oncomplete=resolve;t.onerror=function(){reject(t.error);};});mirrorMeta(kind, await all(kind));}
  async function one(kind,id){return (await all(kind)).find(function(x){return x.id===id;});}
  function mirrorKey(kind){return 'atsrs_file_meta_'+uid()+'_'+kind;}
  function mirrorMeta(kind,arr){try{localStorage.setItem(mirrorKey(kind),JSON.stringify((arr||[]).map(function(x){return {id:x.id,name:x.name,size:x.size,type:x.type,updated:x.updated};})));}catch(e){}}
  function oldKeys(kind){return ['atsrs_'+uid()+'_v134_'+kind+'Files','atsrs_'+uid()+'_'+kind+'Files','atsrs_'+uid()+'_coverLetterFiles','atsrs_local_test_user_v134_'+kind+'Files','atsrs_local_test_user_'+kind+'Files'];}
  async function migrate(kind){
    if((await all(kind)).length)return;
    var found=[];
    oldKeys(kind).forEach(function(k){try{var a=JSON.parse(localStorage.getItem(k)||'[]');if(Array.isArray(a))a.forEach(function(x){if(x&&x.data)found.push(x);});}catch(e){}});
    if(!found.length)return;
    var db=await openDB();
    await new Promise(function(resolve,reject){var t=db.transaction(STORE,'readwrite'), st=t.objectStore(STORE);found.forEach(function(x,i){st.put({id:x.id||Date.now()+'_'+i,scopeKind:scope(kind),userId:uid(),kind:kind,name:x.name||'File',type:x.type||'application/octet-stream',size:x.size||0,updated:x.updated||new Date().toISOString(),data:x.data});});t.oncomplete=resolve;t.onerror=function(){reject(t.error);};});
  }
  function label(n){return n?(n+' File'+(n>1?'s':'')):'No File';}
  function row(kind,f){return '<div class="atsrs-v134-row"><div><b title="'+esc(f.name)+'">📄 '+esc(f.name||'File')+'</b><span>'+Math.round((f.size||0)/1024)+' KB</span></div><div class="atsrs-v134-actions"><button class="secondary" onclick="atsrsV152Preview(\''+kind+'\',\''+esc(f.id)+'\')">Preview</button><button class="secondary" onclick="atsrsV152Download(\''+kind+'\',\''+esc(f.id)+'\')">Download</button><button class="action" onclick="atsrsV152Delete(\''+kind+'\',\''+esc(f.id)+'\')">Delete</button></div></div>';}
  async function renderKind(kind){
    await migrate(kind);
    var arr=[];try{arr=await all(kind);}catch(e){console.warn('ATSRS V168 read failed',e);}mirrorMeta(kind,arr);
    var st=byId('v134_'+kind+'_status'), list=byId('v134_'+kind+'_list'), filter=byId('v134_'+kind+'_filter');
    if(st){st.textContent=label(arr.length);st.className='atsrs-v134-status '+(arr.length?'ready':'empty');}
    if(filter)filter.classList.toggle('active',arr.length>0);
    if(list)list.innerHTML=arr.length?arr.map(function(f){return row(kind,f);}).join(''):'<div class="atsrs-v134-empty">No files uploaded yet.</div>';
  }
  async function render(){setBuild();for(var i=0;i<KINDS.length;i++)await renderKind(KINDS[i]);bind();}
  function bind(){KINDS.forEach(function(kind){var inp=byId('v134_'+kind+'_input');if(inp){inp.onchange=async function(e){try{await put(kind,e.target.files);e.target.value='';await render();}catch(err){console.error(err);alert('Upload could not be saved. Storage is blocked/full. Try Chrome and keep the same file location, or connect backend storage.');}};}});}
  window.atsrsV152Preview=async function(kind,id){var f=await one(kind,id);if(!f||!f.data){alert('File preview is not available.');return;}var w=window.open('','_blank');if(w){w.document.write('<title>'+esc(f.name||'File')+'</title><iframe src="'+f.data+'" style="border:0;width:100%;height:100vh"></iframe>');w.document.close();}};
  window.atsrsV152Download=async function(kind,id){var f=await one(kind,id);if(!f||!f.data){alert('File download is not available.');return;}var a=document.createElement('a');a.href=f.data;a.download=f.name||('ATSRS-'+kind);document.body.appendChild(a);a.click();a.remove();};
  window.atsrsV152Delete=async function(kind,id){await del(kind,id);await render();};
  ['renderAll','showPage','applyLanguage','renderManagedFiles'].forEach(function(n){var old=window[n];if(typeof old==='function'&&!old.__atsrsV152){var wrap=function(){var r=old.apply(this,arguments);setTimeout(render,120);setTimeout(render,500);return r;};wrap.__atsrsV152=true;window[n]=wrap;}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(render,150);});else setTimeout(render,150);
  window.addEventListener('load',function(){render();setTimeout(render,800);});setInterval(function(){if(byId('refsPage')&&!byId('refsPage').classList.contains('hidden')){setBuild();bind();}},1200);
})();


/* ===== Original V178 inline script 43 id="ATSRS_V156_CV_SLOTS_UNDER_MAIN_STABLE_LAYOUT_JS" ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V156';
  var UPDATE='Last Update: 01 Jul 2026';
  var DB_NAME='ATSRS_FILE_DB_MAIN', STORE='referenceFiles', KIND='cv';
  var dbp=null, rendering=false, pending=false;
  function byId(id){return document.getElementById(id);} 
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
  function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function uid(){try{return (window.currentUser&&window.currentUser.id)||localStorage.getItem('atsrs_saved_login_email')||localStorage.getItem('atsrs_local_uid')||'local_test_user';}catch(e){return 'local_test_user';}}
  function scope(){return uid()+'::'+KIND;}
  function setBuild(){qa('.build-badge').forEach(function(b){var d=b.querySelectorAll('div');if(d[0])d[0].textContent=BUILD;if(d[1])d[1].textContent=UPDATE;if(d[2])d[2].textContent='TEST BUILD';});}
  function openDB(){
    if(dbp)return dbp;
    dbp=new Promise(function(resolve,reject){
      if(!window.indexedDB){reject(new Error('IndexedDB blocked'));return;}
      var req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=function(){var db=req.result;if(!db.objectStoreNames.contains(STORE)){var st=db.createObjectStore(STORE,{keyPath:'id'});st.createIndex('scopeKind','scopeKind',{unique:false});}};
      req.onsuccess=function(){resolve(req.result);};
      req.onerror=function(){reject(req.error||new Error('IndexedDB open failed'));};
    });
    return dbp;
  }
  function asDataURL(file){return new Promise(function(resolve,reject){var r=new FileReader();r.onload=function(){resolve(r.result);};r.onerror=function(){reject(r.error||new Error('File read failed'));};r.readAsDataURL(file);});}
  async function all(){
    var db=await openDB(), key=scope();
    return new Promise(function(resolve,reject){
      var t=db.transaction(STORE,'readonly'), st=t.objectStore(STORE), idx=st.index('scopeKind'), req=idx.getAll(key);
      req.onsuccess=function(){var a=req.result||[];a.sort(function(a,b){return (b.isMain?1:0)-(a.isMain?1:0)||String(b.updated||'').localeCompare(String(a.updated||''));});resolve(a);};
      req.onerror=function(){reject(req.error);};
    });
  }
  async function clearAllAndPut(row){
    var db=await openDB(), key=scope();
    await new Promise(function(resolve,reject){
      var t=db.transaction(STORE,'readwrite'), st=t.objectStore(STORE), idx=st.index('scopeKind'), req=idx.getAll(key);
      req.onsuccess=function(){(req.result||[]).forEach(function(x){st.delete(x.id);});if(row)st.put(row);};
      t.oncomplete=resolve;t.onerror=function(){reject(t.error);};
    });
  }
  async function del(id){var db=await openDB();await new Promise(function(resolve,reject){var t=db.transaction(STORE,'readwrite');t.objectStore(STORE).delete(id);t.oncomplete=resolve;t.onerror=function(){reject(t.error);};});}
  async function main(){var a=await all();return a.find(function(x){return x.isMain;})||a[0]||null;}
  function dataURLToBlobURL(data){try{var p=String(data||'').split(','), meta=p[0]||'', bin=atob(p[1]||''), mime=(meta.match(/data:([^;]+)/)||[])[1]||'application/octet-stream', len=bin.length, u8=new Uint8Array(len);for(var i=0;i<len;i++)u8[i]=bin.charCodeAt(i);return URL.createObjectURL(new Blob([u8],{type:mime}));}catch(e){return data;}}
  function openFile(f){if(!f||!f.data){alert('CV preview is not available.');return;}var url=dataURLToBlobURL(f.data);var w=window.open(url,'_blank','noopener');if(!w){var a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();}setTimeout(function(){try{if(String(url).indexOf('blob:')===0)URL.revokeObjectURL(url);}catch(e){}},60000);}
  function downloadFile(f){if(!f||!f.data){alert('CV download is not available.');return;}var a=document.createElement('a');a.href=f.data;a.download=f.name||'ATSRS-CV';document.body.appendChild(a);a.click();a.remove();}
  function mainBox(f){
    var body=f?'<div class="atsrs-v156-main-row"><div class="atsrs-v156-main-name"><b title="'+esc(f.name)+'">📄 '+esc(f.name||'Main CV')+' <span class="atsrs-v153-main-badge">MAIN</span></b><span>'+Math.round((f.size||0)/1024)+' KB</span></div><div class="atsrs-v156-actions"><button class="secondary" onclick="previewCV()">Preview</button><button class="secondary" onclick="downloadCV()">Download</button><button class="action" onclick="deleteCV()">Delete</button></div></div>':'<div class="atsrs-v156-empty">No Main CV uploaded yet.</div>';
    return '<div class="atsrs-v156-main-box"><span class="atsrs-v156-box-title">Main CV</span>'+body+'</div>';
  }
  function slotsBox(){
    return '<div class="atsrs-v156-slots-box"><span class="atsrs-v156-box-title">Additional CV Slots</span><div class="atsrs-v156-slot-list">'+
      '<div class="atsrs-v156-slot-chip"><b>🔒 Additional CV Slot 1</b><span>PRO</span></div>'+ 
      '<div class="atsrs-v156-slot-chip"><b>🔒 Additional CV Slot 2</b><span>Premium</span></div>'+ 
      '<div class="atsrs-v156-slot-chip"><b>🔒 Additional CV Slot 3</b><span>Premium</span></div>'+ 
      '</div></div>';
  }
  async function renderCV(){
    if(rendering){pending=true;return;} rendering=true;
    try{
      setBuild();
      var arr=[];try{arr=await all();}catch(e){console.warn('V156 CV read failed',e);} 
      var m=arr.find(function(x){return x.isMain;})||arr[0]||null;
      if(m && (!m.isMain || arr.length>1)){m.isMain=true;await clearAllAndPut(m);} 
      var info=byId('cvFileInfo');
      if(info){info.className='preview-box atsrs-v156-cv-area';info.innerHTML=mainBox(m)+slotsBox();}
      var badge=byId('cvStatusBadge'); if(badge){badge.textContent=m?'Main CV':'No CV Uploaded';badge.className='badge '+(m?'badge-ready':'badge-blocked');}
      var dash=byId('cvStatusDash'); if(dash){dash.textContent=m?'Available ✓':'Missing ⚠';dash.className='stat '+(m?'good':'missing');}
      var up=byId('uploadCVBtn'); if(up)up.textContent=m?'Replace Main CV':'Upload Main CV';
      var inp=byId('cvUploadInput'); if(inp)inp.removeAttribute('multiple');
      var prev=byId('previewCVBtn'); if(prev)prev.textContent='Preview Main CV';
      var down=byId('downloadCVBtn'); if(down)down.textContent='Download Main CV';
      var delb=byId('deleteCVBtn'); if(delb)delb.textContent='Delete Main CV';
    } finally { rendering=false; if(pending){pending=false;Promise.resolve().then(renderCV);} }
  }
  function scheduleRender(){Promise.resolve().then(renderCV);}
  window.handleCVUpload=async function(event){
    try{
      var files=Array.prototype.slice.call((event&&event.target&&event.target.files)||[]);if(!files.length)return;
      var f=files[0];
      var row={id:Date.now()+'_main_'+Math.random().toString(36).slice(2),scopeKind:scope(),userId:uid(),kind:KIND,name:f.name,type:f.type||'application/octet-stream',size:f.size||0,updated:new Date().toISOString(),isMain:true,data:await asDataURL(f)};
      await clearAllAndPut(row);
      if(event&&event.target)event.target.value='';
      await renderCV();
      if(files.length>1)alert('Free plan allows only Main CV. Additional CV slots are prepared for paid plans.');
    }catch(err){console.error(err);alert('CV could not be saved. Storage is blocked/full.');}
  };
  window.previewCV=async function(){var f=await main();if(!f){alert('No Main CV uploaded yet.');return;}openFile(f);};
  window.downloadCV=async function(){var f=await main();if(!f){alert('No Main CV uploaded yet.');return;}downloadFile(f);};
  window.deleteCV=async function(){var f=await main();if(!f){alert('No Main CV uploaded yet.');return;}await del(f.id);await renderCV();};
  window.atsrsV156RenderCV=renderCV;
  ['renderAll','showPage','applyLanguage','renderCVStatus'].forEach(function(n){var old=window[n];if(typeof old==='function'&&!old.__atsrsV156){var wrap=function(){var r=old.apply(this,arguments);scheduleRender();return r;};wrap.__atsrsV156=true;window[n]=wrap;}});
  function armObserver(){var info=byId('cvFileInfo');if(!info||info.__atsrsV156Observer)return;if(!window.MutationObserver)return;var mo=new MutationObserver(function(){if(rendering)return;if(!info.classList.contains('atsrs-v156-cv-area'))scheduleRender();});mo.observe(info,{childList:true,subtree:false,attributes:true,attributeFilter:['class']});info.__atsrsV156Observer=mo;}
  function boot(){armObserver();renderCV();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  window.addEventListener('load',boot);
})();


/* ===== Original V178 inline script 44 id="atsrs-v157-login-cleanup-script" ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V179';
  var UPDATE='Last Update: 01 Jul 2026';
  var TYPE='TEST BUILD';
  function byId(id){return document.getElementById(id);}
  function lockBuild(){
    var badge=byId('buildBadge')||document.querySelector('.build-badge');
    if(!badge)return;
    var rows=badge.querySelectorAll('div');
    if(rows.length>=3){rows[0].textContent=BUILD;rows[1].textContent=UPDATE;rows[2].textContent=TYPE;}
    else{badge.innerHTML='<div>'+BUILD+'</div><div>'+UPDATE+'</div><div>'+TYPE+'</div>';}
  }
  function cleanSocial(){
    var area=byId('signupSocialArea');
    if(!area)return;
    area.innerHTML='<div class="auth-divider"><span>or</span></div><button id="continueGoogleTextBtn" type="button" class="google-text-link">continue with <span class="google-word"><span class="g-blue">G</span><span class="g-red">o</span><span class="g-yellow">o</span><span class="g-blue">g</span><span class="g-green">l</span><span class="g-red">e</span></span></button>';
    var btn=byId('continueGoogleTextBtn');
    if(btn){btn.onclick=function(e){if(e)e.preventDefault();return window.atsrsV157GoogleNotice(e);};}
  }
  window.atsrsV157GoogleNotice=function(e){
    if(e){e.preventDefault();e.stopPropagation();}
    var msg=byId('loginMsg')||byId('regMsg');
    if(msg)msg.textContent='Google sign-in will be connected after backend OAuth configuration.';
    return false;
  };
  function run(){lockBuild();cleanSocial();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',run);
  [80,250,700,1300,2400].forEach(function(ms){setTimeout(run,ms);});
  setInterval(lockBuild,500);
})();


/* ===== Original V178 inline script 45 id="atsrs-v161-single-date-badge-script" ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V179';
  var UPDATE='Last Update: 01 Jul 2026';
  var TYPE='TEST BUILD';
  var cleaning=false;
  function isBuildText(t){
    t=String(t||'').trim();
    return /^ATSRS\s+V\d+/i.test(t) || /^Last\s+Update\s*:/i.test(t) || /TEST\s+BUILD/i.test(t) || /\bUTC\b/i.test(t);
  }
  function normalizeBadge(){
    if(cleaning)return;
    cleaning=true;
    try{
      var main=document.getElementById('buildBadge');
      if(!main){cleaning=false;return;}
      document.querySelectorAll('.build-badge').forEach(function(b){
        if(b!==main) b.remove();
      });
      main.innerHTML='<div>'+BUILD+'</div><div>'+UPDATE+'</div><div>'+TYPE+'</div>';
      document.querySelectorAll('#auth *').forEach(function(el){
        if(el===main || main.contains(el)) return;
        if(el.closest && el.closest('#buildBadge')) return;
        if(el.children && el.children.length) return;
        if(isBuildText(el.textContent)) el.remove();
      });
    }catch(e){}
    cleaning=false;
  }
  function run(){normalizeBadge();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',run);
  [0,50,150,400,900,1600,2600].forEach(function(ms){setTimeout(run,ms);});
  setInterval(run,900);
  if(window.MutationObserver){
    var root=document.getElementById('auth')||document.body;
    var mo=new MutationObserver(function(){setTimeout(run,0);});
    mo.observe(root,{childList:true,subtree:true,characterData:true});
  }
})();


/* ===== Original V178 inline script 46 id="ATSRS_V166_REFS_DASH_FRAMELESS_COMPACT_JS" ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V179';
  var UPDATE='Last Update: 01 Jul 2026';
  function q(s,r){return (r||document).querySelector(s);}
  function qa(s,r){return Array.from((r||document).querySelectorAll(s));}
  function setBuild(){
    qa('.build-badge').forEach(function(b){
      var d=b.querySelectorAll('div');
      if(d[0])d[0].textContent=BUILD;
      if(d[1])d[1].textContent=UPDATE;
      if(d[2])d[2].textContent='TEST BUILD';
    });
  }
  function compactRefControls(){
    qa('#refsPage .atsrs-v134-career-card').forEach(function(card){
      var btn=q('.atsrs-v134-upload',card);
      var bar=q('.atsrs-v134-statusbar',card);
      var filter=q('.atsrs-v134-filter',card);
      var status=q('.atsrs-v134-status',card);
      if(btn&&bar&&btn.parentElement!==bar){
        if(filter)bar.insertBefore(btn,filter); else bar.appendChild(btn);
      }
      if(filter){
        filter.classList.add('active');
        filter.style.display='block';
        filter.disabled = !!(status && /No File/i.test(status.textContent||''));
      }
    });
    qa('#refsPage #cvCard [class*="slot"],#refsPage #cvCard [id*="slot"],#refsPage #cvCard [id*="Slot"],#refsPage #cvCard [class*="premium"],#refsPage #cvCard [class*="Premium"]').forEach(function(x){x.style.display='none';});
  }
  function run(){setBuild();compactRefControls();}
  ['DOMContentLoaded','load'].forEach(function(ev){window.addEventListener(ev,function(){setTimeout(run,60);setTimeout(run,350);});});
  var oldRender=window.renderAll;
  if(typeof oldRender==='function'&&!oldRender.__atsrsV166){
    window.renderAll=function(){var r=oldRender.apply(this,arguments);setTimeout(run,80);return r;};
    window.renderAll.__atsrsV166=true;
  }
  var oldShow=window.showPage;
  if(typeof oldShow==='function'&&!oldShow.__atsrsV166){
    window.showPage=function(){var r=oldShow.apply(this,arguments);setTimeout(run,80);setTimeout(run,380);return r;};
    window.showPage.__atsrsV166=true;
  }
  run(); setTimeout(run,500); setTimeout(run,1200);
})();


/* ===== Original V178 inline script 47  ===== */
(function atsrsV167TopClean(){
  function cleanTop(){
    document.querySelectorAll('#app .top-actions,#app .atsrs-global-top-actions,#app .atsrs-v56-top-actions,#app .atsrs-v64-top-actions,body > .top-actions,body > .atsrs-global-top-actions,body > .atsrs-v56-top-actions,body > .atsrs-v64-top-actions').forEach(function(el){el.remove();});
    var exit=document.getElementById('navLogout');
    if(exit){
      exit.textContent='Exit';
      exit.classList.add('exit-nav-btn');
      exit.setAttribute('onclick','confirmLogout()');
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', cleanTop); else cleanTop();
  setTimeout(cleanTop,100);
  setTimeout(cleanTop,800);
  setTimeout(cleanTop,2000);
})();


/* ===== Original V178 inline script 48 id="ATSRS_V172_DOCUMENTS_STABLE_JS" ===== */
(function atsrsV172DocumentsStable(){
  'use strict';
  var editIndex=null;
  function byId(id){return document.getElementById(id);}
  function setText(id,value){var el=byId(id); if(el) el.textContent=value;}
  function q(sel,root){return (root||document).querySelector(sel);}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

  function cleanTopAndLang(){
    ['langCircle','langMenu','appLangCircle','appLangMenu','topLogoutBtn'].forEach(function(id){var el=byId(id); if(el) el.remove();});
    document.querySelectorAll('#auth .lang-floating,#app > .top-actions,body > .top-actions,body > .atsrs-global-top-actions,body > .atsrs-v56-top-actions,body > .atsrs-v64-top-actions,.atsrs-account-badge').forEach(function(el){el.remove();});
    var exit=byId('navLogout');
    if(exit){exit.textContent='Exit';exit.classList.add('exit-nav-btn');exit.style.display='block';exit.setAttribute('onclick','confirmLogout()');}
  }

  function aiNotice(){
    alert('Scan with AI / Auto-fill with AI will be available in a future update. Use Manual Upload for now.');
  }

  function closeManual(){
    var p=byId('certManualPanel'); if(p)p.classList.remove('active');
    var b=byId('certManualModeBtn'); if(b)b.classList.remove('active');
    editIndex=null;
    setText('addCertBtn','Save Document');
    ['manualFormAlert','manualFilePreview'].forEach(function(id){var el=byId(id); if(el){el.classList&&el.classList.remove('active'); el.textContent='';}});
  }

  function openManual(){
    var scan=byId('certScanPanel'); if(scan)scan.classList.remove('active');
    var p=byId('certManualPanel'); if(p)p.classList.add('active');
    var sb=byId('certScanModeBtn'); if(sb)sb.classList.remove('active');
    var mb=byId('certManualModeBtn'); if(mb)mb.classList.add('active');
  }

  function ensureCancel(){
    var save=byId('addCertBtn'); if(!save)return;
    var parent=save.parentElement;
    if(!parent.classList.contains('atsrs-v172-form-actions')){
      var wrap=document.createElement('div');
      wrap.className='atsrs-v172-form-actions';
      parent.insertBefore(wrap,save);
      wrap.appendChild(save);
    }
    if(!byId('cancelCertBtn')){
      var c=document.createElement('button');
      c.id='cancelCertBtn';
      c.type='button';
      c.className='secondary';
      c.textContent='Cancel';
      c.onclick=function(){closeManual();};
      save.parentElement.appendChild(c);
    }
  }

  function fixLabels(){
    setText('addDocTitle','Documents');
    setText('addCertFlowNote','Choose one method: Scan with AI or Manual Upload.');
    setText('certScanModeBtn','Scan with AI');
    setText('certManualModeBtn','Manual Upload');
    setText('scanFlowText','Scan with AI / Auto-fill with AI will be available in a future update.');
    setText('manualCertTitle','Manual Upload');
    setText('manualFlowText','Upload a file and enter document details manually.');
    setText('manualUploadBtn','Upload File');
    setText('cTypeLabel','Certificate');
    setText('cDocNoLabel','Document / Certificate No (Optional)');
    setText('cCountryLabel','Country / Authority (Optional)');
    setText('cProviderLabel','Training Center / Provider');
    setText('cIssueLabel','Issue Date');
    setText('cExpiryLabel','Expiry');
    setText('addCertBtn',editIndex===null?'Save Document':'Update Document');
    setText('certRegisterTitle','Document Register');
    setText('thCertificate2','Certificate');
    setText('thProvider2','Training Center / Provider');
    setText('thExpiry2','Expiry');
    setText('thStatus2','Status');
    setText('thAction2','Action');
  }

  function wireMethods(){
    var scan=byId('certScanModeBtn');
    if(scan){scan.onclick=function(e){if(e)e.preventDefault(); aiNotice(); closeManual();};}
    var manual=byId('certManualModeBtn');
    if(manual){manual.onclick=function(e){if(e)e.preventDefault(); openManual();};}
    var scanDoc=byId('scanDocBtn');
    if(scanDoc){scanDoc.onclick=function(e){if(e)e.preventDefault(); aiNotice();};}
    var uploadDoc=byId('uploadDocBtn');
    if(uploadDoc){uploadDoc.onclick=function(e){if(e)e.preventDefault(); aiNotice();};}
    ensureCancel();
  }

  function clearForm(){
    ['cDocNo','cCountry','cProvider','cIssue','cExpiry'].forEach(function(id){var el=byId(id); if(el)el.value='';});
    var t=byId('cType'); if(t)t.value='';
    var f=byId('manualFile'); if(f)f.value='';
    var p=byId('manualFilePreview'); if(p)p.textContent='';
  }

  window.atsrsV172PreviewCert=function(i){
    var a=(typeof getData==='function'?getData('certs'):[])||[]; var x=a[i];
    if(!x){alert('Document not found.');return;}
    alert('Document: '+(x.type||'-')+'\nProvider: '+(x.provider||'-')+'\nExpiry: '+(x.expiry||'-')+'\nStatus: '+((typeof status==='function'&&x.expiry)?status(x.expiry).txt:'-'));
  };
  window.atsrsV172EditCert=function(i){
    var a=(typeof getData==='function'?getData('certs'):[])||[]; var x=a[i];
    if(!x){alert('Document not found.');return;}
    editIndex=i; openManual();
    var cp=byId('cPerson'); if(cp&&x.person)cp.value=x.person;
    var t=byId('cType'); if(t)t.value=x.type||'';
    var n=byId('cDocNo'); if(n)n.value=x.docNo||'';
    var co=byId('cCountry'); if(co)co.value=x.country||'';
    var pr=byId('cProvider'); if(pr)pr.value=x.provider||'';
    var is=byId('cIssue'); if(is)is.value=x.issue||'';
    var ex=byId('cExpiry'); if(ex)ex.value=x.expiry||'';
    setText('addCertBtn','Update Document');
    setTimeout(function(){var panel=byId('certManualPanel'); if(panel)panel.scrollIntoView({behavior:'smooth',block:'start'});},60);
  };

  var oldAdd=window.addCertificate;
  window.addCertificate=function(){
    if(editIndex!==null){
      var a=(typeof getData==='function'?getData('certs'):[])||[];
      if(!a[editIndex]){editIndex=null; return oldAdd&&oldAdd.apply(this,arguments);}
      if(typeof validateManualCertificateForm==='function' && !validateManualCertificateForm())return;
      var person=(typeof isPersonalMode==='function'&&isPersonalMode())?(typeof soloOwnerName==='function'?soloOwnerName():''):(byId('cPerson')?byId('cPerson').value:'');
      a[editIndex]={person:person,type:(byId('cType')?byId('cType').value:''),docNo:(byId('cDocNo')?byId('cDocNo').value:''),country:(byId('cCountry')?byId('cCountry').value:''),provider:(byId('cProvider')?byId('cProvider').value:''),issue:(byId('cIssue')?byId('cIssue').value:''),expiry:(byId('cExpiry')?byId('cExpiry').value:'')};
      if(typeof saveData==='function')saveData('certs',a);
      editIndex=null; clearForm(); closeManual(); if(typeof clearManualValidation==='function')clearManualValidation(); if(typeof renderAll==='function')renderAll(); return;
    }
    var r=oldAdd&&oldAdd.apply(this,arguments);
    closeManual();
    return r;
  };

  function renderCertRows(){
    if(!byId('certTable') || typeof getData!=='function' || typeof status!=='function')return;
    var c=getData('certs')||[];
    var html='';
    c.forEach(function(x,i){
      var st=status(x.expiry);
      html+='<tr><td>'+esc(x.type||'')+'</td><td>'+esc(x.provider||'')+'</td><td>'+esc(x.expiry||'')+'</td><td class="'+esc(st.cls||'')+'">'+esc(st.txt||'')+'</td><td>'+
        '<button class="secondary" onclick="atsrsV172PreviewCert('+i+')">Preview</button>'+
        '<button class="secondary" onclick="atsrsV172EditCert('+i+')">Edit</button>'+
        '<button class="secondary atsrs-v172-delete" onclick="deleteCert('+i+')">Delete</button>'+
      '</td></tr>';
    });
    byId('certTable').innerHTML=html;
  }

  function stableDocuments(){
    cleanTopAndLang(); fixLabels(); wireMethods(); renderCertRows();
    var scanPanel=byId('certScanPanel'); if(scanPanel)scanPanel.classList.remove('active');
    var scanBtn=byId('certScanModeBtn'); if(scanBtn)scanBtn.classList.remove('active');
    if(editIndex===null){var manual=byId('certManualPanel'); if(manual&&!manual.dataset.keepOpen)manual.classList.remove('active'); var mb=byId('certManualModeBtn'); if(mb)mb.classList.remove('active');}
  }

  var oldRender=window.renderAll;
  if(typeof oldRender==='function' && !oldRender.__atsrsV172){
    window.renderAll=function(){var r=oldRender.apply(this,arguments);setTimeout(function(){fixLabels();wireMethods();renderCertRows();},0);setTimeout(function(){fixLabels();renderCertRows();},120);return r;};
    window.renderAll.__atsrsV172=true;
  }
  var oldShow=window.showPage;
  if(typeof oldShow==='function' && !oldShow.__atsrsV172){
    window.showPage=function(){var r=oldShow.apply(this,arguments);setTimeout(stableDocuments,0);setTimeout(stableDocuments,160);return r;};
    window.showPage.__atsrsV172=true;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(stableDocuments,80);setTimeout(stableDocuments,500);});
  else {setTimeout(stableDocuments,80);setTimeout(stableDocuments,500);}
  window.addEventListener('load',function(){setTimeout(stableDocuments,120);setTimeout(stableDocuments,900);});
})();


/* ===== Original V178 inline script 49 id="ATSRS_V178_BUILD_LOCK_JS" ===== */
(function(){
  'use strict';
  function lockBuild(){
    document.querySelectorAll('.build-badge').forEach(function(b){
      var d=b.querySelectorAll('div');
      if(d[0])d[0].textContent='ATSRS V179';
      if(d[1])d[1].textContent='Last Update: 01 Jul 2026';
      if(d[2])d[2].textContent='TEST BUILD';
    });
  }
  lockBuild();
  window.addEventListener('load',function(){setTimeout(lockBuild,50);setTimeout(lockBuild,500);});
})();
