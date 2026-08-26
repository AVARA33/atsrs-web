/* ATSRS V178 extracted JavaScript batch: storage.js. Loaded in original V178 execution order. No placeholder code. */
/* ===== extracted from inline script ===== */
const SUPABASE_URL="https://hwtjuqyxzivymofamwxl.supabase.co";
const SUPABASE_KEY="sb_publishable_57xvbnJGp7pTXvfG11EdvA_Du_LvVyD";
const APP_URL="https://atsrs.com/";
/* Preserve the requested auth action across mobile Google redirects. Some
   tablet browsers restore the Supabase session before localStorage is fully
   available, so the callback URL is also an authoritative fallback. */
(function captureAtsrsOAuthCallback(){
  try{
    var params=new URLSearchParams(window.location.search||'');
    var code=params.get('code')||'';
    var callbackError=params.get('error')||'';
    var intent=params.get('atsrs_intent')||'';
    var mode=params.get('atsrs_mode')||'';
    var attemptId=params.get('atsrs_attempt')||'';
    if(!code&&!callbackError) return;
    /* A password-recovery PKCE callback also has `code`, but it does not
       carry ATSRS Google-flow markers and must remain Supabase-managed. */
    if(!intent&&!attemptId) return;
    window.__atsrsOAuthMarkedCallback=true;
    window.__atsrsOAuthInvalidCallback=true;
    if(!attemptId || (intent!=='signin'&&intent!=='signup')) return;
    function readAttempt(storage){
      if(!storage) return null;
      try{return JSON.parse(storage.getItem('atsrs_oauth_attempt')||'null');}
      catch(e){return null;}
    }
    function matchesAttempt(attempt){
      var startedAt=Number(attempt&&attempt.startedAt)||0;
      var age=Date.now()-startedAt;
      if(!attempt || attempt.id!==attemptId || attempt.intent!==intent || age<0 || age>1200000) return false;
      if(intent==='signup' && ((mode!=='personal'&&mode!=='company') || attempt.mode!==mode)) return false;
      return true;
    }
    var localAttempt=readAttempt(typeof localStorage!=='undefined'?localStorage:null);
    var sessionAttempt=readAttempt(typeof sessionStorage!=='undefined'?sessionStorage:null);
    var attemptVerified=matchesAttempt(localAttempt)||matchesAttempt(sessionAttempt);
    var attemptWasStored=!!(localAttempt||sessionAttempt);
    /* Switching a mobile browser between normal, installed-app and
       "Desktop site" contexts can hide one storage area. A missing ATSRS
       marker is therefore recoverable: Supabase still validates the
       single-use authorization code against the browser's PKCE verifier.
       A present-but-mismatched marker remains invalid. */
    if(attemptWasStored && !attemptVerified) return;
    if(intent==='signup' && !attemptVerified){
      window.__atsrsOAuthSignupNeedsMode=true;
    }
    window.__atsrsOAuthInvalidCallback=false;
    window.__atsrsOAuthCallback=true;
    window.__atsrsOAuthAttemptVerified=attemptVerified;
    window.__atsrsOAuthCode=code;
    window.__atsrsOAuthSessionReceived=false;
    if(callbackError) window.__atsrsOAuthError=callbackError;
    localStorage.setItem('atsrs_google_intent',intent);
    if(intent==='signup'&&attemptVerified&&(mode==='personal'||mode==='company')){
      localStorage.setItem('atsrs_pending_account_type',mode);
    }
  }catch(e){}
})();

/* ATSRS V242: exclusive expiry bands, read-only dashboard, and file discovery. */
window.addEventListener('load',function(){
  T.en.exp90='Expiring in 90 Days';
  T.en.exp60='Expiring in 60 Days';
  T.en.exp30='Expiring in 30 Days';
  T.en.exp7='Expiring in 1 Week';
  SOLO_TX.en.soloBadge='DOCUMENT OVERVIEW';
  SOLO_TX.en.soloHeroTitle='Your compliance dashboard';
  SOLO_TX.en.soloHeroText='Review document totals, expiry risk and profile readiness from one clear view.';
  INTRO_TX.en.introNav='ATSRS Updates';

  function escapeV242(value){
    return String(value||'').replace(/[&<>"']/g,function(character){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character];
    });
  }

  var statusBaseV242=status;
  status=function(expiry){
    if(!expiry||String(expiry).toUpperCase()==='N/A')return statusBaseV242(expiry);
    var today=atsrsBakuCalendarDate();
    var expiryDate=new Date(expiry+'T00:00:00Z');
    var days=Math.round((expiryDate-today)/86400000);
    if(days===0)return{txt:'Expires today',cls:'danger',expired:false,risk:true,today:true,days:0};
    return statusBaseV242(expiry);
  };

  window.atsrsV242ViewCertificate=function(index){
    if(typeof showPage==='function'&&typeof navCertificates!=='undefined')showPage('certificates',navCertificates);
    setTimeout(function(){
      var row=document.getElementById('atsrs-cert-row-'+index);
      if(!row)return;
      row.scrollIntoView({behavior:'smooth',block:'center'});
      row.classList.remove('cert-row-focus');
      void row.offsetWidth;
      row.classList.add('cert-row-focus');
    },80);
  };

  renderRiskList=function(certs){
    if(typeof riskList==='undefined'||!riskList)return;
    var items=certs.map(function(item,index){return{x:item,s:status(item.expiry),index:index};})
      .filter(function(entry){return entry.s.expired||entry.s.days<=90;})
      .sort(function(a,b){return a.s.days-b.s.days;})
      .slice(0,5);
    if(!items.length){
      riskList.innerHTML='<div class="risk-item"><b>'+escapeV242(sx('noRisk'))+'</b><span>OK</span></div>';
      return;
    }
    riskList.innerHTML=items.map(function(entry){
      return '<div class="risk-item"><div><b>'+escapeV242(entry.x.type||'Document')+'</b><br><span>'+
        escapeV242(entry.x.expiry||'No expiry date')+' · '+escapeV242(entry.s.txt)+'</span></div>'+
        '<button type="button" class="dashboard-view-button" onclick="atsrsV242ViewCertificate('+entry.index+')">View document</button></div>';
    }).join('');
  };

  var renderAllBaseV242=renderAll;
  renderAll=function(){
    renderAllBaseV242();
    var certificates=getData('certs');
    var companyMode=false;
    try{companyMode=(localStorage.getItem('atsrs_use_mode')||window.useMode)==='company'}catch(ignore){}
    // Corporate Dashboard is owned by corporate-reporting.js and its single
    // authorized server snapshot. Never let Personal/local certificate data
    // temporarily overwrite those metrics during render or hydration.
    if(!companyMode){
      var in90=0,in60=0,in30=0,in7=0,expiredCount=0;
      certificates.forEach(function(item){
        var value=status(item.expiry);
        if(value.noExpiry)return;
        if(value.days<0)expiredCount++;
        else if(value.days<=7)in7++;
        else if(value.days<=30)in30++;
        else if(value.days<=60)in60++;
        else if(value.days<=90)in90++;
      });
      if(typeof exp90!=='undefined')exp90.innerText=in90;
      var exp60Element=document.getElementById('exp60');if(exp60Element)exp60Element.innerText=in60;
      if(typeof exp30!=='undefined')exp30.innerText=in30;
      var exp7Element=document.getElementById('exp7');if(exp7Element)exp7Element.innerText=in7;
      if(typeof expired!=='undefined')expired.innerText=expiredCount;
      renderRiskList(certificates);
    }

    if(typeof certTable!=='undefined'&&certTable){
      Array.prototype.forEach.call(certTable.querySelectorAll('tr'),function(row,index){
        row.id='atsrs-cert-row-'+index;
        var item=certificates[index]||{};
        var actionCell=row.lastElementChild;
        if(!actionCell||!item.cloudFileId)return;
        var preview=document.createElement('button');
        preview.type='button';
        preview.className='secondary';
        preview.textContent='Preview';
        preview.addEventListener('click',function(){
          if(typeof window.atsrsCloudPreview==='function')window.atsrsCloudPreview(item.cloudFileId);
        });
        actionCell.insertBefore(preview,actionCell.firstChild);
      });
    }
  };

  var applyLanguageBaseV242=applyLanguage;
  applyLanguage=function(){
    applyLanguageBaseV242();
    var set=function(id,value){var element=document.getElementById(id);if(element)element.textContent=value;};
    set('navIntro','ATSRS Updates');
    set('exp90Text',T.en.exp90);
    set('exp60Text',T.en.exp60);
    set('exp30Text',T.en.exp30);
    set('exp7Text',T.en.exp7);
    set('soloBadge',SOLO_TX.en.soloBadge);
    set('soloHeroTitle',SOLO_TX.en.soloHeroTitle);
    set('soloHeroText',SOLO_TX.en.soloHeroText);
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){applyLanguage();});
  }else{
    applyLanguage();
  }
  if(typeof currentUser!=='undefined'&&currentUser)renderAll();
});
let supabaseClient=null;try{if(window.supabase){var atsrsClientBuild=String(window.ATSRS_CLIENT_BUILD||document.documentElement.dataset.atsrsBuild||'V407');supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{flowType:'pkce',detectSessionInUrl:!window.__atsrsOAuthMarkedCallback,persistSession:true,autoRefreshToken:true},global:{headers:{'x-atsrs-client-build':atsrsClientBuild}}});}window.supabaseClient=supabaseClient}catch(e){console.error(e)}
let currentUser=null,timer=null,countdown=0;let lang="en";try{localStorage.setItem("atsrs_lang","en")}catch(e){}

const T={
  en:{sub:"Applicant Tracking System & Recruitment Solutions",login:"Login",email:"Email",password:"Password",create:"Create account",forgot:"Forgot password?",registerTitle:"Create Account",confirm:"Confirm password",register:"Register",back:"Back to Login",resetTitle:"Reset Password",resetInfo:"Enter your email. A reset link will be sent to your inbox.",sendReset:"Send reset email",newPass:"Set New Password",newPassword:"New password",confirmNew:"Confirm new password",saveNew:"Save new password",cabinet:"Compliance Cabinet",dashboard:"Dashboard",personnel:"Personnel",certificates:"Certificates",logout:"Exit",totalPersonnel:"Total Personnel",totalCerts:"Total Certificates",exp90:"Expiring in 90 Days",exp30:"Expiring in 30 Days",expired:"Expired",fill:"Fill all fields.",addPersonnel:"Add Personnel",personnelList:"Personnel List",name:"Name",surname:"Surname",position:"Position",company:"Company",phone:"Phone",action:"Action",addCert:"Add Certificate",provider:"Training Center / Provider",certRegister:"Certificate Register",certificate:"Certificate",expiry:"Expiry",status:"Status",saveProfile:"Save",fill:"Fill all fields.",fix:"Please fix highlighted fields.",enterLogin:"Enter email and password.",passRule:"Password must be at least 6 characters.",matchRule:"Passwords do not match.",sending:"Sending reset email...",sent:"Reset email sent. Check inbox/spam.",connection:"Connection failed. Check network or Supabase access.",selectCrew:"Select Crew Member",delete:"Delete",valid:"Valid",personalUse:"Personal",companyUse:"Corporate",myDocuments:"My Documents",personalDashboardNote:"Personal mode keeps focus on your own documents only.",scanUpload:"Scan / Upload Document",ocrManual:"OCR could not confidently read all fields. Please fill missing fields and confirm.",nationality:"Nationality",employeeId:"Employee ID",project:"Project",vessel:"Vessel",crewRegister:"Crew Register",crewList:"Crew List",addCrew:"Add Crew",importExcel:"Import Excel",groupsProjects:"Groups / Projects",complianceStatus:"Compliance Status",searchCrew:"Search crew...",allCompanies:"All companies",allPositions:"All positions",allStatuses:"All statuses",ready:"Ready",review:"Review",importInfo:"Upload Excel/CSV. Full auto-mapping will be connected in the next data phase.",fileSelected:"File selected",projects:"Projects",client:"Client",team:"Team",addProject:"Add Project",readyCrew:"Ready crew",reviewCrew:"Needs review",complianceNote:"Document status is based only on dates supplied for each uploaded file. ATSRS does not impose profession-specific document requirements.",crewStatus:"Crew Status",exp30s:"Expires within 30 days",exp90s:"Expires within 90 days"}
};
T.en.sub="Applicant Tracking System & Recruitment Solutions";
const UI={
  en:{account:"Account",general:"General",security:"Security",preferences:"Preferences",country:"Country",twofa:"Two-Factor Authentication",twofaNote:"Add an extra layer of security to your account.",setup:"Manage",sessions:"Active Sessions",sessionsNote:"Manage your active ATSRS sessions across devices.",view:"Manage",notifications:"Notifications",notificationsNote:"Server-side certificate expiry alerts by email.",manage:"Manage",exportData:"Export My Data",exportDataNote:"Download your ATSRS account data.",export:"Export",deleteAccount:"Delete Account",deleteAccountNote:"Permanently delete your account and all data.",timezone:"Time Zone",addDoc:"Upload Document",scanDoc:"Scan with Camera",uploadDoc:"Upload File",scanInfo:"Use your camera or upload PDF/JPG/PNG. Auto extraction will be connected in the OCR phase.",confirmInfo:"Confirm Information",docNo:"Document / Certificate No",issueDate:"Issue Date",manualCert:"Manual Certificate Entry",confirm:"Confirm Info",extractNote:"Auto extraction is in test mode. Review and confirm before saving.",fileSelected:"File selected",ocrStarting:"OCR started. Reading document...",ocrProgress:"OCR progress",ocrDone:"OCR completed. Please review detected information.",ocrNotAvailable:"OCR library is not loaded. Check internet connection.",noTextDetected:"No clear text detected. Please fill manually.",authLiveNotice:"This will be connected after Supabase Auth is live.",twofaNotice:"2FA will be added in the next security phase.",sessionsNotice:"Session controls could not be opened.",notifyNotice:"Email expiry notification preferences are available below.",deleteNotice:"Account deletion is available from the Security tab."}
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
  en:{introNav:"ATSRS Platform",introMainTitle:"Document, expiry and profile sharing platform",introMainText:"ATSRS helps people and organisations manage important documents, track expiry dates, share controlled profile links and support compliance workflows.",svc1Title:"Document Vault",svc1Text:"Store licences, certificates, permits, medical records, training proof, references and appraisals in one place.",svc2Title:"Easy Upload",svc2Text:"Upload PDF, JPG or PNG files and keep them linked to expiry dates and document status.",svc3Title:"Scan & Auto-fill",svc3Text:"Scan documents and let ATSRS prepare fields for manual confirmation when OCR is connected.",svc4Title:"Expiry Tracking",svc4Text:"See document totals and expiry alerts from a clear dashboard.",svc5Title:"Share Profile",svc5Text:"Share one controlled ATSRS profile link with employers, agencies and clients instead of many attachments.",svc6Title:"Company Compliance",svc6Text:"Companies can request access, review approved documents and import candidate records into their compliance profile.",compliance:"Compliance"}
};

const INTRO_DETAIL={
  en:{
  svc1:{title:"Document Vault",text:"Keep the identity, licence, certification, training, reference and career files relevant to your profession in one secure workspace. Documents remain private until you decide to share them."},
  svc2:{title:"Easy Upload",text:"Upload PDF, JPG or PNG documents directly into ATSRS. Each file can be linked to document type, expiry date, status and future employer access rules."},
  svc3:{title:"Scan & Auto-fill",text:"Use camera scan to capture documents. When OCR is connected, ATSRS will prepare fields automatically, while the user still confirms details before saving."},
  svc4:{title:"Expiry Tracking",text:"Track current, expiring and expired documents from a clear dashboard. ATSRS highlights date-based risks without imposing profession-specific requirements."},
  svc5:{title:"Share Profile",text:"Create one controlled ATSRS profile link for employers, agencies and clients. Instead of sending many email attachments, you can share a profile and approve access when needed."},
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
  lang="en";
  try{localStorage.setItem("atsrs_lang","en")}catch(e){}
  document.documentElement.lang="en";
  document.documentElement.dir="ltr";

  const el=(id)=>document.getElementById(id);
  const txt=(id,value)=>{const node=el(id); if(node) node.innerText=value;};
  const ph=(id,value)=>{const node=el(id); if(node) node.placeholder=value;};
  const opt0=(id,value)=>{const node=el(id); if(node && node.options && node.options[0]) node.options[0].text=value;};

  const lc=el("langCircle"); if(lc)lc.innerText=LANG_FLAGS[lang]||"🌐";
  const alc=el("appLangCircle"); if(alc)alc.innerText=LANG_FLAGS[lang]||"🌐";

  txt("authSubtitle",tr("sub"));txt("loginTitle",tr("login"));ph("loginEmail",tr("email"));ph("loginPassword",tr("password"));txt("loginEmailRule",emailMsg());txt("loginBtn",tr("login"));txt("createBtn",tr("create"));txt("forgotBtn",tr("forgot"));txt("modeRule",modeMsg());
  txt("registerTitle",tr("registerTitle"));ph("regEmail",tr("email"));txt("regEmailRule",emailMsg());ph("regPassword",tr("password"));ph("regPassword2",tr("confirm"));txt("registerBtn",tr("register"));txt("backLoginBtn1",tr("back"));txt("passRule",tr("passRule"));txt("matchRule",tr("matchRule"));
  txt("resetTitle",tr("resetTitle"));txt("resetInfo",tr("resetInfo"));ph("resetEmail",tr("email"));txt("resetEmailRule",emailMsg());txt("resetBtn",tr("sendReset"));txt("backLoginBtn2",tr("back"));
  txt("newPassTitle",tr("newPass"));ph("newPassword",tr("newPassword"));ph("newPassword2",tr("confirmNew"));txt("saveNewPassBtn",tr("saveNew"));

  txt("cabinetText",tr("cabinet"));txt("navDashboard",tr("dashboard"));txt("navCandidates","Candidates");txt("navPersonnel",tr("personnel"));txt("navCertificates",tr("certificates"));txt("navProfile",ptr("account"));txt("navLogout",tr("logout"));txt("topLogoutBtn",tr("logout"));
  txt("totalPersonnelText",tr("totalPersonnel"));txt("totalCertsText",tr("totalCerts"));txt("exp90Text",tr("exp90"));txt("exp30Text",tr("exp30"));txt("expiredText",tr("expired"));
  txt("myDocumentsTitle",tr("myDocuments"));txt("personalDashboardNote",tr("personalDashboardNote"));txt("personalScanBtn",tr("scanUpload"));

  txt("crewRegisterTitle",tr("crewRegister"));txt("crewTabListBtn",tr("crewList"));txt("crewTabAddBtn",tr("addCrew"));txt("crewTabImportBtn",tr("importExcel"));txt("crewTabProjectsBtn",tr("groupsProjects"));txt("crewTabComplianceBtn",tr("complianceStatus"));ph("crewSearch",tr("searchCrew"));
  txt("addPersonnelTitle",tr("addPersonnel"));
  ["pName:name","pSurname:surname","pPosition:position","pCompany:company","pEmail:email","pPhone:phone","pNationality:nationality","pEmployeeId:employeeId","pProject:project","pVessel:vessel"].forEach(x=>{let [id,key]=x.split(':');ph(id,tr(key));});
  txt("addPersonnelBtn",tr("addPersonnel"));
  ["thName1:name","thSurname1:surname","thPosition1:position","thCompany1:company","thPhone1:phone","thCrewStatus:crewStatus","thAction1:action"].forEach(x=>{let [id,key]=x.split(':');txt(id,tr(key));});

  txt("importExcelTitle",tr("importExcel"));txt("importExcelInfo",tr("importInfo"));
  txt("projectsTitle",tr("projects"));ph("projectNameInput",tr("project"));ph("vesselNameInput",tr("vessel"));ph("clientNameInput",tr("client"));ph("teamNameInput",tr("team"));txt("addProjectBtn",tr("addProject"));
  ["thProject:project","thVessel:vessel","thClient:client","thTeam:team","thActionProject:action"].forEach(x=>{let [id,key]=x.split(':');txt(id,tr(key));});
  txt("complianceOverviewTitle",tr("complianceStatus"));txt("readyCrewText",tr("readyCrew"));txt("reviewCrewText",tr("reviewCrew"));txt("complianceNote",tr("complianceNote"));

  txt("addDocTitle",isPersonalMode()?"Add document":ptr("addDoc"));txt("scanDocBtn",ptr("scanDoc"));txt("uploadDocBtn",ptr("uploadDoc"));txt("scanInfo",ptr("scanInfo"));txt("confirmInfoTitle",ptr("confirmInfo"));ph("autoDocNo",ptr("docNo"));ph("autoProvider",tr("provider"));txt("confirmInfoBtn",ptr("confirm"));txt("extractNote",ptr("extractNote"));
  txt("manualCertTitle",ptr("manualCert"));ph("cProvider",tr("provider"));txt("addCertBtn",tr("addCert"));txt("certRegisterTitle",tr("certRegister"));
  ["certSortTypeLabel:certificate","thProvider2:provider","certSortExpiryLabel:expiry","certSortStatusLabel:status","thAction2:action"].forEach(x=>{let [id,key]=x.split(':');txt(id,tr(key));});

  txt("accountTitle",isPersonalMode()?"Profile":ptr("account"));txt("accountTabGeneralBtn",ptr("general"));txt("accountTabSecurityBtn",ptr("security"));txt("accountTabPreferencesBtn",ptr("preferences"));txt("accountTabSharingBtn","Privacy & Sharing");
  ph("profileName",tr("name"));ph("profileSurname",tr("surname"));ph("profilePhoneLocal",tr("phone"));ph("profileZipCode","ZIP / postal code");ph("profileStcwNumber","STCW / seafarer ID");ph("profileCompany",tr("company"));ph("profilePosition",tr("position"));opt0("profileCountry",ptr("country"));txt("saveProfileBtn",tr("saveProfile"));
  txt("twofaTitle",ptr("twofa"));txt("twofaNote",ptr("twofaNote"));txt("setup2faBtn",ptr("setup"));txt("sessionsTitle",ptr("sessions"));txt("sessionsNote",ptr("sessionsNote"));txt("viewSessionsBtn",ptr("view"));
  txt("notifyTitle",ptr("notifications"));txt("notifyNote",ptr("notificationsNote"));txt("manageNotifyBtn",ptr("manage"));txt("exportDataTitle",ptr("exportData"));txt("exportDataNote",ptr("exportDataNote"));txt("exportDataBtn",ptr("export"));txt("deleteAccountTitle",ptr("deleteAccount"));txt("deleteAccountNote",ptr("deleteAccountNote"));txt("deleteAccountBtn",tr("delete"));

  if(currentUser){let active=document.querySelector(".nav button.active"),page=localStorage.getItem("atsrs_current_page")||"";txt("pageTitle",page==="privacy"?"Privacy Notice":page==="dataRights"?"Data Rights":active?active.innerText:tr("dashboard"));}
  try{applySoloLanguage();}catch(e){console.warn("ATSRS solo language skipped",e)}
  try{applyIntroLanguage();}catch(e){console.warn("ATSRS intro language skipped",e)}
}
function hideAuthBoxes(){loginBox.classList.add("hidden");registerBox.classList.add("hidden");forgotBox.classList.add("hidden");newPasswordBox.classList.add("hidden")}
function showLogin(){hideAuthBoxes();loginBox.classList.remove("hidden")}
function showRegister(){hideAuthBoxes();registerBox.classList.remove("hidden")}
function showForgot(){hideAuthBoxes();forgotBox.classList.remove("hidden")}
if(typeof loginEmail!=="undefined"&&loginEmail)loginEmail.addEventListener("input",()=>clearEmailMark(loginEmail,loginEmailRule));regEmail.addEventListener("input",()=>clearEmailMark(regEmail,regEmailRule));resetEmail.addEventListener("input",()=>clearEmailMark(resetEmail,resetEmailRule));
if(typeof loginEmail!=="undefined"&&loginEmail)loginEmail.addEventListener("blur",()=>{if(loginEmail.value)markEmail(loginEmail,loginEmailRule)});regEmail.addEventListener("blur",()=>{if(regEmail.value)markEmail(regEmail,regEmailRule)});resetEmail.addEventListener("blur",()=>{if(resetEmail.value)markEmail(resetEmail,resetEmailRule)});
function validateRegisterFields(){let p1=regPassword.value.trim(),p2=regPassword2.value.trim(),ok=true;if(p1.length>0&&p1.length<6){regPassword.classList.add("input-error");passRule.classList.remove("hidden");ok=false}else{regPassword.classList.remove("input-error");passRule.classList.add("hidden")}if(p2.length>0&&p1!==p2){regPassword2.classList.add("input-error");matchRule.classList.remove("hidden");ok=false}else{regPassword2.classList.remove("input-error");matchRule.classList.add("hidden")}return ok}
regPassword.addEventListener("input",validateRegisterFields);regPassword2.addEventListener("input",validateRegisterFields);

function atsrsFriendlyAuthError(error,fallback){
  var text=String(error&&error.message||error||'').toLowerCase();
  if(/invalid login|invalid credentials|email or password/.test(text))return 'Email or password is incorrect.';
  if(/email.*not.*confirm/.test(text))return 'Please confirm your email before signing in.';
  if(/rate limit|too many|over_email_send_rate_limit/.test(text))return 'Too many attempts. Please wait a moment and try again.';
  if(/network|fetch|connection|timeout|offline/.test(text))return 'Connection problem. Check your internet and try again.';
  if(/session|jwt|not authenticated|unauthorized/.test(text))return 'Your session has expired. Please sign in again.';
  return fallback||'The request could not be completed. Please try again.';
}
window.atsrsFriendlyAuthError=atsrsFriendlyAuthError;

async function register(){let email=regEmail.value.trim(),password=regPassword.value.trim(),password2=regPassword2.value.trim();regMsg.innerText="";if(!email||!password||!password2){regMsg.innerText=tr("fill");return}if(!markEmail(regEmail,regEmailRule)||!validateRegisterFields())return;if(!supabaseClient){regMsg.innerText="The sign-in service is temporarily unavailable.";return}try{const {error}=await supabaseClient.auth.signUp({email,password,options:{emailRedirectTo:APP_URL}});regMsg.innerText=error?atsrsFriendlyAuthError(error,'Account could not be created. Please try again.'):"Confirmation email sent. Check inbox/spam."}catch(e){regMsg.innerText=tr("connection")}}
async function login(){let email=loginEmail.value.trim(),password=loginPassword.value.trim();loginMsg.innerText="";if(!validateUseMode())return;if(!email||!password){loginMsg.innerText=tr("enterLogin");return}if(!markEmail(loginEmail,loginEmailRule))return;if(!supabaseClient){loginMsg.innerText="The sign-in service is temporarily unavailable.";return}try{const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});if(error){loginMsg.innerText=atsrsFriendlyAuthError(error,'Sign in failed. Please try again.');return}localStorage.setItem("atsrs_use_mode",useMode);currentUser=data.user;window.currentUser=data.user;openApp()}catch(e){loginMsg.innerText=tr("connection")}}
async function forgotPassword(){let email=resetEmail.value.trim();resetMsg.innerText="";if(!email){resetMsg.innerText=tr("enterLogin");return}if(!markEmail(resetEmail,resetEmailRule))return;if(!supabaseClient){resetMsg.innerText="The sign-in service is temporarily unavailable.";return}try{const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:APP_URL});resetMsg.innerText=error?atsrsFriendlyAuthError(error,'Reset link could not be sent. Please try again.'):tr("sent")}catch(e){resetMsg.innerText=tr("connection")}}
async function updatePassword(){let p1=newPassword.value.trim(),p2=newPassword2.value.trim();if(!p1||!p2){newPassMsg.innerText=tr("fill");return}if(p1!==p2){newPassMsg.innerText=tr("matchRule");return}try{const {error}=await supabaseClient.auth.updateUser({password:p1});newPassMsg.innerText=error?atsrsFriendlyAuthError(error,'Password could not be updated. Please try again.'):"Password updated."}catch(e){newPassMsg.innerText=tr("connection")}}

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
if(typeof navCandidates!=="undefined")navCandidates.classList.toggle("hidden",personal);
if(typeof navProjects!=="undefined")navProjects.classList.toggle("hidden",personal);
document.querySelectorAll(".solo-personnel-card").forEach(el=>el.classList.toggle("hidden",personal));
if(typeof personalDashboardPanel!=="undefined")personalDashboardPanel.classList.toggle("hidden",!personal);
}

function localTestLogin(){loginMsg.innerText="Local test accounts are disabled. Please sign in with your ATSRS account."}

function confirmLogout(){
  if(confirm("Are you sure you want to logout?")){
    if(typeof window.atsrsLogout==="function") window.atsrsLogout();
    else logout();
  }
}

async function logout(){
  if(typeof window.atsrsLogout==="function") return window.atsrsLogout();
  try{
    localStorage.removeItem("atsrs_auth_mode");
    localStorage.removeItem("atsrs_current_page");
    localStorage.removeItem("atsrs_use_mode");
    localStorage.setItem("atsrs_google_intent","");
    localStorage.removeItem("atsrs_pending_account_type");
    localStorage.setItem("atsrs_workspace_pick_required","1");
  }catch(e){console.warn("ATSRS logout storage clear failed",e);}
  try{window.__atsrsSessionOpened=false;currentUser=null;window.currentUser=null;}catch(e){}
  window.location.replace(window.location.pathname);
}
function localKey(n){
  if(!currentUser || !currentUser.id) return null;
  let mode="personal";
  try{
    mode=localStorage.getItem("atsrs_use_mode") || useMode || "personal";
  }catch(e){mode=useMode||"personal";}
  if(mode!=="personal" && mode!=="company") mode="personal";
  return "atsrs_"+currentUser.id+"_"+mode+"_"+n;
}
function readAppDataKey(key){
  if(window.atsrsCloudData&&typeof window.atsrsCloudData.read==="function"&&window.atsrsCloudData.isManagedKey(key)){
    return window.atsrsCloudData.read(key);
  }
  return localStorage.getItem(key);
}
function writeAppDataKey(key,value){
  if(window.atsrsCloudData&&typeof window.atsrsCloudData.write==="function"&&window.atsrsCloudData.isManagedKey(key)){
    return window.atsrsCloudData.write(key,value);
  }
  localStorage.setItem(key,value);
  return true;
}
function getData(n){
  const key=localKey(n);
  if(!key) return [];
  try{return JSON.parse(readAppDataKey(key))||[]}catch(e){console.warn("ATSRS storage read failed",n,e);return []}
}
function saveData(n,d){
  const key=localKey(n);
  if(!key) return;
  try{writeAppDataKey(key,JSON.stringify(d))}catch(e){console.warn("ATSRS storage save failed",n,e)}
}
var openedAppScope="";
function currentAppScope(){
  var user=window.currentUser||currentUser;
  var mode=localStorage.getItem("atsrs_use_mode")||useMode||"personal";
  return user&&user.id?user.id+"::"+mode:"";
}
function openAppLocal(){
  auth.classList.add("hidden");
  app.classList.remove("hidden");
  userEmail.innerText=currentUser.email;
  loadProfile();
  applyModeUI();
  window.__atsrsOpeningApp=true;
  try{
    applyLanguage();
    restoreCurrentPage();
  }finally{
    window.__atsrsOpeningApp=false;
  }
  setIntroDetail(currentIntroKey||'svc1');
  openedAppScope=currentAppScope();
  if(typeof window.atsrsFinishBoot==="function")window.atsrsFinishBoot();
  else{
    document.body.classList.remove("atsrs-session-pending");
    document.body.classList.remove("atsrs-booting");
  }
  return true;
}
function openApp(){
  var wantedScope=currentAppScope();
  if(wantedScope&&openedAppScope===wantedScope&&!app.classList.contains("hidden")){
    return Promise.resolve(true);
  }
  var operation=function(){
    if(window.atsrsCloudData&&typeof window.atsrsCloudData.openApp==="function"){
      return window.atsrsCloudData.openApp(openAppLocal);
    }
    return openAppLocal();
  };
  if(typeof window.atsrsSingleFlight==="function"&&wantedScope){
    return window.atsrsSingleFlight("app:open:"+wantedScope,operation);
  }
  return Promise.resolve(operation());
}
function syncPersonalHeadingHierarchy(page){
  const personal=isPersonalMode(),legal=personal&&(page==="privacy"||page==="dataRights");
  document.body.classList.toggle("atsrs-personal-legal-route",legal);
  pageTitle.removeAttribute("role");pageTitle.removeAttribute("aria-level");
  document.querySelectorAll("#dashboardPage h3,#dashboardPage h4,#certificatesPage h3,#certificatesPage h4,#refsPage h3,#refsPage h4,#profilePage h3,#profilePage h4,#introPage h3,#introPage h4").forEach(h=>{h.removeAttribute("role");h.removeAttribute("aria-level")});
  if(!personal||legal)return;
  pageTitle.setAttribute("role","heading");pageTitle.setAttribute("aria-level","1");
  const section=document.getElementById(page+"Page");
  if(!section)return;
  section.querySelectorAll("h3,h4").forEach(h=>{
    const nestedReferenceHeading=page==="refs"&&h.tagName==="H4";
    h.setAttribute("role","heading");h.setAttribute("aria-level",nestedReferenceHeading?"3":"2");
  });
}
function hydrateLegalFrame(page){
  if(page!=="privacy"&&page!=="dataRights")return;
  var frame=document.querySelector("#"+page+"Page .legal-app-frame");
  if(!frame||frame.dataset.legalState==="loading"||frame.dataset.legalState==="ready")return;
  var source=frame.getAttribute("data-legal-source");
  if(!source)return;
  frame.dataset.legalState="loading";
  window.fetch(source,{credentials:"same-origin",cache:"no-store"}).then(function(response){
    if(!response.ok)throw new Error("Legal page request failed");
    return response.text();
  }).then(function(html){
    html=html.replace(/<html\b([^>]*)>/i,'<html$1 data-embedded="true">');
    html=html.replace(/var embedded=new URLSearchParams\(window\.location\.search\)\.get\('embedded'\)==='1';/,'var embedded=true;');
    frame.srcdoc=html;
    frame.dataset.legalState="ready";
  }).catch(function(){
    var title=page==="privacy"?"Privacy Notice":"Data Rights";
    frame.srcdoc='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:24px;background:#07111d;color:#eef4fa;font:16px/1.5 Arial,sans-serif}a{color:#7bc3ff}</style></head><body><p>'+title+' could not be loaded.</p><p><a href="'+source+'" target="_top">Open '+title+'</a></p></body></html>';
    frame.dataset.legalState="error";
  });
}
function showPage(page,btn){let personal=(localStorage.getItem("atsrs_use_mode")||useMode)==="personal";if(personal&&(page==="personnel"||page==="candidates"||page==="projects")){page="dashboard";btn=navDashboard;}if(personal&&(page==="compliance"||page==="security")){page="profile";btn=navProfile;}let requestedPage=page,renderedPage=page;localStorage.setItem("atsrs_current_page",requestedPage);document.body.dataset.atsrsAccountRoute=personal&&requestedPage==="profile"?requestedPage:"";document.querySelectorAll("main > section").forEach(s=>s.classList.add("hidden"));document.getElementById(renderedPage+"Page").classList.remove("hidden");document.querySelectorAll(".nav button").forEach(b=>b.classList.remove("active"));btn.classList.add("active");if(personal&&requestedPage==="profile")showAccountTab("general");pageTitle.innerText=requestedPage==="privacy"?"Privacy Notice":requestedPage==="dataRights"?"Data Rights":btn.innerText;hydrateLegalFrame(renderedPage);renderAll();syncPersonalHeadingHierarchy(renderedPage)}
function restoreCurrentPage(){let page=localStorage.getItem("atsrs_current_page")||"intro";let map={intro:navIntro,privacy:navPrivacy,dataRights:navPrivacy,dashboard:navDashboard,candidates:navCandidates,personnel:navPersonnel,projects:navProjects,certificates:navCertificates,refs:navRefs,compliance:navCompliance,security:navCompliance,reports:navReports,profile:navProfile,jobs:navJobs,employers:navEmployers};showPage(map[page]?page:"intro",map[page]||navIntro)}
if(!window.__atsrsLegalNavigationBound){
  window.__atsrsLegalNavigationBound=true;
  window.addEventListener("message",function(event){
    if(event.origin!==window.location.origin&&event.origin!=="null")return;
    var privacyFrame=document.querySelector("#privacyPage .legal-app-frame");
    var dataRightsFrame=document.querySelector("#dataRightsPage .legal-app-frame");
    if(event.source!==(privacyFrame&&privacyFrame.contentWindow)&&event.source!==(dataRightsFrame&&dataRightsFrame.contentWindow))return;
    var page=event.data&&event.data.type==="atsrs:legal:navigate"?event.data.page:"";
    if(page!=="privacy"&&page!=="dataRights")return;
    showPage(page,navPrivacy);
  });
}
function showAccountTab(tab){["general","security","sharing"].forEach(x=>{let panel=document.getElementById("account"+cap(x)+"Tab"),button=document.getElementById("accountTab"+cap(x)+"Btn");if(panel)panel.classList.remove("active");if(button){button.classList.remove("active");button.setAttribute("aria-selected","false")}});let panel=document.getElementById("account"+cap(tab)+"Tab"),button=document.getElementById("accountTab"+cap(tab)+"Btn");if(panel)panel.classList.add("active");if(button){button.classList.add("active");button.setAttribute("aria-selected","true")}}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}

function showPersonnelTab(tab){
["list","add","import","projects","compliance"].forEach(x=>{
document.getElementById("crew"+cap(x)+"Tab").classList.remove("active");
document.getElementById("crewTab"+cap(x)+"Btn").classList.remove("active");
});
document.getElementById("crew"+cap(tab)+"Tab").classList.add("active");
document.getElementById("crewTab"+cap(tab)+"Btn").classList.add("active");
}
function validAtsrsId(value){return !!(window.atsrsStableIds&&window.atsrsStableIds.isValid(value))}
function ensureAtsrsId(item){
  if(item&&validAtsrsId(item.atsrsId))return item.atsrsId;
  if(item&&window.atsrsStableIds){item.atsrsId=window.atsrsStableIds.create();return item.atsrsId;}
  return "";
}
function personalOwnerStableId(){
  try{
    const profile=JSON.parse(readAppDataKey(localKey("profile")))||{};
    if(!window.atsrsStableIds)return "";
    let changed=false;
    if(!String(profile.name||"").trim()){
      const metadata=currentUser&&currentUser.user_metadata||{};
      const fullName=String(metadata.full_name||metadata.name||"").trim();
      profile.name=fullName||soloOwnerName();
      changed=true;
    }
    if(!validAtsrsId(profile.atsrsId)){
      profile.atsrsId=window.atsrsStableIds.create();
      changed=true;
    }
    if(changed)saveData("profile",profile);
    return profile.atsrsId;
  }catch(error){return "";}
}
function selectedPersonnel(select){
  if(isPersonalMode())return{id:personalOwnerStableId(),name:soloOwnerName()};
  const option=select&&select.options?select.options[select.selectedIndex]:null;
  return{id:validAtsrsId(select&&select.value)?select.value:"",name:option?option.textContent.trim():""};
}
function exactProjectIds(projectName,vesselName){
  const project=String(projectName||"").trim(),vessel=String(vesselName||"").trim();
  if(!project&&!vessel)return[];
  const matches=getProjects().filter(item=>{
    if(String(item.project||"").trim()!==project)return false;
    return !vessel||String(item.vessel||"").trim()===vessel;
  });
  return matches.length===1&&validAtsrsId(matches[0].atsrsId)?[matches[0].atsrsId]:[];
}
function crewComplianceStatus(personnel){
let name=((personnel&&personnel.name||"")+" "+(personnel&&personnel.surname||"")).trim();
let certs=getData("certs").filter(c=>validAtsrsId(personnel&&personnel.atsrsId)&&c.atsrsPersonnelId===personnel.atsrsId);
if(!certs.length)certs=getData("certs").filter(c=>!validAtsrsId(c.atsrsPersonnelId)&&c.person===name);
if(!certs.length)return {key:"review",text:tr("review"),cls:"badge-review"};
let hasExpired=certs.some(c=>status(c.expiry).expired);
let hasRisk=certs.some(c=>status(c.expiry).risk);
if(hasExpired||hasRisk)return {key:"review",text:tr("review"),cls:"badge-review"};
return {key:"ready",text:tr("ready"),cls:"badge-ready"};
}
function fillCrewFilters(personnel){
let currentCompany=crewCompanyFilter.value,currentPosition=crewPositionFilter.value,currentStatus=crewStatusFilter.value;
let companies=[...new Set(personnel.map(x=>x.company).filter(Boolean))];
let positions=[...new Set(personnel.map(x=>x.position).filter(Boolean))];
crewCompanyFilter.innerHTML=`<option value="">${tr("allCompanies")}</option>`+companies.map(x=>`<option>${x}</option>`).join("");
crewPositionFilter.innerHTML=`<option value="">${tr("allPositions")}</option>`+positions.map(x=>`<option>${x}</option>`).join("");
crewStatusFilter.innerHTML=`<option value="">${tr("allStatuses")}</option><option value="ready">${tr("ready")}</option><option value="review">${tr("review")}</option>`;
crewCompanyFilter.value=currentCompany;crewPositionFilter.value=currentPosition;crewStatusFilter.value=currentStatus;
}
function handleExcelImport(e){
let file=e.target.files&&e.target.files[0];
if(!file)return;
excelPreview.innerText=tr("fileSelected")+": "+file.name+" ("+Math.round(file.size/1024)+" KB). "+tr("importInfo");
}
function getProjects(){return JSON.parse(readAppDataKey(localKey("projects")))||[]}
function saveProjects(d){return writeAppDataKey(localKey("projects"),JSON.stringify(d))}
function addProject(){
let d=getProjects();
if(!projectNameInput.value.trim()){alert(v12("fill")||tr("fill"));return}
let item={project:projectNameInput.value,vessel:vesselNameInput.value,client:clientNameInput.value,team:teamNameInput.value};ensureAtsrsId(item);d.push(item);
saveProjects(d);projectNameInput.value=vesselNameInput.value=clientNameInput.value=teamNameInput.value="";renderProjects();
}
function deleteProject(i){let d=getProjects(),project=d[i];if(!project)return;let linked=getData("personnel").some(person=>Array.isArray(person.atsrsProjectIds)&&person.atsrsProjectIds.includes(project.atsrsId));if(linked){alert("Remove this project from assigned personnel before deleting the project.");return}d.splice(i,1);saveProjects(d);renderProjects()}
function renderProjects(){
let d=getProjects();if(typeof projectsTable!=="undefined"&&projectsTable){projectsTable.innerHTML="";d.forEach((x,i)=>projectsTable.innerHTML+=`<tr><td>${x.project||""}</td><td>${x.vessel||""}</td><td>${x.client||""}</td><td>${x.team||""}</td><td><button class="action" onclick="deleteProject(${i})">${tr("delete")}</button></td></tr>`);}if(window.atsrsProjects&&typeof window.atsrsProjects.render==="function")window.atsrsProjects.render();
}

function addPersonnel(){let a=getData("personnel");if(!pName.value.trim()){alert(v12("fill")||tr("fill"));return}let item={name:pName.value,surname:pSurname.value,position:pPosition.value,company:pCompany.value,email:pEmail.value,phone:pPhone.value,nationality:pNationality.value,employeeId:pEmployeeId.value,project:pProject.value,vessel:pVessel.value,atsrsProjectIds:exactProjectIds(pProject.value,pVessel.value)};ensureAtsrsId(item);a.push(item);saveData("personnel",a);pName.value=pSurname.value=pPosition.value=pCompany.value=pEmail.value=pPhone.value=pNationality.value=pEmployeeId.value=pProject.value=pVessel.value="";renderAll();showPersonnelTab("list")}
function deletePersonnel(i){let a=getData("personnel"),person=a[i];if(!person)return;let linked=getData("certs").some(cert=>validAtsrsId(person.atsrsId)&&cert.atsrsPersonnelId===person.atsrsId);if(linked){alert("Remove this personnel member's certificates before deleting the personnel record.");return}a.splice(i,1);saveData("personnel",a);renderAll()}
function startCameraScan(){scanBox.classList.remove("hidden");confirmBox.classList.add("hidden");documentPreview.innerText="";cameraInput.click()}

let atsrsTesseractPromise=null;
function loadTesseractOnDemand(){
if(window.Tesseract)return Promise.resolve(window.Tesseract);
if(atsrsTesseractPromise)return atsrsTesseractPromise;
atsrsTesseractPromise=new Promise((resolve,reject)=>{
let script=document.createElement("script");
script.src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
script.async=true;
script.onload=()=>window.Tesseract?resolve(window.Tesseract):reject(new Error("OCR library did not initialize."));
script.onerror=()=>reject(new Error("OCR library could not be loaded."));
document.head.appendChild(script);
}).catch(error=>{atsrsTesseractPromise=null;throw error;});
return atsrsTesseractPromise;
}

async function handleDocumentUpload(e){
let file=e.target.files&&e.target.files[0];
if(!file)return;
window.atsrsPendingCertificateFile=file;
scanBox.classList.remove("hidden");
confirmBox.classList.remove("hidden");
documentPreview.innerText=v12("fileSelected")+": "+file.name+" ("+Math.round(file.size/1024)+" KB)";
ocrProgress.innerText=v12("ocrStarting");
autoDocNo.value=autoProvider.value=autoIssue.value=autoExpiry.value="";
let fn=file.name.toUpperCase();
if(fn.includes("PASSPORT"))autoDocType.value="Passport";
else if(fn.includes("SEAMAN"))autoDocType.value="Seaman Book";
else if(fn.includes("BOSIET")||fn.includes("FOET"))autoDocType.value="BOSIET / FOET";
else if(fn.includes("MEDICAL"))autoDocType.value="Medical";
else if(fn.includes("VISA"))autoDocType.value="Visa";
try{
ocrProgress.innerText=v12("ocrStarting");
await loadTesseractOnDemand();
const result=await Tesseract.recognize(file,"eng",{
logger:m=>{if(m.status&&typeof m.progress==="number"){ocrProgress.innerText=v12("ocrProgress")+": "+m.status+" "+Math.round(m.progress*100)+"%";}}
});
let text=(result&&result.data&&result.data.text)||"";
if(!text.trim()){ocrProgress.innerText=v12("noTextDetected")+" "+v12("ocrManual");return;}
autoFillFromOCR(text);
}catch(err){
console.error("OCR failed:",err);
ocrProgress.innerText=v12("ocrNotAvailable")+" "+v12("ocrManual");
}
}

function autoFillFromOCR(text){
ocrRawText.value=text||"";
let clean=(text||"").replace(/\s+/g," ").trim();
let upper=clean.toUpperCase();

if(upper.includes("PASSPORT")) autoDocType.value="Passport";
else if(upper.includes("SEAMAN")) autoDocType.value="Seaman Book";
else if(upper.includes("BOSIET")||upper.includes("FOET")) autoDocType.value="BOSIET / FOET";
else if(upper.includes("MEDICAL")||upper.includes("FITNESS")) autoDocType.value="Medical";
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
function atsrsBakuCalendarDate(now){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Baku',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now||new Date());
  const values={};parts.forEach(part=>{if(part.type!=='literal')values[part.type]=part.value;});
  return new Date(Date.UTC(Number(values.year),Number(values.month)-1,Number(values.day)));
}
function status(expiry){let t=atsrsBakuCalendarDate();let e=new Date(expiry+'T00:00:00Z');let d=Math.round((e-t)/(86400000));if(d<0)return{txt:tr("expired"),cls:"danger",expired:true,risk:true,days:d};if(d<=30)return{txt:tr("exp30s"),cls:"danger",risk:true,days:d};if(d<=90)return{txt:tr("exp90s"),cls:"warning",risk:true,days:d};return{txt:tr("valid"),cls:"good",risk:false,days:d}}

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
let ready=0,review=0;
p.forEach((x,i)=>{
let full=((x.name||"")+" "+(x.surname||"")).trim();
  let st=crewComplianceStatus(x);
if(st.key==="ready")ready++; if(st.key==="review")review++;
let hay=[x.name,x.surname,x.position,x.company,x.email,x.phone,x.nationality,x.employeeId,x.project,x.vessel].join(" ").toLowerCase();
if(q&&!hay.includes(q))return;
if(company&&x.company!==company)return;
if(position&&x.position!==position)return;
if(stf&&st.key!==stf)return;
personnelTable.innerHTML+=`<tr><td>${x.name||""}</td><td>${x.surname||""}</td><td>${x.position||""}</td><td>${x.company||""}</td><td>${x.email||""}</td><td>${x.phone||""}</td><td><span class="badge ${st.cls}">${st.text}</span></td><td><button class="action" onclick="deletePersonnel(${i})">${tr("delete")}</button></td></tr>`;
if(!isPersonalMode()){let stableId=ensureAtsrsId(x);cPerson.innerHTML+=`<option value="${stableId}">${full}</option>`;autoPerson.innerHTML+=`<option value="${stableId}">${full}</option>`;}
});
readyCrew.innerText=ready;reviewCrew.innerText=review;
certTable.innerHTML="";let e90=0,e30=0,ex=0;
c.forEach((x,i)=>{let s=status(x.expiry);if(s.risk&&!s.expired)e90++;if(!s.expired&&s.days<=30)e30++;if(s.expired)ex++;certTable.innerHTML+=`<tr><td>${x.type}</td><td>${x.provider||""}</td><td>${x.expiry}</td><td class="${s.cls}">${s.txt}</td><td><button class="action" onclick="deleteCert(${i})">${tr("delete")}</button></td></tr>`});
exp90.innerText=e90;if(typeof exp30!=="undefined")exp30.innerText=e30;expired.innerText=ex;
renderRiskList(c);
renderProjects();
}

const countries=["","Azerbaijan","Turkey","Norway","United Kingdom","United States","Canada","Germany","France","Spain","Portugal","Italy","Netherlands","Belgium","Denmark","Sweden","Finland","Poland","Romania","Bulgaria","Georgia","Kazakhstan","United Arab Emirates","Saudi Arabia","Qatar","Kuwait","Oman","Bahrain","India","Pakistan","Philippines","Indonesia","Malaysia","Singapore","China","Japan","South Korea","Australia","New Zealand","South Africa","Equatorial Guinea","Angola","Nigeria","Ghana","Egypt","Morocco","Brazil","Mexico","Argentina"];
function fillCountries(){[document.getElementById("profileCountry"),document.getElementById("profileBirthCountry")].filter(Boolean).forEach(select=>{select.innerHTML="";countries.forEach(c=>{let o=document.createElement("option");o.value=c;o.text=c;select.appendChild(o)})})}
async function saveProfile(){let current={};try{current=JSON.parse(readAppDataKey(localKey("profile")))||{}}catch(error){}let next=Object.assign({},current,{name:profileName.value,surname:profileSurname.value,phone:profilePhone.value,country:profileCountry.value,company:profileCompany.value,position:profilePosition.value,timezone:profileTimezone.value});writeAppDataKey(localKey("profile"),JSON.stringify(next));var saved=window.atsrsCloudData&&typeof window.atsrsCloudData.flush==="function"?await window.atsrsCloudData.flush():true;alert(saved?"Profile saved to the ATSRS server.":"Profile was not saved. Check the connection and try again.")}
function loadProfile(){fillCountries();let p=JSON.parse(readAppDataKey(localKey("profile")))||{};profileName.value=p.name||"";profileSurname.value=p.surname||"";profilePhone.value=p.phone||"";profileCountry.value=p.country||"";profileCompany.value=p.company||"";profilePosition.value=p.position||"";profileTimezone.value=p.timezone||"UTC"}
function exportLocalData(){let data={profile:JSON.parse(readAppDataKey(localKey("profile")))||{},personnel:getData("personnel"),certificates:getData("certs")};let blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});let url=URL.createObjectURL(blob);let a=document.createElement("a");a.href=url;a.download="atsrs-data-export.json";a.click();URL.revokeObjectURL(url)}

if(localStorage.getItem("atsrs_auth_mode")==="local"){localStorage.removeItem("atsrs_auth_mode")}if(supabaseClient&&!window.__atsrsPasswordRecoveryListenerInstalled){window.__atsrsPasswordRecoveryListenerInstalled=true;supabaseClient.auth.onAuthStateChange(e=>{if(e==="PASSWORD_RECOVERY"){hideAuthBoxes();newPasswordBox.classList.remove("hidden")}})}
function v12(k){
  return (T[lang]&&T[lang][k]) || (UI[lang]&&UI[lang][k]) || T.en[k] || UI.en[k] || k;
}
const V23_TEXT={
  en:{addDoc:"Add Certificate",flowNote:"Choose one clean path: scan for auto-fill, or upload and enter details manually.",scanTab:"Scan & Auto-fill",manualTab:"Upload / Manual Entry",scanFlow:"Use camera or file upload for OCR-assisted auto-fill, then confirm before saving.",manualFlow:"Upload the file for record keeping, then enter certificate details manually.",manualUpload:"Upload File"}
};
function v23(k){return (V23_TEXT[lang]&&V23_TEXT[lang][k])||V23_TEXT.en[k]||k}
function applyV23Language(){
  if(typeof addDocTitle!=="undefined")addDocTitle.innerText=isPersonalMode()?"Add document":v23("addDoc");
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
  window.atsrsPendingCertificateFile=file;
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
  en:{documents:"Documents",refs:"References",compliance:"Compliance",reports:"Reports",totalDocuments:"Total Documents",docStatus:"Document Overview",docStatusSub:"Uploaded career documents appear here without profession-specific requirements.",heroPersonal:"Your document vault",heroCompany:"Personnel document control center",heroPersonalText:"Store and track the documents relevant to your own profession from one dashboard.",heroCompanyText:"Review Personnel documents and expiry dates without imposing a universal document checklist.",docNoOptional:"Document / Certificate No (Optional)",countryOptional:"Country / Authority (Optional)",refsTitle:"References",refsSub:"Keep appraisal forms, reference letters and client feedback in one place.",appraisals:"Appraisals",appraisalsText:"Upload annual appraisals, performance reviews and evaluation forms.",references:"References",referenceLetters:"Reference Letters",referencesText:"Store reference letters and contact-ready career proof.",uploadAppraisal:"Upload",uploadReference:"Upload",compliancePageSub:"Company Personnel status is based only on uploaded document dates.",reportsSub:"Generate a current Personnel document report from ATSRS server data.",documentRegister:"Document Register"}
};
function v25(k){return (V25_TEXT[lang]&&V25_TEXT[lang][k])||V25_TEXT.en[k]||k}
function v25Safe(value){return String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderV25DocumentStatus(){
  if(typeof docCategoryGrid==="undefined")return;
  let c=getData("certs");
  docCategoryGrid.innerHTML=c.length?c.map(x=>`<div class="doc-chip ok">✓ ${v25Safe(x.type||'Document')}</div>`).join(""):'<div class="doc-chip">No documents uploaded yet.</div>';
  if(typeof companyComplianceGrid!=="undefined"){
    if(isPersonalMode()){companyComplianceGrid.innerHTML=`<div class="doc-chip">${v25('compliancePageSub')}</div>`;}
    else if(window.atsrsCorporateReporting&&window.atsrsCorporateReporting.ownsCompliance){
      window.atsrsCorporateReporting.renderCompliance();
    }else{companyComplianceGrid.innerHTML='<div class="corporate-report-empty">Loading live Personnel compliance...</div>';}
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
  if(typeof referenceCardTitle!=="undefined")referenceCardTitle.innerText=isPersonalMode()?v25('referenceLetters'):v25('references');
  if(typeof referenceCardText!=="undefined")referenceCardText.innerText=v25('referencesText');
  if(typeof uploadAppraisalBtn!=="undefined")uploadAppraisalBtn.innerText=v25('uploadAppraisal');
  if(typeof uploadReferenceBtn!=="undefined")uploadReferenceBtn.innerText=v25('uploadReference');
  if(typeof compliancePageTitle!=="undefined")compliancePageTitle.innerText=v25('compliance');
  if(typeof compliancePageSub!=="undefined")compliancePageSub.innerText=v25('compliancePageSub');
  if(typeof reportsTitle!=="undefined")reportsTitle.innerText=v25('reports');
  if(typeof reportsSub!=="undefined")reportsSub.innerText=v25('reportsSub');
  syncPersonalHeadingHierarchy(localStorage.getItem("atsrs_current_page")||"intro");
}
const setUseModeBaseV25=setUseMode;setUseMode=function(mode){setUseModeBaseV25(mode);applyV25Mode();applyV25Language();renderAll();}
const renderAllBaseV25=renderAll;renderAll=function(){renderAllBaseV25();renderV25DocumentStatus();}
const applyLanguageBaseV25=applyLanguage;applyLanguage=function(){applyLanguageBaseV25();applyV25Language();renderV25DocumentStatus();}
const V48_TEXT={
  en:{cvStatus:"CV Status",cvAvailable:"Available ✓",cvMissing:"Missing ⚠",cvTitle:"CV / Resume",cvText:"Store, manage and share CV versions for employers, agencies and clients.",cvUploaded:"CV Uploaded ✓",cvNotUploaded:"No CV Uploaded",uploadCV:"Upload CV",previewCV:"Preview CV",downloadCV:"Download CV",deleteCV:"Delete CV",cvBetaBadge:"AI CV GENERATOR",cvBetaTitle:"Generate ATSRS Profile CV",cvBetaText:"Turn your saved profile, career history and document register into a structured CV.",generateCV:"Generate ATSRS CV",cvComingSoon:"",cvNoFile:"No CV uploaded yet.",cvSaved:"CV saved",cvDeleted:"CV deleted."}
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
function previewCV(){
  const cv=getCV();
  if(!cv){alert(v48('cvNoFile'));return;}
  if(typeof window.atsrsOpenFilePreview==='function'){
    window.atsrsOpenFilePreview({url:cv.data,title:cv.name||'ATSRS CV',downloadUrl:cv.data});
  }
}
function downloadCV(){const cv=getCV(); if(!cv){alert(v48('cvNoFile'));return;} const a=document.createElement('a');a.href=cv.data;a.download=cv.name||'ATSRS-CV';document.body.appendChild(a);a.click();a.remove();}
function deleteCV(){const cv=getCV(); if(!cv){alert(v48('cvNoFile'));return;} saveCV(null); if(typeof cvUploadInput!=='undefined')cvUploadInput.value=''; renderCVStatus(); renderAll();}
function renderCVStatus(){
  /* Supabase owns the CV card while a cloud workspace is active.
     Legacy local CV state must never overwrite the server result. */
  if(window.atsrsCloudData&&typeof window.atsrsCloudData.renderFiles==='function')return;
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
  if(typeof cvStatusBadge!=='undefined'){cvStatusBadge.innerText=cv?v48('cvUploaded'):v48('cvNotUploaded');cvStatusBadge.className='badge '+(cv?'badge-ready':'badge-missing');}
  if(typeof cvFileInfo!=='undefined')cvFileInfo.innerText=cv?`${cv.name} • ${Math.round((cv.size||0)/1024)} KB`:'';
  if(typeof cvStatusDashText!=='undefined')cvStatusDashText.innerText=v48('cvStatus');
  if(typeof cvStatusDash!=='undefined'){cvStatusDash.innerText=cv?v48('cvAvailable'):v48('cvMissing');cvStatusDash.className='stat '+(cv?'good':'missing');}
}
const renderAllBaseV48=renderAll;
renderAll=function(){renderAllBaseV48(); const cv=getCV(); if(typeof totalCerts!=='undefined'){let c=getData('certs');totalCerts.innerText=c.length+(cv?1:0);} renderCVStatus();}
const applyLanguageBaseV48=applyLanguage;
applyLanguage=function(){applyLanguageBaseV48();renderCVStatus();}
setTimeout(()=>{try{renderCVStatus()}catch(e){}},0);
const V49_FILE_TEXT={
  en:{appStatusUploaded:"Appraisal Uploaded ✓",appStatusMissing:"No Appraisal Uploaded",refStatusUploaded:"Reference Uploaded ✓",refStatusMissing:"No Reference Uploaded",preview:"Preview",download:"Download",deleteFile:"Delete",generate:"Generate ATSRS File (Beta)",comingSoon:"ATSRS document generator will be connected in a later build.",noFile:"No file uploaded yet.",uploadAppraisal:"Upload",uploadReference:"Upload",appBetaTitle:"Generate ATSRS Appraisal Summary",appBetaText:"Generate an ATSRS appraisal summary from stored career data.",refBetaTitle:"Generate ATSRS Reference Pack",refBetaText:"Generate an ATSRS reference pack from stored career data.",docTypePlaceholder:"Write document type manually",autoDocTypePlaceholder:"Write detected document type manually"}
};
function v49(k){return (V49_FILE_TEXT[lang]&&V49_FILE_TEXT[lang][k])||V49_FILE_TEXT.en[k]||k}
const restoreCurrentPageBaseV49=restoreCurrentPage;
restoreCurrentPage=function(){let page=localStorage.getItem('atsrs_current_page')||'intro';let map={intro:navIntro,privacy:navPrivacy,dataRights:navPrivacy,dashboard:navDashboard,candidates:navCandidates,personnel:navPersonnel,certificates:navCertificates,refs:navRefs,compliance:navCompliance,security:navCompliance,reports:navReports,profile:navProfile,jobs:navJobs,employers:navEmployers};showPage(map[page]?page:'intro',map[page]||navIntro);}
const V27_TEXT={
  en:{shareBadge:"SHARE PROFILE",shareTitle:"Share My ATSRS Profile",shareSub:"Send one secure profile link instead of attaching documents one by one.",copyLink:"Copy Link",preview:"Preview",manageAccess:"Manage Access",linkCopied:"Link copied.",companyView:"Company view",companyImportText:"A company can review shared documents and import selected records into ATSRS Company later.",importCompany:"Import to Company Profile",importDemoAlert:"Company import will be connected after backend and permissions are ready.",profileVisibility:"Profile Visibility",profileVisibilityNote:"Private hides you from Candidates. Link Only is visible through your active share link. Public lists eligible profiles in Candidates.",sharedProfile:"ATSRS Shared Profile"}
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
  let labels=c.map(x=>String(x.type||'Document')).filter(Boolean);
  if(getCV())labels.push('CV');
  sharePreviewDocs.innerHTML=labels.length?labels.map(d=>`<div class="doc-chip ok">✓ ${v25Safe(d)}</div>`).join(""):'<div class="doc-chip">No documents selected.</div>';
  let prof=JSON.parse(readAppDataKey(localKey("profile")))||{};
  let full=((prof.name||"Anar")+" "+(prof.surname||"Agasiyev")).trim();
  previewName.innerText=full;
  previewRole.innerText=prof.position||"Document Holder";
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
  en:{featureDocsTitle:"Document Vault",featureDocsText:"Keep licences, certifications, identity records and other career documents in one secure place.",featureUploadTitle:"Easy Upload",featureUploadText:"Upload PDF, JPG or PNG files directly into your secure ATSRS register.",featureScanTitle:"Scan & Auto-fill",featureScanText:"Scan documents and let ATSRS prepare information for manual review.",featureAlertsTitle:"Expiry Tracking",featureAlertsText:"Stay ahead with reminders for time-limited documents.",featureShareTitle:"Share Profile",featureShareText:"Share one secure ATSRS profile link instead of sending multiple attachments.",featureCompanyTitle:"Company Import",featureCompanyText:"Allow organisations to request access and import approved documents into their records.",workflowBadge:"HOW ATSRS WORKS",workflowTitle:"From document upload to employer-ready profile",workflowSub:"A flexible flow for people and organisations across industries.",step1Title:"Upload",step1Text:"Add documents manually or by scan.",step2Title:"Track",step2Text:"Monitor expiry and document dates.",step3Title:"Share",step3Text:"Send a controlled ATSRS profile link.",step4Title:"Approve",step4Text:"Allow companies to download or import selected documents.",snapshotBadge:"DOCUMENT SNAPSHOT",snapshotTitle:"Quick status",snapValidLabel:"Current documents",snapRiskLabel:"Expiry risk",snapShareLabel:"Profile sharing",snapShare:"Ready"}
};
function v29(k){return (V29_TEXT[lang]&&V29_TEXT[lang][k])||V29_TEXT.en[k]||k}
function applyV29Language(){
  ["featureDocsTitle","featureDocsText","featureUploadTitle","featureUploadText","featureScanTitle","featureScanText","featureAlertsTitle","featureAlertsText","featureShareTitle","featureShareText","featureCompanyTitle","featureCompanyText","workflowBadge","workflowTitle","workflowSub","step1Title","step1Text","step2Title","step2Text","step3Title","step3Text","step4Title","step4Text","snapshotBadge","snapshotTitle","snapValidLabel","snapRiskLabel","snapShareLabel"].forEach(id=>{let el=document.getElementById(id);if(el)el.innerText=v29(id);});
  if(typeof snapShare!=="undefined")snapShare.innerText=v29('snapShare');
}
function renderV29Snapshot(){
  if(typeof snapValid==="undefined")return;
  let c=getData("certs");
  let valid=0,risk=0;
  c.forEach(x=>{let s=status(x.expiry);if(!s.expired&&!s.risk)valid++;if(s.risk)risk++;});
  snapValid.innerText=valid; snapRisk.innerText=risk;
}
const applyLanguageBaseV29=applyLanguage;applyLanguage=function(){applyLanguageBaseV29();applyV29Language();renderV29Snapshot();}
const renderAllBaseV29=renderAll;renderAll=function(){renderAllBaseV29();renderV29Snapshot();}

/* V200: V54 text registry moved before early applyLanguage() calls to prevent TDZ initialization errors. */
var V54_TEXT={
  en:{recommendations:'Recommendation Letters',recommendationsText:'Store recommendation letters from supervisors, clients and companies.',uploadRecommendation:'Upload',appraisalsCount:'Appraisals',referencesCount:'References',recommendationsCount:'Recommendation Letters',noRecords:'No files uploaded yet.',signedDate:'Signed Date',preview:'Preview',download:'Download',deleteFile:'Delete'}
};
function v54(k){
  var dict=(typeof V54_TEXT!=='undefined' && V54_TEXT) ? V54_TEXT : {en:{}};
  return (dict[lang]&&dict[lang][k])||(dict.en&&dict.en[k])||k;
}

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
  ["featureDocsTitle","featureDocsText","featureUploadTitle","featureUploadText","featureScanTitle","featureScanText","featureAlertsTitle","featureAlertsText","featureShareTitle","featureShareText","featureCompanyTitle","featureCompanyText","bgDocPassportTitle","bgDocPassportText","bgDocMedicalTitle","bgDocMedicalText","bgDocTrainingTitle","bgDocTrainingText","bgDocShareTitle","bgDocShareText","bgDocCompanyTitle","bgDocCompanyText"].forEach(id=>{let el=document.getElementById(id);if(el)el.innerText=v35(id);});
}
const applyLanguageBaseV35=applyLanguage;
applyLanguage=function(){applyLanguageBaseV35();applyV35LoginLanguage();};
applyV35LoginLanguage();
const V36_LOGIN_TEXT={
  en:{
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
    const input=document.getElementById(inputId); if(!input)return;
    const wrap=input.closest('.field-wrap'); if(!wrap)return;
    let group=wrap.closest('.documents-expiry-group');
    if(!group){
      group=document.createElement('div');
      group.className='documents-expiry-group';
      wrap.parentNode.insertBefore(group,wrap);
      group.appendChild(wrap);
    }
    let row=document.getElementById(checkId)?.closest('.na-check');
    if(!row){
      group.insertAdjacentHTML('beforeend',`<label class="na-check"><input id="${checkId}" type="checkbox"> <span id="${labelId}">${v41r('notApplicable')}</span></label>`);
      row=document.getElementById(checkId).closest('.na-check');
    }else if(row.parentNode!==group){
      group.appendChild(row);
    }
    const cb=document.getElementById(checkId);
    if(cb.dataset.expiryNaBound==='1')return;
    cb.dataset.expiryNaBound='1';
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
confirmExtractedDocument=async function(){
  if(!validateAutoConfirmForm())return;
  let selection=selectedPersonnel(autoPerson),person=selection.name;
  let a=getData('certs');
  let item={person,atsrsPersonnelId:selection.id,type:autoDocType.value,provider:autoProvider.value,expiry:normalizeExpiry('autoExpiry','autoExpiryNA'),docNo:autoDocNo.value,issue:autoIssue.value};ensureAtsrsId(item);
  let uploadedRow=null;
  try{
    const file=window.atsrsPendingCertificateFile;
    if(file){
      if(!window.atsrsCloudData||typeof window.atsrsCloudData.uploadDocument!=='function')throw new Error('ATSRS cloud storage is not ready.');
      uploadedRow=await window.atsrsCloudData.uploadDocument(file,{document:item});
      item.cloudFileId=uploadedRow.id;item.fileName=uploadedRow.file_name;item.mimeType=uploadedRow.mime_type;item.fileSize=uploadedRow.size_bytes;
    }
    a.push(item);saveData('certs',a);
    if(window.atsrsCloudData&&typeof window.atsrsCloudData.flush==='function'&&!(await window.atsrsCloudData.flush()))throw new Error('Document details could not be saved.');
    window.atsrsPendingCertificateFile=null;
    if(typeof documentFile!=='undefined')documentFile.value='';
    if(typeof cameraInput!=='undefined')cameraInput.value='';
    confirmBox.classList.add('hidden');documentPreview.innerText='';renderAll();
  }catch(error){
    console.error('ATSRS document save failed',error);
    if(uploadedRow&&window.atsrsCloudData&&typeof window.atsrsCloudData.deleteDocument==='function'){
      try{await window.atsrsCloudData.deleteDocument(uploadedRow.id);}catch(cleanupError){console.error('ATSRS orphan document cleanup failed',cleanupError);}
    }
    alert('The document was not saved to the ATSRS server. Check the connection and try again.');
  }
};
addCertificate=function(){
  let a=getData('certs'); let selection=selectedPersonnel(cPerson),person=selection.name;
  if(!validateManualCertificateForm()||!person)return;
  const previous=editCertIndex!==null&&a[editCertIndex]?a[editCertIndex]:{};
  const item=Object.assign({},previous,{person,atsrsPersonnelId:selection.id,type:cType.value,docNo:(cDocNo?.value||''),country:(cCountry?.value||''),provider:cProvider.value,issue:cIssue.value,expiry:normalizeExpiry('cExpiry','cExpiryNA')});ensureAtsrsId(item);
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
  if(!isPersonalMode()&&validAtsrsId(x.atsrsPersonnelId))cPerson.value=x.atsrsPersonnelId;
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
applyLanguage=function(){applyLanguageBaseV41R();applyV41RLanguage();if(!window.__atsrsOpeningApp&&renderAll)setTimeout(()=>{try{renderAll()}catch(e){}},0);}
setTimeout(()=>{ensureExpiryNAControls();applyV41RLanguage();},0);

/* ===== extracted from inline script ===== */
/* V200: V54_TEXT/v54 are declared earlier before applyLanguage() is called. */
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
     title.outerHTML=`<div class="ref-doc-head"><h3 id="${ids[0]}">${title.innerText}</h3><span id="${kind}StatusBadge" class="badge badge-missing">No File</span></div>`;
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
   const badge=document.getElementById(kind+'StatusBadge'); if(badge){badge.innerText=(files.length?(files.length+' File'+(files.length>1?'s':'')):'No File');badge.className='badge '+(files.length?'badge-ready':'badge-missing');}
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
atsrsStableInterval(forceTopControlsFixed,800);
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
atsrsStableInterval(v55DockTopActions,500);
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
  atsrsStableInterval(lockCareerLists,900);
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

/* ===== ATSRS V180 Create Account V1 - real Supabase register enabled ===== */
(function(){
  'use strict';
  var AUTH_BUILD='ATSRS V180 CREATE ACCOUNT V1';
  function byId(id){return document.getElementById(id);}
  function setText(id,msg){var el=byId(id); if(el) el.textContent=msg||'';}
  function redirectUrl(){
    try{
      var origin=window.location.origin || 'https://atsrs.com';
      var path=window.location.pathname || '/';
      if(!path) path='/';
      return origin + path;
    }catch(e){return 'https://atsrs.com/';}
  }
  function selectedAccountType(){
    var p=byId('personalModeBtn'), c=byId('companyModeBtn');
    var mode='';
    if(p && p.classList.contains('active')) mode='personal';
    if(c && c.classList.contains('active')) mode='company';
    try{ if(!mode) mode=localStorage.getItem('atsrs_use_mode')||''; }catch(e){}
    if(mode!=='personal' && mode!=='company') mode='';
    return mode;
  }
  function applyAccountType(mode){
    if(mode!=='personal' && mode!=='company') return;
    try{localStorage.setItem('atsrs_use_mode',mode);}catch(e){}
    try{useMode=mode;}catch(e){}
    try{window.useMode=mode;}catch(e){}
    var p=byId('personalModeBtn'), c=byId('companyModeBtn');
    if(p) p.classList.toggle('active',mode==='personal');
    if(c) c.classList.toggle('active',mode==='company');
    document.body.classList.toggle('personal-mode',mode==='personal');
    document.body.classList.toggle('company-mode',mode==='company');
  }
  function accountTypeFromUser(user){
    var meta=(user && (user.user_metadata || user.raw_user_meta_data)) || {};
    return meta.account_type || meta.atsrs_account_type || meta.use_mode || '';
  }
  function validEmailInput(input,rule){
    if(typeof markEmail==='function' && input && rule) return markEmail(input,rule);
    return !!(input && /.+@.+\..+/.test((input.value||'').trim()));
  }
  function saveRemember(){
    var remember=byId('rememberMe'), email=byId('loginEmail');
    if(!remember || !email) return;
    try{
      if(remember.checked){
        localStorage.setItem('atsrs_remember_me','1');
        localStorage.setItem('atsrs_saved_login_email',(email.value||'').trim());
      }else{
        localStorage.removeItem('atsrs_remember_me');
        localStorage.removeItem('atsrs_saved_login_email');
      }
    }catch(e){}
  }
  function showRegisterModeRequired(){
    var area=byId('registerAccountTypeArea') || byId('modeChoiceBox');
    var notice=byId('registerAccountNotice');
    if(area) area.classList.add('needs-choice');
    if(notice) notice.classList.add('choice-missing');
    setText('regMsg','Select Personal or Corporate before creating your ATSRS account.');
    try{if(area && area.scrollIntoView) area.scrollIntoView({behavior:'smooth',block:'center'});}catch(e){}
  }
  function setRegisterBusy(isBusy){
    var b=byId('registerBtn');
    if(!b) return;
    b.disabled=!!isBusy;
    if(isBusy){
      if(!b.dataset.atsrsOriginalText) b.dataset.atsrsOriginalText=b.textContent||'Register';
      b.textContent='Creating account...';
    }else if(b.dataset.atsrsOriginalText){
      b.textContent=b.dataset.atsrsOriginalText;
    }
  }
  async function realRegister(){
    var emailEl=byId('regEmail'), passEl=byId('regPassword'), pass2El=byId('regPassword2');
    var email=(emailEl && emailEl.value || '').trim().toLowerCase();
    var password=(passEl && passEl.value || '').trim();
    var password2=(pass2El && pass2El.value || '').trim();
    var mode=selectedAccountType();
    setText('regMsg','');
    if(!mode){showRegisterModeRequired();return false;}
    if(!email || !password || !password2){setText('regMsg',typeof tr==='function'?tr('fill'):'Fill all required fields.');return false;}
    if(password.length<6){setText('regMsg',typeof tr==='function'?tr('passRule'):'Password must be at least 6 characters.');return false;}
    if(password!==password2){setText('regMsg',typeof tr==='function'?tr('matchRule'):'Passwords do not match.');return false;}
    if(typeof validateRegisterFields==='function' && !validateRegisterFields()) return false;
    if(!validEmailInput(emailEl,byId('regEmailRule'))) return false;
    if(!supabaseClient || !supabaseClient.auth){setText('regMsg','Supabase library did not load.');return false;}
    try{
      setRegisterBusy(true);
      setText('regMsg','Creating account...');
      applyAccountType(mode);
      var res=await supabaseClient.auth.signUp({
        email:email,
        password:password,
        options:{
          emailRedirectTo:redirectUrl(),
          data:{
            account_type:mode,
            atsrs_account_type:mode,
            use_mode:mode,
            source:'atsrs-web',
            app:'ATSRS'
          }
        }
      });
      if(res.error){setText('regMsg',atsrsFriendlyAuthError(res.error,'Account could not be created. Please try again.'));return false;}
      var user=res.data && res.data.user;
      var needsEmailConfirm=!(res.data && res.data.session);
      try{
        localStorage.setItem('atsrs_pending_email',email);
        localStorage.setItem('atsrs_use_mode',mode);
      }catch(e){}
      if(user && user.identities && user.identities.length===0){
        setText('regMsg','This email may already be registered. Try Login or Forgot Password.');
        return true;
      }
      setText('regMsg',needsEmailConfirm ? 'Account created. Confirmation email sent. Check inbox/spam.' : 'Account created. You can now continue.');
      return true;
    }catch(e){setText('regMsg',atsrsFriendlyAuthError(e,typeof tr==='function'?tr('connection'):'Connection failed.'));return false;}
    finally{setRegisterBusy(false);}
  }
  async function realLogin(){
    var emailEl=byId('loginEmail'), passEl=byId('loginPassword');
    var email=(emailEl && emailEl.value || '').trim();
    var password=(passEl && passEl.value || '').trim();
    setText('loginMsg','');
    if(!email || !password){setText('loginMsg',typeof tr==='function'?tr('enterLogin'):'Enter email and password.');return false;}
    if(!validEmailInput(emailEl,byId('loginEmailRule'))) return false;
    if(!supabaseClient || !supabaseClient.auth){setText('loginMsg','Supabase library did not load.');return false;}
    try{
      saveRemember();
      var res=await supabaseClient.auth.signInWithPassword({email:email,password:password});
      if(res.error){setText('loginMsg',atsrsFriendlyAuthError(res.error,'Sign in failed. Please try again.'));return false;}
      var user=res.data && res.data.user;
      var mode=accountTypeFromUser(user) || selectedAccountType() || 'personal';
      applyAccountType(mode);
      try{localStorage.setItem('atsrs_auth_mode','supabase');}catch(e){}
      currentUser=user;
      window.currentUser=user;
      var session=res.data && res.data.session;
      if(session && typeof window.atsrsResumeSession==='function'){
        await window.atsrsResumeSession(session,'signin');
      }else if(typeof openApp==='function'){
        await openApp();
      }
      return true;
    }catch(e){setText('loginMsg',atsrsFriendlyAuthError(e,typeof tr==='function'?tr('connection'):'Connection failed.'));return false;}
  }
  async function realForgotPassword(){
    var emailEl=byId('resetEmail');
    var email=(emailEl && emailEl.value || '').trim();
    setText('resetMsg','');
    if(!email){setText('resetMsg',typeof tr==='function'?tr('enterLogin'):'Enter email.');return false;}
    if(!validEmailInput(emailEl,byId('resetEmailRule'))) return false;
    if(!supabaseClient || !supabaseClient.auth){setText('resetMsg','Supabase library did not load.');return false;}
    try{
      var res=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:redirectUrl()});
      setText('resetMsg',res.error?atsrsFriendlyAuthError(res.error,'Reset link could not be sent. Please try again.'):(typeof tr==='function'?tr('sent'):'Reset link sent.'));
      return !res.error;
    }catch(e){setText('resetMsg',atsrsFriendlyAuthError(e,'Connection failed.'));return false;}
  }
  async function realUpdatePassword(){
    var p1=(byId('newPassword') && byId('newPassword').value || '').trim();
    var p2=(byId('newPassword2') && byId('newPassword2').value || '').trim();
    setText('newPassMsg','');
    if(!p1 || !p2){setText('newPassMsg',typeof tr==='function'?tr('fill'):'Fill all fields.');return false;}
    if(p1!==p2){setText('newPassMsg',typeof tr==='function'?tr('matchRule'):'Passwords do not match.');return false;}
    if(!supabaseClient || !supabaseClient.auth){setText('newPassMsg','Supabase library did not load.');return false;}
    try{
      var res=await supabaseClient.auth.updateUser({password:p1});
      setText('newPassMsg',res.error?atsrsFriendlyAuthError(res.error,'Password could not be updated. Please try again.'):'Password updated.');
      return !res.error;
    }catch(e){setText('newPassMsg',atsrsFriendlyAuthError(e,'Connection failed.'));return false;}
  }
  function showLoginScreen(){
    var authEl=byId('auth');
    var appEl=byId('app');
    window.__atsrsSessionOpened=false;
    if(typeof hideAuthBoxes==='function') hideAuthBoxes();
    var loginBox=byId('loginBox'); if(loginBox) loginBox.classList.remove('hidden');
    if(typeof window.atsrsHideCompactChoice==='function') window.atsrsHideCompactChoice();
    if(appEl) appEl.classList.add('hidden');
    if(authEl) authEl.classList.remove('hidden');
    document.body.classList.remove('atsrs-booting');
  }
  async function realLogout(){
    var logoutButtons=[byId('workspaceLogoutBtn')].filter(Boolean);
    logoutButtons.forEach(function(btn){btn.disabled=true;btn.textContent='Logging out...';});
    if(window.atsrsCloudData&&typeof window.atsrsCloudData.flush==='function'){
      var saved=await window.atsrsCloudData.flush();
      if(saved===false||!window.atsrsCloudData.isSynced()){
        logoutButtons.forEach(function(btn){btn.disabled=false;btn.textContent='Logout';});
        if(typeof window.atsrsWorkspaceSwitcherBusy==='function') window.atsrsWorkspaceSwitcherBusy(false,'');
        alert('Your latest changes were not saved to the ATSRS server. Check the connection and try Logout again.');
        return false;
      }
    }
    var signOutError=null;
    try{
      if(currentUser && typeof currentUser.email==='string' && currentUser.email.trim()){
        localStorage.setItem('atsrs_last_google_email',currentUser.email.trim().toLowerCase());
      }
    }catch(e){}
    try{
      if(supabaseClient && supabaseClient.auth){
        var signOutResult=await supabaseClient.auth.signOut({scope:'local'});
        signOutError=signOutResult && signOutResult.error;
      }
    }catch(e){
      signOutError=e;
    }
    try{
      localStorage.removeItem('atsrs_auth_mode');
      localStorage.removeItem('atsrs_current_page');
      localStorage.removeItem('atsrs_use_mode');
      localStorage.setItem('atsrs_google_intent','');
      localStorage.removeItem('atsrs_pending_account_type');
      localStorage.removeItem('atsrs_force_google_account_choice');
      localStorage.setItem('atsrs_workspace_pick_required','1');
    }catch(e){console.warn('ATSRS logout storage update failed',e);}
    try{currentUser=null;window.currentUser=null;}catch(e){}
    if(window.atsrsCloudData&&typeof window.atsrsCloudData.clearSession==='function'){
      window.atsrsCloudData.clearSession();
    }
    if(signOutError){
      console.warn('ATSRS Supabase signOut failed',signOutError);
    }
    logoutButtons.forEach(function(btn){btn.disabled=false;btn.textContent='Logout';});
    window.__atsrsSuppressAutomaticSessionOpen=true;
    window.location.replace(window.location.pathname);
    return true;
  }
  function restoreSession(){
    if(!supabaseClient || !supabaseClient.auth) return;
    if(window.__atsrsAuthRestoreInstalled) return;
    window.__atsrsAuthRestoreInstalled=true;
    var authDecision={userId:null,terminal:false,message:''};
    var WORKSPACE_TABLE='atsrs_workspaces';
    var sessionQueue=Promise.resolve();
    function workspaceKey(user,mode){return 'atsrs_workspace_'+user.id+'_'+mode;}
    function lastWorkspaceKey(user){return 'atsrs_last_workspace_'+user.id;}
    function emptyWorkspaceState(){
      return {personal:false,company:false};
    }
    function publishWorkspaceState(state,user){
      window.__atsrsWorkspaceState={
        personal:!!(state&&state.personal),
        company:!!(state&&state.company)
      };
      if(typeof window.atsrsWorkspaceSwitcherUpdate==='function'){
        window.atsrsWorkspaceSwitcherUpdate(window.__atsrsWorkspaceState,user||window.currentUser||null);
      }
      return window.__atsrsWorkspaceState;
    }
    function hasWorkspace(state,mode){
      return !!(state && (mode==='personal'||mode==='company') && state[mode]);
    }
    function workspaceServiceMessage(error){
      var code=(error && error.code)||'';
      var message=(error && error.message)||'';
      if(code==='42P01' || code==='PGRST205' || /atsrs_workspaces|relation .* does not exist/i.test(message)){
        return 'ATSRS account service is not ready yet. Please contact support.';
      }
      return 'Your ATSRS account could not be verified. Please check the connection and try again.';
    }
    function legacyWorkspaceModes(user){
      var modes=[];
      if(!user || !user.id) return modes;
      try{
        if(localStorage.getItem(workspaceKey(user,'personal'))==='1') modes.push('personal');
        if(localStorage.getItem(workspaceKey(user,'company'))==='1') modes.push('company');
      }catch(e){}
      return modes;
    }
    async function queryWorkspaceState(user){
      if(!user || !user.id) return emptyWorkspaceState();
      var result=await supabaseClient
        .from(WORKSPACE_TABLE)
        .select('account_type')
        .eq('user_id',user.id);
      if(result.error) throw result.error;
      var state=emptyWorkspaceState();
      (result.data||[]).forEach(function(row){
        if(row && (row.account_type==='personal'||row.account_type==='company')){
          state[row.account_type]=true;
        }
      });
      return state;
    }
    async function migrateLegacyWorkspaces(user,state){
      var legacy=legacyWorkspaceModes(user);
      for(var i=0;i<legacy.length;i++){
        var mode=legacy[i];
        if(hasWorkspace(state,mode)) continue;
        var result=await supabaseClient
          .from(WORKSPACE_TABLE)
          .insert({user_id:user.id,account_type:mode});
        if(result.error && result.error.code!=='23505') throw result.error;
        state[mode]=true;
      }
      try{
        localStorage.removeItem(workspaceKey(user,'personal'));
        localStorage.removeItem(workspaceKey(user,'company'));
      }catch(e){}
      return state;
    }
    async function readWorkspaceState(user){
      var operation=async function(){
        var state=await queryWorkspaceState(user);
        state=await migrateLegacyWorkspaces(user,state);
        publishWorkspaceState(state,user);
        return state;
      };
      if(user&&user.id&&typeof window.atsrsSingleFlight==='function'){
        return window.atsrsSingleFlight('workspace:state:'+user.id,operation);
      }
      return operation();
    }
    function readLastWorkspace(user){
      var last=''; try{last=localStorage.getItem(lastWorkspaceKey(user))||'';}catch(e){}
      return (last==='personal'||last==='company')?last:'';
    }
    function saveLastWorkspace(user,mode){
      if(!user || !user.id || (mode!=='personal' && mode!=='company')) return;
      try{localStorage.setItem(lastWorkspaceKey(user),mode);}catch(e){}
    }
    function rememberWorkspaceLocally(user,mode){
      if(!user || !user.id || (mode!=='personal' && mode!=='company')) return;
      applyAccountType(mode);
      saveLastWorkspace(user,mode);
    }
    function authQueryValue(name){
      try{return new URLSearchParams(window.location.search||'').get(name)||'';}
      catch(e){return '';}
    }
    function currentAuthIntent(){
      if(!window.__atsrsOAuthCallback) return '';
      var intent='';
      try{intent=localStorage.getItem('atsrs_google_intent')||'';}catch(e){}
      if(intent!=='signin'&&intent!=='signup') intent=authQueryValue('atsrs_intent');
      return (intent==='signin'||intent==='signup')?intent:'';
    }
    function clearOAuthCallbackUrl(){
      try{
        var url=new URL(window.location.href);
        ['atsrs_intent','atsrs_mode','atsrs_attempt','code','error','error_code','error_description'].forEach(function(name){
          url.searchParams.delete(name);
        });
        window.history.replaceState({},document.title,url.pathname+(url.search||'')+(url.hash||''));
      }catch(e){}
    }
    function clearTransientAuth(){
      try{localStorage.setItem('atsrs_google_intent','');}catch(e){}
      try{localStorage.removeItem('atsrs_pending_account_type');}catch(e){}
      try{localStorage.removeItem('atsrs_oauth_attempt');}catch(e){}
      try{sessionStorage.removeItem('atsrs_oauth_attempt');}catch(e){}
      window.__atsrsOAuthCallback=false;
      window.__atsrsOAuthCode='';
      window.__atsrsOAuthMarkedCallback=false;
      window.__atsrsOAuthInvalidCallback=false;
      window.__atsrsOAuthAttemptVerified=false;
      window.__atsrsOAuthSignupNeedsMode=false;
      window.__atsrsOAuthSessionReceived=false;
      window.__atsrsOAuthError='';
      clearOAuthCallbackUrl();
    }
    function lockTerminalDecision(user,message){
      authDecision.userId=user.id;
      authDecision.terminal=true;
      authDecision.message=message||'';
    }
    function isTerminalLocked(user){
      return authDecision.terminal && user && authDecision.userId===user.id;
    }
    function ensureTerminalLoginState(message){
      window.__atsrsSessionOpened=false;
      try{currentUser=null;window.currentUser=null;}catch(e){}
      if(typeof hideAuthBoxes==='function') hideAuthBoxes();
      var loginBox=byId('loginBox'); if(loginBox) loginBox.classList.remove('hidden');
      if(typeof window.atsrsHideCompactChoice==='function') window.atsrsHideCompactChoice();
      var authEl=byId('auth'); if(authEl) authEl.classList.remove('hidden');
      var appEl=byId('app'); if(appEl) appEl.classList.add('hidden');
      var msg=byId('loginMsg'); if(msg){msg.style.whiteSpace='pre-line'; msg.textContent=message||'';}
      if(typeof window.atsrsFinishBoot==='function') window.atsrsFinishBoot();
      else{
        document.body.classList.remove('atsrs-session-pending');
        document.body.classList.remove('atsrs-booting');
      }
    }
    window.atsrsResetAuthDecision=function(){
      authDecision.userId=null;
      authDecision.terminal=false;
      authDecision.message='';
    };
    function shouldWaitOnLoginScreen(event){
      var appEl=byId('app');
      if(!appEl || !appEl.classList.contains('hidden')) return false;
      if(event==='resume') return false;
      var intent=currentAuthIntent();
      if(intent==='signin' || intent==='signup') return false;
      var authMode=''; try{authMode=localStorage.getItem('atsrs_auth_mode')||'';}catch(e){}
      if(authMode==='supabase') return false;
      return event==='INITIAL_SESSION' || event==='getSession' || event==='TOKEN_REFRESHED';
    }
    function prepareAuthenticatedRoute(){
      window.__atsrsEntryRoute='app';
      window.__atsrsSuppressAutomaticSessionOpen=false;
      try{
        var url=new URL(window.location.href);
        var requestedView=url.searchParams.get('view');
        if(requestedView==='login'||requestedView==='signup')url.searchParams.delete('view');
        window.history.replaceState({},document.title,url.pathname+(url.search||'')+(url.hash||''));
      }catch(e){}
      var landingEl=byId('landingPage');
      if(landingEl)landingEl.classList.add('hidden');
      document.body.classList.remove('atsrs-public-view');
    }
    async function finishOpen(user){
      prepareAuthenticatedRoute();
      try{localStorage.setItem('atsrs_auth_mode','supabase');}catch(e){}
      try{
        if(user && typeof user.email==='string' && user.email.trim()){
          localStorage.setItem('atsrs_last_google_email',user.email.trim().toLowerCase());
        }
      }catch(e){}
      clearTransientAuth();
      try{localStorage.removeItem('atsrs_workspace_pick_required');}catch(e){}
      if(typeof window.atsrsHideCompactChoice==='function') window.atsrsHideCompactChoice();
      currentUser=user; window.currentUser=user;
      publishWorkspaceState(window.__atsrsWorkspaceState,user);
      var opened=typeof openApp==='function'?await openApp():false;
      window.__atsrsSessionOpened=opened!==false;
      return window.__atsrsSessionOpened;
    }
    async function openExistingWorkspace(user,mode,state){
      if(!user || !hasWorkspace(state,mode)) return false;
      applyAccountType(mode);
      saveLastWorkspace(user,mode);
      return finishOpen(user);
    }
    async function createAndOpenWorkspace(user,mode){
      if(!user || (mode!=='personal' && mode!=='company')) return {created:false,duplicate:false};
      var result=await supabaseClient
        .from(WORKSPACE_TABLE)
        .insert({user_id:user.id,account_type:mode});
      if(result.error){
        if(result.error.code==='23505') return {created:false,duplicate:true};
        throw result.error;
      }
      rememberWorkspaceLocally(user,mode);
      await finishOpen(user);
      return {created:true,duplicate:false};
    }
    function pendingSignupMode(){
      if(window.__atsrsOAuthSignupNeedsMode) return '';
      var pendingMode=''; try{pendingMode=localStorage.getItem('atsrs_pending_account_type')||'';}catch(e){}
      if(pendingMode!=='personal'&&pendingMode!=='company') pendingMode=authQueryValue('atsrs_mode');
      return (pendingMode==='personal'||pendingMode==='company')?pendingMode:'';
    }
    function returnToLogin(user,message){
      lockTerminalDecision(user,message);
      clearTransientAuth();
      ensureTerminalLoginState(message);
    }
    function showWorkspaceChoice(user,reason){
      currentUser=user;
      window.currentUser=user;
      clearTransientAuth();
      try{localStorage.setItem('atsrs_auth_mode','supabase');}catch(e){}
      if(typeof hideAuthBoxes==='function') hideAuthBoxes();
      var loginBox=byId('loginBox'); if(loginBox) loginBox.classList.remove('hidden');
      var authEl=byId('auth'); if(authEl) authEl.classList.remove('hidden');
      var appEl=byId('app'); if(appEl) appEl.classList.add('hidden');
      var msg=byId('loginMsg'); if(msg) msg.textContent='';
      if(typeof window.atsrsShowCompactChoice==='function') window.atsrsShowCompactChoice('signin-workspace');
      if(typeof window.atsrsFinishBoot==='function') window.atsrsFinishBoot();
      else{
        document.body.classList.remove('atsrs-session-pending');
        document.body.classList.remove('atsrs-booting');
      }
    }
    function showRecoveredSignupChoice(user){
      currentUser=user;
      window.currentUser=user;
      clearTransientAuth();
      try{localStorage.setItem('atsrs_auth_mode','supabase');}catch(e){}
      if(typeof hideAuthBoxes==='function') hideAuthBoxes();
      var loginBox=byId('loginBox'); if(loginBox) loginBox.classList.remove('hidden');
      var authEl=byId('auth'); if(authEl) authEl.classList.remove('hidden');
      var appEl=byId('app'); if(appEl) appEl.classList.add('hidden');
      var msg=byId('loginMsg');
      if(msg) msg.textContent='Google account verified. Choose the ATSRS account you want to create.';
      if(typeof window.atsrsShowCompactChoice==='function') window.atsrsShowCompactChoice('signup-recovery');
      if(typeof window.atsrsFinishBoot==='function') window.atsrsFinishBoot();
      else{
        document.body.classList.remove('atsrs-session-pending');
        document.body.classList.remove('atsrs-booting');
      }
    }
    async function handleSignUp(user,event){
      if(typeof window.atsrsHideCompactChoice==='function') window.atsrsHideCompactChoice();
      var pendingMode=pendingSignupMode();
      if(!pendingMode){
        if(window.__atsrsOAuthSignupNeedsMode){
          showRecoveredSignupChoice(user);
          return;
        }
        returnToLogin(user,'Sign Up could not be completed.\n\nPlease select Personal or Corporate and try again.');
        return;
      }
      try{
        var state=await readWorkspaceState(user);
        if(hasWorkspace(state,pendingMode)){
          returnToLogin(user,pendingMode==='personal'
            ? 'Personal account already exists. Please sign in.'
            : 'Corporate account already exists. Please sign in.');
          return;
        }
        var created=await createAndOpenWorkspace(user,pendingMode);
        if(created.duplicate){
          returnToLogin(user,pendingMode==='personal'
            ? 'Personal account already exists. Please sign in.'
            : 'Corporate account already exists. Please sign in.');
        }
      }catch(error){
        console.warn('ATSRS workspace Sign Up failed',error);
        returnToLogin(user,workspaceServiceMessage(error));
      }
    }
    async function handleSignIn(user,event){
      if(typeof window.atsrsHideCompactChoice==='function') window.atsrsHideCompactChoice();
      try{
        var state=await readWorkspaceState(user);
        var pHas=hasWorkspace(state,'personal'), cHas=hasWorkspace(state,'company');
        if(!pHas && !cHas){
          returnToLogin(user,'This Google account is not registered. Please Sign Up.');
          return;
        }
        if(pHas && !cHas){ await openExistingWorkspace(user,'personal',state); return; }
        if(cHas && !pHas){ await openExistingWorkspace(user,'company',state); return; }
        var pickRequired=false; try{pickRequired=localStorage.getItem('atsrs_workspace_pick_required')==='1';}catch(e){}
        if(pickRequired){ showWorkspaceChoice(user,event||'choose'); return; }
        var lastMode=readLastWorkspace(user);
        if(lastMode && hasWorkspace(state,lastMode)){ await openExistingWorkspace(user,lastMode,state); return; }
        showWorkspaceChoice(user,event||'choose');
      }catch(error){
        console.warn('ATSRS workspace Sign In failed',error);
        returnToLogin(user,workspaceServiceMessage(error));
      }
    }
    async function handlePassiveRestore(user,event){
      try{
        var state=await readWorkspaceState(user);
        var pHas=hasWorkspace(state,'personal'), cHas=hasWorkspace(state,'company');
        if(!pHas && !cHas) return false;
        if(pHas && !cHas) return await openExistingWorkspace(user,'personal',state);
        if(cHas && !pHas) return await openExistingWorkspace(user,'company',state);
        var lastMode=readLastWorkspace(user);
        if(lastMode && hasWorkspace(state,lastMode)) return await openExistingWorkspace(user,lastMode,state);
        var pickRequired=false; try{pickRequired=localStorage.getItem('atsrs_workspace_pick_required')==='1';}catch(e){}
        if(pickRequired){ showWorkspaceChoice(user,event||'restore'); return true; }
        showWorkspaceChoice(user,event||'restore');
        return true;
      }catch(error){
        console.warn('ATSRS passive workspace restore failed',error);
        return false;
      }
    }
    async function continueSession(session,event){
      if(!session || !session.user) return;
      var user=session.user;
      if(isTerminalLocked(user)){
        ensureTerminalLoginState(authDecision.message);
        return;
      }
      if(window.__atsrsSessionOpened && window.currentUser && window.currentUser.id===user.id) return;
      if(shouldWaitOnLoginScreen(event)) return;
      if(event==='signin-session'){ await handleSignIn(user,event); return true; }
      if(event==='resume') return handlePassiveRestore(user,event);
      var intent=currentAuthIntent();
      if(intent==='signup'){ await handleSignUp(user,event); return; }
      if(intent==='signin'){ await handleSignIn(user,event); return; }
      var authMode=''; try{authMode=localStorage.getItem('atsrs_auth_mode')||'';}catch(e){}
      if(authMode==='supabase') return handlePassiveRestore(user,event);
      return false;
    }
    function queueSession(session,event){
      if(window.__atsrsSuppressAutomaticSessionOpen &&
         (event==='INITIAL_SESSION'||event==='TOKEN_REFRESHED'||event==='getSession'||event==='resume'||
          (event==='SIGNED_IN'&&window.__atsrsEntryRoute!=='auth'))){
        return Promise.resolve(false);
      }
      if(window.__atsrsOAuthCallback && session && session.user){
        window.__atsrsOAuthSessionReceived=true;
      }
      var operation=function(){
        sessionQueue=sessionQueue
          .then(function(){return continueSession(session,event);})
          .catch(function(error){
            console.warn('ATSRS queued auth session failed',error);
            if(session && session.user) returnToLogin(session.user,workspaceServiceMessage(error));
          });
        return sessionQueue;
      };
      if(session&&session.user&&typeof window.atsrsSingleFlight==='function'){
        return window.atsrsSingleFlight('auth:continue-session:'+session.user.id,operation);
      }
      return operation();
    }
    window.atsrsOpenExistingWorkspace=async function(user,mode){
      try{
        var state=await readWorkspaceState(user);
        return await openExistingWorkspace(user,mode,state);
      }catch(error){
        console.warn('ATSRS workspace selection failed',error);
        returnToLogin(user,workspaceServiceMessage(error));
        return false;
      }
    };
    window.atsrsCompleteRecoveredSignup=async function(user,mode){
      if(!user || (mode!=='personal' && mode!=='company')) return false;
      try{
        var state=await readWorkspaceState(user);
        if(hasWorkspace(state,mode)){
          returnToLogin(user,mode==='personal'
            ? 'Personal account already exists. Please sign in.'
            : 'Corporate account already exists. Please sign in.');
          return false;
        }
        var created=await createAndOpenWorkspace(user,mode);
        if(created.duplicate){
          returnToLogin(user,mode==='personal'
            ? 'Personal account already exists. Please sign in.'
            : 'Corporate account already exists. Please sign in.');
          return false;
        }
        return true;
      }catch(error){
        console.warn('ATSRS recovered workspace Sign Up failed',error);
        returnToLogin(user,workspaceServiceMessage(error));
        return false;
      }
    };
    var workspaceSwitchPromise=null;
    var workspaceSwitchTarget='';
    function renderedWorkspaceMode(){
      try{
        if(document.body.classList.contains('company-mode'))return 'company';
        if(document.body.classList.contains('personal-mode'))return 'personal';
      }catch(e){}
      return '';
    }
    async function finishLocalWorkspaceConvergence(user,mode){
      saveLastWorkspace(user,mode);
      try{
        localStorage.removeItem('atsrs_workspace_pick_required');
        localStorage.setItem('atsrs_current_page','intro');
        localStorage.setItem('atsrs_auth_mode','supabase');
      }catch(e){}
      if(window.atsrsCloudData&&typeof window.atsrsCloudData.clearSession==='function'){
        window.atsrsCloudData.clearSession();
      }
      window.__atsrsSessionOpened=false;
      return await finishOpen(user);
    }
    window.atsrsSwitchWorkspace=function(mode){
      if(mode!=='personal' && mode!=='company') return false;
      var user=window.currentUser||currentUser;
      if(!user || !user.id) throw new Error('Your session has expired. Please sign in again.');
      workspaceSwitchTarget=mode;
      if(workspaceSwitchPromise){
        return workspaceSwitchPromise;
      }
      var current=''; try{current=localStorage.getItem('atsrs_use_mode')||'';}catch(e){}
      if(current===mode){
        if(renderedWorkspaceMode()!==mode){
          workspaceSwitchPromise=(async function(){
            if(window.atsrsCloudData&&typeof window.atsrsCloudData.flush==='function'){
              var saved=await window.atsrsCloudData.flush();
              if(saved===false||!window.atsrsCloudData.isSynced()){
                throw new Error('Your latest changes were not saved. Check the connection and try again.');
              }
            }
            return finishLocalWorkspaceConvergence(user,mode);
          })();
          workspaceSwitchPromise.finally(function(){
            workspaceSwitchPromise=null;
            workspaceSwitchTarget='';
          }).catch(function(){});
          return workspaceSwitchPromise;
        }
        workspaceSwitchTarget='';
        return Promise.resolve(true);
      }
      workspaceSwitchPromise=(async function(){
        try{
          var state=await readWorkspaceState(user);
          while(true){
            var desired=workspaceSwitchTarget;
            if(desired===current)return true;
            if(!hasWorkspace(state,desired)) throw new Error('This workspace is not available for your account.');
            if(window.atsrsCloudData&&typeof window.atsrsCloudData.flush==='function'){
              var saved=await window.atsrsCloudData.flush();
              if(saved===false||!window.atsrsCloudData.isSynced()){
                throw new Error('Your latest changes were not saved. Check the connection and try again.');
              }
            }
            /* A newer click that arrived while state/queue work was in flight
               wins before any workspace state is committed. */
            if(desired!==workspaceSwitchTarget)continue;
            applyAccountType(desired);
            saveLastWorkspace(user,desired);
            try{
              localStorage.removeItem('atsrs_workspace_pick_required');
              localStorage.setItem('atsrs_current_page','intro');
              localStorage.setItem('atsrs_auth_mode','supabase');
            }catch(e){}
            if(window.atsrsCloudData&&typeof window.atsrsCloudData.clearSession==='function'){
              window.atsrsCloudData.clearSession();
            }
            window.__atsrsSessionOpened=false;
            return await finishOpen(user);
          }
        }catch(error){
          applyAccountType(current);
          saveLastWorkspace(user,current);
          throw error;
        }
      })();
      workspaceSwitchPromise.finally(function(){
        workspaceSwitchPromise=null;
        workspaceSwitchTarget='';
      }).catch(function(){});
      return workspaceSwitchPromise;
    };
    try{
      if(window.__atsrsOAuthInvalidCallback){
        clearTransientAuth();
        ensureTerminalLoginState('This Google sign-in request expired or is no longer valid. Please start again.');
        try{
          var invalidSignOut=supabaseClient.auth.signOut({scope:'local'});
          if(invalidSignOut && typeof invalidSignOut.catch==='function'){
            invalidSignOut.catch(function(error){console.warn('ATSRS invalid callback cleanup failed',error);});
          }
        }catch(e){console.warn('ATSRS invalid callback cleanup failed',e);}
      }
      if(window.__atsrsOAuthError){
        var callbackMessage=window.__atsrsOAuthError==='access_denied'
          ? 'Google sign-in was cancelled. Please try again when you are ready.'
          : 'Google sign-in could not be completed. Please try again.';
        clearTransientAuth();
        ensureTerminalLoginState(callbackMessage);
      }
      supabaseClient.auth.onAuthStateChange(function(event,session){
        if(event==='PASSWORD_RECOVERY'){
          if(typeof hideAuthBoxes==='function') hideAuthBoxes();
          var box=byId('newPasswordBox'); if(box) box.classList.remove('hidden');
          return;
        }
        if(session && session.user && (event==='SIGNED_IN' || event==='TOKEN_REFRESHED' || event==='INITIAL_SESSION')){
          queueSession(session,event);
        }
      });
      if(window.__atsrsOAuthCallback && window.__atsrsOAuthCode){
        /* For ATSRS Google callbacks, perform the PKCE exchange explicitly.
           This avoids depending on timing between automatic URL detection,
           INITIAL_SESSION and getSession() on mobile/tablet browsers. */
        supabaseClient.auth.exchangeCodeForSession(window.__atsrsOAuthCode)
          .then(function(result){
            if(result && result.error) throw result.error;
            var session=result && result.data && result.data.session;
            if(session && session.user){
              if(!window.__atsrsOAuthSessionReceived) return queueSession(session,'oauth-exchange');
              return;
            }
            var recoveryRequest=typeof window.atsrsGetSessionSingleFlight==='function'
              ?window.atsrsGetSessionSingleFlight(supabaseClient)
              :supabaseClient.auth.getSession();
            return recoveryRequest.then(function(r){
              var recovered=r && r.data && r.data.session;
              if(recovered && recovered.user) return queueSession(recovered,'oauth-exchange-recovery');
              throw new Error('Supabase did not return a Google session.');
            });
          })
          .catch(function(error){
            if(window.__atsrsOAuthSessionReceived || !window.__atsrsOAuthCallback) return;
            console.warn('ATSRS Google PKCE exchange failed',error);
            clearTransientAuth();
            ensureTerminalLoginState('Google sign-in could not be completed. Please try again.');
          });
      }else{
        var initialSessionRequest=typeof window.atsrsGetSessionSingleFlight==='function'
          ?window.atsrsGetSessionSingleFlight(supabaseClient)
          :supabaseClient.auth.getSession();
        initialSessionRequest.then(function(r){
          var session=r && r.data && r.data.session;
          if(session && session.user) queueSession(session,'getSession');
        });
      }
      window.atsrsResumeSession=function(session,intent){
        if(session && session.user){
          if(window.__atsrsSessionOpened&&window.currentUser&&window.currentUser.id===session.user.id){
            return Promise.resolve(true);
          }
          window.__atsrsSessionOpened=false;
          return queueSession(session,intent==='signin'?'signin-session':'resume');
        }
        return Promise.resolve(false);
      };
    }catch(e){console.warn('ATSRS auth restore failed',e);}
  }
  window.atsrsCoreAuth={
    build:AUTH_BUILD,
    register:realRegister,
    login:realLogin,
    forgotPassword:realForgotPassword,
    updatePassword:realUpdatePassword,
    logout:realLogout,
    restoreSession:restoreSession,
    applyAccountType:applyAccountType,
    selectedAccountType:selectedAccountType,
    client:supabaseClient
  };
  window.register=realRegister;
  window.login=realLogin;
  window.forgotPassword=realForgotPassword;
  window.updatePassword=realUpdatePassword;
  window.atsrsLogout=realLogout;
  window.atsrsExit=realLogout;
  window.logout=realLogout;
  window.confirmLogout=function(){
    if(confirm('Are you sure you want to logout?')) realLogout();
  };
  window.supabaseClient=supabaseClient;
  restoreSession();
})();

/* ===== ATSRS V181 Auth Debug V1 - detailed Failed to fetch diagnostics ===== */
(function(){
  'use strict';
  function byId(id){return document.getElementById(id);}
  function val(id){var el=byId(id); return el ? (el.value||'').trim() : '';}
  function setMsg(id,msg){var el=byId(id); if(el){el.style.whiteSpace='pre-line'; el.textContent=msg||'';}}
  function mode(){
    var p=byId('personalModeBtn'), c=byId('companyModeBtn'), m='';
    if(p && p.classList.contains('active')) m='personal';
    if(c && c.classList.contains('active')) m='company';
    try{if(!m)m=localStorage.getItem('atsrs_use_mode')||'';}catch(e){}
    return (m==='personal'||m==='company')?m:'';
  }
  function redirectUrl(){
    try{return (window.location.origin || 'https://atsrs.com') + (window.location.pathname || '/');}
    catch(e){return 'https://atsrs.com/';}
  }
  function errText(e){
    if(!e) return 'Unknown error';
    return [e.name,e.message].filter(Boolean).join(': ') || String(e);
  }
  async function directFetchTest(){
    var url=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'') + '/auth/v1/settings';
    if(!url || url.indexOf('http')!==0) return {ok:false, status:'NO_URL', detail:'SUPABASE_URL missing'};
    try{
      var r=await fetch(url,{method:'GET',headers:{apikey:(typeof SUPABASE_KEY!=='undefined'?SUPABASE_KEY:''),Authorization:'Bearer '+(typeof SUPABASE_KEY!=='undefined'?SUPABASE_KEY:'')}});
      var text='';
      try{text=await r.text();}catch(_e){}
      return {ok:r.ok,status:r.status,detail:text.slice(0,180)};
    }catch(e){
      return {ok:false,status:'FETCH_FAILED',detail:errText(e)};
    }
  }
  function buildDebug(error,fetchResult){
    console.warn('ATSRS account request diagnostics',error,fetchResult);
    return atsrsFriendlyAuthError(error,'Account could not be created. Check your connection and try again.');
  }
  async function debugRegister(){
    var email=val('regEmail').toLowerCase();
    var password=val('regPassword');
    var password2=val('regPassword2');
    var m=mode();
    setMsg('regMsg','');
    if(!m){setMsg('regMsg','Select Personal or Corporate before creating your ATSRS account.');return false;}
    if(!email || !password || !password2){setMsg('regMsg','Fill all required fields.');return false;}
    if(password.length<6){setMsg('regMsg','Password must be at least 6 characters.');return false;}
    if(password!==password2){setMsg('regMsg','Passwords do not match.');return false;}
    if(!window.supabaseClient || !window.supabaseClient.auth){
      var ft=await directFetchTest();
      setMsg('regMsg',buildDebug(new Error('Supabase library/client did not load'),ft));
      return false;
    }
    var btn=byId('registerBtn'), old=btn?btn.textContent:'';
    try{
      if(btn){btn.disabled=true;btn.textContent='Creating account...';}
      setMsg('regMsg','Creating account...');
      var res=await window.supabaseClient.auth.signUp({
        email:email,
        password:password,
        options:{
          emailRedirectTo:redirectUrl(),
          data:{account_type:m,atsrs_account_type:m,use_mode:m,source:'atsrs-web',app:'ATSRS'}
        }
      });
      if(res.error){setMsg('regMsg',atsrsFriendlyAuthError(res.error,'Account could not be created. Please try again.'));return false;}
      try{localStorage.setItem('atsrs_pending_email',email);localStorage.setItem('atsrs_use_mode',m);}catch(_e){}
      setMsg('regMsg',(res.data && res.data.session)?'Account created. You can now continue.':'Account created. Confirmation email sent. Check inbox/spam.');
      return true;
    }catch(e){
      var fetchResult=await directFetchTest();
      setMsg('regMsg',buildDebug(e,fetchResult));
      return false;
    }finally{
      if(btn){btn.disabled=false;if(old)btn.textContent=old;}
    }
  }
  function bind(){
    if(window.atsrsCoreAuth) window.atsrsCoreAuth.register=debugRegister;
    window.register=debugRegister;
    var b=byId('registerBtn');
    if(b && !b.dataset.v181AuthDebug){
      b.dataset.v181AuthDebug='1';
      b.onclick=function(e){if(e)e.preventDefault();return debugRegister();};
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind); else bind();
  window.addEventListener('load',bind);
  [150,500,1000,2000].forEach(function(ms){setTimeout(bind,ms);});
  window.atsrsAuthDebugRegister=debugRegister;
})();


/* ===== ATSRS V200 Classic Google OAuth Workspace Flow ===== */
(function(){
  'use strict';
  function byId(id){return document.getElementById(id);}
  function setLoginMsg(msg){
    var el=byId('loginMsg');
    if(el){el.style.whiteSpace='pre-line'; el.textContent=msg||'';}
  }
  function redirectUrl(intent,mode,attemptId){
    try{
      if(typeof window.atsrsNativeOAuthRedirectUrl==='function'){
        return window.atsrsNativeOAuthRedirectUrl(intent,mode,attemptId);
      }
      /* Always return to the canonical SPA root. Mobile browsers can expose
         a transient path when switching between tab, desktop and installed
         display modes; carrying that path into OAuth makes the callback
         dependent on the display mode used to start the flow. */
      var url=new URL('/',window.location.origin || 'https://atsrs.com');
      if(intent==='signin'||intent==='signup') url.searchParams.set('atsrs_intent',intent);
      if(intent==='signup'&&(mode==='personal'||mode==='company')) url.searchParams.set('atsrs_mode',mode);
      if(attemptId) url.searchParams.set('atsrs_attempt',attemptId);
      return url.toString();
    }
    catch(e){return 'https://atsrs.com/';}
  }
  function hideAuthBoxesSafe(){
    if(typeof hideAuthBoxes==='function'){hideAuthBoxes();return;}
    ['loginBox','registerBox','forgotBox','newPasswordBox'].forEach(function(id){
      var el=byId(id); if(el) el.classList.add('hidden');
    });
  }
  function applyMode(mode){
    if(typeof setUseMode==='function') setUseMode(mode);
    else {
      try{localStorage.setItem('atsrs_use_mode',mode);}catch(e){}
      try{useMode=mode;}catch(e){}
    }
    try{
      var p=byId('personalModeBtn'), c=byId('companyModeBtn');
      if(p) p.classList.toggle('active',mode==='personal');
      if(c) c.classList.toggle('active',mode==='company');
      document.body.classList.toggle('personal-mode',mode==='personal');
      document.body.classList.toggle('company-mode',mode==='company');
    }catch(e){}
  }
  window.__atsrsAccountTypeChoiceContext='';
  function hideCompactChoice(){
    window.__atsrsAccountTypeChoiceContext='';
    var choice=byId('googleChoiceArea');
    if(choice) choice.classList.add('hidden');
    var p=byId('personalModeBtn'), c=byId('companyModeBtn');
    if(p) p.classList.remove('active');
    if(c) c.classList.remove('active');
    var modeBox=byId('modeChoiceBox'); if(modeBox) modeBox.classList.remove('mode-error');
  }
  window.atsrsHideCompactChoice=hideCompactChoice;
  window.atsrsShowCompactChoice=function(context){
    window.__atsrsAccountTypeChoiceContext=context||'';
    var choice=byId('googleChoiceArea');
    if(choice) choice.classList.remove('hidden');
  };
  function bindCompactChoiceButtons(){
    var p=byId('personalModeBtn'), c=byId('companyModeBtn');
    if(p && p.dataset.atsrsChoiceBound!=='1'){
      p.dataset.atsrsChoiceBound='1';
      p.removeAttribute('onclick');
      p.addEventListener('click',function(ev){
        if(ev){ev.preventDefault();ev.stopPropagation();}
        window.atsrsHandleAccountTypeChoice('personal');
      });
    }
    if(c && c.dataset.atsrsChoiceBound!=='1'){
      c.dataset.atsrsChoiceBound='1';
      c.removeAttribute('onclick');
      c.addEventListener('click',function(ev){
        if(ev){ev.preventDefault();ev.stopPropagation();}
        window.atsrsHandleAccountTypeChoice('company');
      });
    }
  }
  function clearOAuthStartState(){
    try{localStorage.setItem('atsrs_google_intent','');}catch(e){}
    try{localStorage.removeItem('atsrs_pending_account_type');}catch(e){}
    try{localStorage.removeItem('atsrs_oauth_attempt');}catch(e){}
    try{sessionStorage.removeItem('atsrs_oauth_attempt');}catch(e){}
  }
  function createOAuthAttemptId(){
    try{
      if(window.crypto && typeof window.crypto.randomUUID==='function') return window.crypto.randomUUID();
      if(window.crypto && typeof window.crypto.getRandomValues==='function'){
        var values=new Uint32Array(4);
        window.crypto.getRandomValues(values);
        return Array.prototype.map.call(values,function(value){return value.toString(16).padStart(8,'0');}).join('');
      }
    }catch(e){}
    throw new Error('Secure browser storage is not available. Please enable cookies/site data and try again.');
  }
  var googleAuthStarting=false;
  function authWithTimeout(promise,delay,message){
    return Promise.race([
      promise,
      new Promise(function(_,reject){
        setTimeout(function(){reject(new Error(message||'The sign-in service did not respond. Please try again.'));},delay);
      })
    ]);
  }
  function setGoogleAuthBusy(busy){
    ['googleSigninBtn','googleSignupBtn'].forEach(function(id){
      var button=byId(id);
      if(!button)return;
      button.disabled=!!busy;
      button.setAttribute('aria-busy',busy?'true':'false');
    });
  }
  async function startGoogle(ev,intent){
    if(ev && ev.preventDefault) ev.preventDefault();
    if(googleAuthStarting)return;
    if(typeof window.atsrsResetAuthDecision==='function') window.atsrsResetAuthDecision();
    if(!window.supabaseClient || !window.supabaseClient.auth){
      setLoginMsg('Google sign-in is not ready. Supabase client did not load.');
      return;
    }
    googleAuthStarting=true;
    setGoogleAuthBusy(true);
    setLoginMsg('');
    try{
      if(intent==='signin'){
        try{localStorage.setItem('atsrs_workspace_pick_required','1');}catch(e){}
      }
      var pendingMode='';
      try{pendingMode=localStorage.getItem('atsrs_pending_account_type')||'';}catch(e){}
      if(intent==='signup' && pendingMode!=='personal' && pendingMode!=='company'){
        throw new Error('Please select Personal or Corporate and try again.');
      }
      /* A local getSession() can wait behind a stale browser auth lock after
         logout. Sign-in must always be able to start a fresh Google redirect,
         so only account creation needs to inspect/sign out an existing session. */
      var existingSession=null;
      if(intent==='signup'){
        var sessionResult=await authWithTimeout(
          window.supabaseClient.auth.getSession(),
          8000,
          'The current browser session could not be checked. Please try again.'
        );
        if(sessionResult && sessionResult.error) throw sessionResult.error;
        existingSession=sessionResult&&sessionResult.data&&sessionResult.data.session;
      }
      if(existingSession && intent==='signup'){
        var signOutResult=await authWithTimeout(
          window.supabaseClient.auth.signOut({scope:'local'}),
          8000,
          'The previous browser session could not be closed. Please refresh and try again.'
        );
        if(signOutResult && signOutResult.error) throw signOutResult.error;
      }
      var attemptId=createOAuthAttemptId();
      var attemptRecord={
        id:attemptId,
        intent:intent||'signin',
        mode:intent==='signup'?pendingMode:'',
        startedAt:Date.now()
      };
      localStorage.setItem('atsrs_google_intent',intent||'signin');
      localStorage.setItem('atsrs_oauth_attempt',JSON.stringify(attemptRecord));
      try{sessionStorage.setItem('atsrs_oauth_attempt',JSON.stringify(attemptRecord));}catch(e){}
      var savedAttempt=null;
      var savedSessionAttempt=null;
      try{savedAttempt=JSON.parse(localStorage.getItem('atsrs_oauth_attempt')||'null');}catch(e){}
      try{savedSessionAttempt=JSON.parse(sessionStorage.getItem('atsrs_oauth_attempt')||'null');}catch(e){}
      var storedCorrectly=(savedAttempt && savedAttempt.id===attemptId && savedAttempt.intent===attemptRecord.intent)
        || (savedSessionAttempt && savedSessionAttempt.id===attemptId && savedSessionAttempt.intent===attemptRecord.intent);
      if(!storedCorrectly){
        throw new Error('Browser site data could not be saved. Please enable cookies/site data and try again.');
      }
      /* An explicit Google auth action must let the user choose the identity.
         login_hint suppresses Google's account chooser and can reopen the
         last ATSRS identity immediately after Logout. */
      var googleQueryParams={prompt:'select_account'};
      var oauthOptions={
        redirectTo:redirectUrl(intent,pendingMode,attemptId),
        queryParams:googleQueryParams,
        skipBrowserRedirect:true
      };
      var res=await authWithTimeout(
        window.supabaseClient.auth.signInWithOAuth({
          provider:'google',
          options:oauthOptions
        }),
        12000,
        'Google sign-in did not respond. Check your connection and try again.'
      );
      if(res && res.error){
        clearOAuthStartState();
        setLoginMsg(atsrsFriendlyAuthError(res.error,'Google sign-in failed. Please try again.'));
        return;
      }
      var oauthUrl=res&&res.data&&res.data.url;
      if(!oauthUrl) throw new Error('Google sign-in did not return a secure redirect. Please try again.');
      if(typeof window.atsrsNativeOpenOAuth==='function'){
        await window.atsrsNativeOpenOAuth(oauthUrl);
      }else{
        window.location.assign(oauthUrl);
      }
    }catch(e){
      clearOAuthStartState();
      setLoginMsg(atsrsFriendlyAuthError(e,'Google sign-in failed. Please try again.'));
    }finally{
      googleAuthStarting=false;
      setGoogleAuthBusy(false);
    }
  }
  window.atsrsHandleAccountTypeChoice=async function(mode){
    if(mode!=='personal' && mode!=='company') return;
    var ctx=window.__atsrsAccountTypeChoiceContext||'';
    applyMode(mode);
    if(ctx==='signup'){
      try{localStorage.setItem('atsrs_pending_account_type',mode);}catch(e){}
      hideCompactChoice();
      return startGoogle(null,'signup');
    }
    if(ctx==='signin-workspace'){
      hideCompactChoice();
      var user=null;
      try{
        if(typeof currentUser!=='undefined' && currentUser) user=currentUser;
        if(!user){
          var r=await window.supabaseClient.auth.getSession();
          user=r && r.data && r.data.session && r.data.session.user;
        }
      }catch(e){}
      if(!user){setLoginMsg('Google session not found. Please sign in again.');return;}
      if(typeof window.atsrsOpenExistingWorkspace==='function'){
        if(!await window.atsrsOpenExistingWorkspace(user,mode)){
          var currentMessage=byId('loginMsg');
          if(!currentMessage || !currentMessage.textContent){
            setLoginMsg('This workspace is not available for your account.');
          }
        }
        return;
      }
      setLoginMsg('Google session not found. Please sign in again.');
    }
    if(ctx==='signup-recovery'){
      hideCompactChoice();
      var recoveredUser=null;
      try{
        if(typeof currentUser!=='undefined' && currentUser) recoveredUser=currentUser;
        if(!recoveredUser){
          var recoveredSession=await window.supabaseClient.auth.getSession();
          recoveredUser=recoveredSession && recoveredSession.data && recoveredSession.data.session
            && recoveredSession.data.session.user;
        }
      }catch(e){}
      if(!recoveredUser){setLoginMsg('Google session not found. Please sign in again.');return;}
      if(typeof window.atsrsCompleteRecoveredSignup==='function'){
        await window.atsrsCompleteRecoveredSignup(recoveredUser,mode);
        return;
      }
      setLoginMsg('Account setup could not be completed. Please refresh and try again.');
    }
  };
  window.atsrsGoogleSignIn=function(e){
    if(e && e.preventDefault)e.preventDefault();
    if(typeof window.atsrsResetAuthDecision==='function') window.atsrsResetAuthDecision();
    setLoginMsg('');
    hideCompactChoice();
    return startGoogle(e,'signin');
  };
  window.atsrsPrepareSignUpChoice=function(e){
    if(e && e.preventDefault)e.preventDefault();
    if(typeof window.atsrsResetAuthDecision==='function') window.atsrsResetAuthDecision();
    setLoginMsg('');
    hideCompactChoice();
    window.atsrsShowCompactChoice('signup');
  };
  window.atsrsGoogleSignUp=window.atsrsPrepareSignUpChoice;
  window.atsrsBackToLogin=function(){
    hideAuthBoxesSafe();
    hideCompactChoice();
    setLoginMsg('');
    try{localStorage.setItem('atsrs_google_intent','');}catch(e){}
    try{localStorage.removeItem('atsrs_pending_account_type');}catch(e){}
    var box=byId('loginBox'); if(box) box.classList.remove('hidden');
  };
  bindCompactChoiceButtons();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bindCompactChoiceButtons);
  window.addEventListener('load',bindCompactChoiceButtons);
  [0,400,1200].forEach(function(ms){setTimeout(bindCompactChoiceButtons,ms);});
})();
