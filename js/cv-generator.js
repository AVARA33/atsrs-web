/* ATSRS AI CV Generator. Profile and document metadata only; uploaded files are never sent. */
(function(){
  'use strict';

  var CONSENT_VERSION='2026-07-26';
  var lastCv=null;
  var generating=false;

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
  function setGenerating(value){
    generating=!!value;
    var button=byId('runCvGeneratorBtn');
    var regenerate=byId('regenerateCvBtn');
    if(button){button.disabled=generating;button.textContent=generating?'Creating your CV...':'Generate CV'}
    if(regenerate)regenerate.disabled=generating;
  }
  function openModal(showPreview){
    if(currentMode()!=='personal'){
      alert('AI CV Generator is available for Personal Accounts.');
      return;
    }
    var modal=byId('cvGeneratorModal');
    if(!modal)return;
    modal.classList.remove('hidden');
    document.body.style.overflow='hidden';
    var saved=storedCv();
    if(saved&&!lastCv)lastCv=saved;
    if(showPreview&&lastCv)showCvPreview(lastCv);
    else showForm();
  }
  function closeModal(){
    var modal=byId('cvGeneratorModal');
    if(modal)modal.classList.add('hidden');
    document.body.style.overflow='';
    setStatus('');
  }
  function showForm(){
    var form=byId('cvGeneratorForm'),preview=byId('cvGeneratorPreview');
    if(form)form.classList.remove('hidden');
    if(preview)preview.classList.add('hidden');
    var stored=profile();
    var target=byId('cvTargetRole');
    if(target&&!target.value)target.value=stored.position||'';
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
    var form=byId('cvGeneratorForm'),preview=byId('cvGeneratorPreview'),documentBox=byId('cvGeneratorPreviewDocument');
    if(form)form.classList.add('hidden');
    if(preview)preview.classList.remove('hidden');
    if(documentBox)documentBox.innerHTML=cvHtml(cv);
    updateCard();
  }
  function updateCard(){
    var saved=storedCv();
    var actions=byId('generatedCvActions');
    if(actions)actions.classList.toggle('hidden',!saved);
    var badge=byId('cvBetaBadge');
    if(badge)badge.textContent=saved?'AI CV READY':'AI CV GENERATOR';
    var button=byId('generateCVBtn');
    if(button)button.textContent=saved?'Generate New Version':'Generate ATSRS CV';
  }
  function requestBody(){
    return {
      target_role:(byId('cvTargetRole')&&byId('cvTargetRole').value||'').trim(),
      language:(byId('cvLanguage')&&byId('cvLanguage').value||'English').trim(),
      summary_notes:(byId('cvSummaryNotes')&&byId('cvSummaryNotes').value||'').trim(),
      skills:(byId('cvSkills')&&byId('cvSkills').value||'').split(/[,;\n]/).map(function(value){return value.trim()}).filter(Boolean),
      experience_text:(byId('cvExperience')&&byId('cvExperience').value||'').trim(),
      education_text:(byId('cvEducation')&&byId('cvEducation').value||'').trim(),
      consent_accepted:!!(byId('cvAiConsent')&&byId('cvAiConsent').checked),
      consent_version:CONSENT_VERSION
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
  async function generate(){
    if(generating)return;
    var body=requestBody();
    if(!body.consent_accepted){
      setStatus('Confirm the AI processing notice before generating your CV.','error');
      return;
    }
    if(!body.experience_text&&!body.education_text&&!body.summary_notes&&!body.skills.length){
      setStatus('Add at least one career detail, such as experience, education, skills or summary notes.','error');
      return;
    }
    var client=window.supabaseClient;
    if(!client||!client.functions){
      setStatus('The ATSRS AI service is unavailable. Sign in and try again.','error');
      return;
    }
    setGenerating(true);
    setStatus('Preparing your profile and document information...');
    try{
      var sessionResult=await client.auth.getSession();
      var session=sessionResult&&sessionResult.data&&sessionResult.data.session;
      if(!session)throw new Error('Your session has expired. Please sign in again.');
      var result=await client.functions.invoke('generate-cv',{
        body:body,
        headers:{Authorization:'Bearer '+session.access_token}
      });
      if(result.error)throw result.error;
      if(!result.data||!result.data.cv)throw new Error(result.data&&result.data.error||'The AI service returned no CV.');
      lastCv=Object.assign({},result.data.cv,{
        generated_at:new Date().toISOString(),
        generation_model:result.data.model||''
      });
      saveCv(lastCv);
      if(window.atsrsCloudData&&typeof window.atsrsCloudData.flush==='function')await window.atsrsCloudData.flush();
      setStatus('CV generated and saved.','success');
      showCvPreview(lastCv);
    }catch(error){
      console.error('ATSRS CV generation failed',error);
      setStatus(await errorMessage(error),'error');
    }finally{
      setGenerating(false);
    }
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
      ['generateCVBtn',function(){openModal(false)}],
      ['closeCvGeneratorBtn',closeModal],
      ['cancelCvGeneratorBtn',closeModal],
      ['runCvGeneratorBtn',generate],
      ['regenerateCvBtn',function(){showForm();setStatus('Update the details, then generate a new version.')}],
      ['editCvGeneratorBtn',showForm],
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
  window.atsrsCvGenerator={open:openModal,print:printCv,refresh:updateCard};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);
  else bind();
  window.addEventListener('atsrs:data-hydrated',updateCard);
  window.addEventListener('atsrs:resume',updateCard);
})();
