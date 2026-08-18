/* ATSRS AI CV Generator. Uploaded CV content is processed only after explicit consent. */
(function(){
  'use strict';

  var CONSENT_VERSION='2026-07-26';
  var GENERATION_TIMEOUT_MS=65000;
  var lastCv=null;
  var generating=false;
  var enhancementUploadPending=false;
  var uploadedCv={available:false,name:'',size:0};
  var CV_TEMPLATES=['classic','graphite','compact'];

  function byId(id){return document.getElementById(id)}
  function safe(value){
    return String(value==null?'':value).replace(/[&<>"']/g,function(char){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char];
    });
  }
  function currentMode(){
    try{return localStorage.getItem('atsrs_use_mode')||window.useMode||'personal'}catch(error){return 'personal'}
  }
  function profile(){
    try{
      var key=typeof window.localKey==='function'?window.localKey('profile'):'';
      var raw=key&&window.atsrsCloudData&&window.atsrsCloudData.isManagedKey(key)
        ?window.atsrsCloudData.read(key)
        :key?localStorage.getItem(key):'';
      return raw?JSON.parse(raw):{};
    }catch(error){return {}}
  }
  function storedCv(){
    try{
      var values=typeof window.getData==='function'?window.getData('generatedCv'):[];
      return Array.isArray(values)&&values.length?values[0]:null;
    }catch(error){return null}
  }
  function saveCv(value){
    if(typeof window.saveData==='function')window.saveData('generatedCv',value?[value]:[]);
  }
  function setStatus(message,type){
    var element=byId('cvGeneratorStatus');
    if(!element)return;
    element.textContent=message||'';
    element.className='cv-generator-status'+(type?' is-'+type:'');
  }
  function setCardStatus(message,type){
    var element=byId('cvEnhancementStatus');
    if(!element)return;
    element.textContent=message||'';
    element.className='cv-generator-status'+(type?' is-'+type:'');
  }
  function pageCvState(){
    var badge=byId('cvStatusBadge');
    var available=!!(badge&&badge.classList&&badge.classList.contains('badge-ready'));
    var info=byId('cvFileInfo');
    var name='';
    if(available&&info&&typeof info.querySelector==='function'){
      var label=info.querySelector('.atsrs-v156-main-name b');
      name=label&&String(label.textContent||label.getAttribute&&label.getAttribute('title')||'')||'';
    }
    return {available:available,name:name};
  }
  function setGenerating(value){
    generating=!!value;
    var regenerate=byId('regenerateCvBtn');
    var cardButton=byId('generateCVBtn');
    if(regenerate){regenerate.disabled=generating;regenerate.textContent=generating?'Generating new version...':'Generate again'}
    if(cardButton){cardButton.disabled=generating;updateCard()}
  }
  function openModal(showPreview){
    if(currentMode()!=='personal'){
      alert('AI CV Generator is available for Personal Accounts.');
      return;
    }
    var modal=byId('cvGeneratorModal');
    if(!modal)return;
    var saved=storedCv();
    if(saved&&!lastCv)lastCv=saved;
    if(!showPreview||!lastCv)return;
    modal.classList.remove('hidden');
    document.body.style.overflow='hidden';
    showCvPreview(lastCv);
  }
  function beginEnhancement(){
    if(currentMode()!=='personal'){
      alert('AI CV Generator is available for Personal Accounts.');
      return;
    }
    var input=byId('cvUploadInput');
    if(!input){setStatus('The CV upload control is unavailable.','error');return}
    enhancementUploadPending=true;
    input.value='';
    input.click();
  }
  function uploadedForEnhancement(event){
    var detail=event&&event.detail||{};
    enhancementUploadPending=false;
    uploadedCv={available:true,name:String(detail.name||uploadedCv.name||'Main CV'),size:Number(detail.size||uploadedCv.size||0)};
    var consent=byId('cvEnhancementConsent');
    if(consent)consent.checked=false;
    updateCard();
    setCardStatus((uploadedCv.name||'CV')+' uploaded. You can now enhance it with AI.','success');
  }
  function cvStateChanged(event){
    var detail=event&&event.detail||{};
    uploadedCv={available:!!detail.available,name:String(detail.name||''),size:Number(detail.size||0)};
    updateCard();
    if(!uploadedCv.available){
      var consent=byId('cvEnhancementConsent');
      if(consent)consent.checked=false;
      setCardStatus('');
    }
  }
  function closeModal(){
    var modal=byId('cvGeneratorModal');
    if(modal)modal.classList.add('hidden');
    document.body.style.overflow='';
    setStatus('');
  }
  function cleanList(values){
    return (Array.isArray(values)?values:[]).map(function(value){return String(value||'').trim()}).filter(Boolean);
  }
  function entryHtml(entry,type){
    entry=entry||{};
    var title=type==='education'?(entry.qualification||entry.program):(entry.role||entry.position);
    var organization=type==='education'?entry.institution:entry.employer;
    var dates=[entry.start_date,entry.end_date].filter(Boolean).join(' – ');
    var details=cleanList(entry.highlights);
    return '<div class="cv-entry">'+
      '<div class="cv-entry-head"><span>'+safe(title||organization||'Career entry')+'</span><span>'+safe(dates)+'</span></div>'+
      '<div class="cv-entry-sub">'+safe([organization,entry.location].filter(Boolean).join(' · '))+'</div>'+
      (details.length?'<ul>'+details.map(function(item){return '<li>'+safe(item)+'</li>'}).join('')+'</ul>':'')+
    '</div>';
  }
  function section(title,content){
    return content?'<section><h2>'+safe(title)+'</h2>'+content+'</section>':'';
  }
  function cvHtml(cv){
    cv=cv||{};
    var contact=cv.contact||{};
    var contactItems=[contact.email,contact.phone,contact.whatsapp,contact.location,contact.country].filter(Boolean);
    var skills=cleanList(cv.core_skills);
    var experience=Array.isArray(cv.experience)?cv.experience:[];
    var education=Array.isArray(cv.education)?cv.education:[];
    var certifications=Array.isArray(cv.certifications)?cv.certifications:[];
    var certHtml=certifications.map(function(item){
      var dates=[item.issue_date&&('Issued '+item.issue_date),item.expiry_date&&('Expires '+item.expiry_date)].filter(Boolean).join(' · ');
      return '<div class="cv-entry"><div class="cv-entry-head"><span>'+safe(item.name||'Document')+'</span><span>'+safe(dates)+'</span></div>'+
        '<div class="cv-entry-sub">'+safe(item.issuer||'')+'</div></div>';
    }).join('');
    return '<header><h1>'+safe(cv.full_name||'ATSRS Profile')+'</h1>'+
      '<div class="cv-headline">'+safe(cv.headline||'')+'</div>'+
      '<div class="cv-contact">'+contactItems.map(function(item){return '<span>'+safe(item)+'</span>'}).join('')+'</div></header>'+
      section('Professional Summary',cv.professional_summary?'<p>'+safe(cv.professional_summary)+'</p>':'')+
      section('Core Skills',skills.length?'<div class="cv-skills">'+skills.map(function(item){return '<span class="cv-skill">'+safe(item)+'</span>'}).join('')+'</div>':'')+
      section('Employment History',experience.map(function(item){return entryHtml(item,'experience')}).join(''))+
      section('Education',education.map(function(item){return entryHtml(item,'education')}).join(''))+
      section('Certificates & Documents',certHtml);
  }
  function showCvPreview(cv){
    lastCv=cv;
    var preview=byId('cvGeneratorPreview'),documentBox=byId('cvGeneratorPreviewDocument');
    if(preview)preview.classList.remove('hidden');
    if(documentBox){documentBox.className='cv-preview-document cv-template-'+templateName(cv.generation_variant_index);documentBox.innerHTML=cvHtml(cv)}
    updateCard();
  }
  function updateCard(){
    var saved=storedCv();
    var pageState=pageCvState();
    if(pageState.available)uploadedCv={available:true,name:pageState.name||uploadedCv.name,size:uploadedCv.size};
    var hasUpload=uploadedCv.available;
    var actions=byId('generatedCvActions');
    if(actions)actions.classList.toggle('hidden',!saved);
    var badge=byId('cvBetaBadge');
    if(badge)badge.textContent=saved?'AI CV READY':(hasUpload?'CV READY FOR AI':'AI CV GENERATOR');
    var title=byId('cvBetaTitle');
    if(title)title.textContent=hasUpload?'Enhance your uploaded CV':'Generate ATSRS Profile CV';
    var text=byId('cvBetaText');
    if(text)text.textContent=hasUpload
      ?(uploadedCv.name?uploadedCv.name+' is uploaded. ATSRS AI can now improve its structure, wording and ATS readability.':'Your Main CV is uploaded. ATSRS AI can now improve its structure, wording and ATS readability.')
      :'Turn your saved profile details, career history and document register into a structured CV.';
    var consentWrap=byId('cvEnhancementConsentWrap');
    if(consentWrap)consentWrap.classList.toggle('hidden',!hasUpload);
    var button=byId('generateCVBtn');
    if(button)button.textContent=generating?'Generating CV...':'Generate CV';
    var uploadButton=byId('uploadCvFromGeneratorBtn');
    if(uploadButton)uploadButton.textContent=hasUpload?'Upload / Replace CV':'Upload CV to enhance';
  }
  function variationIndex(){
    var previous=lastCv||storedCv()||{};
    var index=Number(previous.generation_variant_index);
    return Number.isInteger(index)?(index+1)%CV_TEMPLATES.length:0;
  }
  function templateName(index){return CV_TEMPLATES[Math.max(0,Number(index)||0)%CV_TEMPLATES.length]}
  function previousCvReference(){
    var previous=lastCv||storedCv();
    if(!previous)return'';
    try{return JSON.stringify({headline:previous.headline||'',professional_summary:previous.professional_summary||'',core_skills:previous.core_skills||[],experience:previous.experience||[],education:previous.education||[]}).slice(0,12000)}catch(error){return''}
  }
  function requestBody(options){
    var stored=profile();
    return {
      target_role:String(stored.position||'').trim(),
      language:'English',
      enhance_existing:true,
      consent_accepted:!!((byId('cvEnhancementConsent')&&byId('cvEnhancementConsent').checked)||(options&&options.regeneration&&storedCv())),
      consent_version:CONSENT_VERSION,
      variation_index:variationIndex(),
      previous_cv:options&&options.regeneration?previousCvReference():''
    };
  }
  async function errorMessage(error){
    var fallback='Your CV could not be generated. Please try again.';
    try{
      var response=error&&error.context;
      if(response&&typeof response.clone==='function')response=response.clone();
      if(response&&typeof response.json==='function'){
        var details=await response.json();
        return details&&details.error||details&&details.message||fallback;
      }
    }catch(ignore){}
    return error&&error.message||fallback;
  }
  async function generate(options){
    if(generating)return;
    var fromPreview=!!(options&&options.fromPreview);
    var report=fromPreview?setStatus:setCardStatus;
    var body=requestBody(options);
    if(!body.consent_accepted){
      report('Confirm the AI processing notice before generating your CV.','error');
      return;
    }
    var client=window.supabaseClient;
    if(!client||!client.functions){
      report('The ATSRS AI service is unavailable. Sign in and try again.','error');
      return;
    }
    setGenerating(true);
    report(fromPreview?'Creating a fresh version from your uploaded CV...':'Reading and improving your uploaded CV...');
    try{
      var sessionResult=await client.auth.getSession();
      var session=sessionResult&&sessionResult.data&&sessionResult.data.session;
      if(!session)throw new Error('Your session has expired. Please sign in again.');
      var requestAbort=new AbortController();
      var requestTimeout=setTimeout(function(){requestAbort.abort()},GENERATION_TIMEOUT_MS);
      var result;
      try{
        result=await client.functions.invoke('generate-cv',{
          body:body,
          headers:{Authorization:'Bearer '+session.access_token},
          signal:requestAbort.signal
        });
      }finally{
        clearTimeout(requestTimeout);
      }
      if(result.error)throw result.error;
      if(!result.data||!result.data.cv)throw new Error(result.data&&result.data.error||'The AI service returned no CV.');
      lastCv=Object.assign({},result.data.cv,{
        generated_at:new Date().toISOString(),
        generation_model:result.data.model||'',
        consent_version:CONSENT_VERSION,
        generation_variant_index:Number.isInteger(Number(result.data.variation_index))?Number(result.data.variation_index):body.variation_index,
        generation_template:templateName(Number.isInteger(Number(result.data.variation_index))?Number(result.data.variation_index):body.variation_index)
      });
      saveCv(lastCv);
      if(window.atsrsCloudData&&typeof window.atsrsCloudData.flush==='function')await window.atsrsCloudData.flush();
      report(fromPreview?'A fresh CV version has been generated and saved.':'Your uploaded CV has been enhanced and saved.','success');
      openModal(true);
    }catch(error){
      console.error('ATSRS CV generation failed',error);
      report(await errorMessage(error),'error');
    }finally{
      setGenerating(false);
    }
  }
  function primaryAction(){
    var pageState=pageCvState();
    if(pageState.available)uploadedCv={available:true,name:pageState.name||uploadedCv.name,size:uploadedCv.size};
    if(!uploadedCv.available){setCardStatus('Upload a CV before generating an AI version.','error');return}
    var consent=byId('cvEnhancementConsent');
    if(!consent||!consent.checked){
      setCardStatus('Confirm the AI processing notice before enhancing your uploaded CV.','error');
      return;
    }
    return generate({regeneration:!!storedCv()});
  }
  function regenerateCv(){
    var pageState=pageCvState();
    if(pageState.available)uploadedCv={available:true,name:pageState.name||uploadedCv.name,size:uploadedCv.size};
    if(!uploadedCv.available){setStatus('The uploaded CV is no longer available. Upload it again.','error');return}
    return generate({fromPreview:true,regeneration:true});
  }
  function printCv(){
    var cv=lastCv||storedCv();
    if(!cv){alert('Generate a CV first.');return}
    lastCv=cv;
    var modal=byId('cvGeneratorModal');
    if(modal&&modal.classList.contains('hidden'))openModal(true);
    document.body.classList.add('atsrs-printing-cv');
    setTimeout(function(){
      window.print();
      setTimeout(function(){document.body.classList.remove('atsrs-printing-cv')},300);
    },60);
  }
  function bind(){
    var pairs=[
      ['generateCVBtn',primaryAction],
      ['uploadCvFromGeneratorBtn',beginEnhancement],
      ['closeCvGeneratorBtn',closeModal],
      ['regenerateCvBtn',regenerateCv],
      ['previewGeneratedCvBtn',function(){openModal(true)}],
      ['printGeneratedCvBtn',printCv],
      ['savePdfCvBtn',printCv]
    ];
    pairs.forEach(function(pair){var element=byId(pair[0]);if(element)element.addEventListener('click',pair[1])});
    var modal=byId('cvGeneratorModal');
    if(modal)modal.addEventListener('click',function(event){if(event.target===modal)closeModal()});
    document.addEventListener('keydown',function(event){if(event.key==='Escape'&&modal&&!modal.classList.contains('hidden'))closeModal()});
    updateCard();
  }
  window.atsrsCvGenerator={open:openModal,enhance:beginEnhancement,uploaded:uploadedForEnhancement,print:printCv,refresh:updateCard};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);
  else bind();
  window.addEventListener('atsrs:data-hydrated',updateCard);
  window.addEventListener('atsrs:resume',updateCard);
  document.addEventListener('atsrs:cv-uploaded',uploadedForEnhancement);
  document.addEventListener('atsrs:cv-state',cvStateChanged);
})();
