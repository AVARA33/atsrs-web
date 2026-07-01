/* ATSRS V178 extracted JavaScript batch: storage.js. Loaded in original V178 execution order. No placeholder code. */
/* ===== extracted from inline script ===== */
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

/* ===== extracted from inline script ===== */
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

/* ===== extracted from inline script ===== */
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

/* ===== extracted from inline script ===== */
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

/* ===== extracted from inline script id=v61-topbar-troubleshoot-script ===== */
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
