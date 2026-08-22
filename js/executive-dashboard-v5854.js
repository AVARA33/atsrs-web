/* ATSRS executive dashboard structure. Existing ATSRS components and real workspace data only. */
(function(){
  'use strict';

  var corporateDashboard=null;
  var corporateLoadRequested=false;

  function byId(id){return document.getElementById(id)}
  function mode(){try{return String(localStorage.getItem('atsrs_use_mode')||window.useMode||'personal').toLowerCase()}catch(error){return 'personal'}}
  function corporate(){return mode()==='company'||mode()==='corporate'}
  function dashboardVisible(){var page=byId('dashboardPage');return Boolean(page&&!page.classList.contains('hidden'))}
  function documents(){try{return typeof window.getData==='function'?(window.getData('certs')||[]):[]}catch(error){return []}}
  function profile(){
    try{var value=typeof window.getData==='function'?window.getData('profile'):{};return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}
    catch(error){return {}}
  }
  function expiryApi(){return window.atsrsExpiryStatus||null}
  function summary(items){
    var api=expiryApi();
    return api&&typeof api.summarize==='function'
      ?api.summarize(items,function(item){return item&&item.expiry})
      :{total:0,current:0,expiring_31_90:0,expiring_1_30:0,expires_today:0,expired:0,unconfirmed:0,review:0};
  }
  function uploadValue(item){return item&&item.uploadedAt||(item&&item.cloudFileId&&window.atsrsDocumentUploadDates&&window.atsrsDocumentUploadDates[item.cloudFileId])||item&&item.uploaded_at||''}
  function uploadTime(item){var time=new Date(uploadValue(item)).getTime();return Number.isFinite(time)?time:0}
  function dateLabel(value){var date=new Date(value||'');return Number.isFinite(date.getTime())?date.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):''}
  function longDate(value){var date=value instanceof Date?value:new Date(value||'');return Number.isFinite(date.getTime())?date.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}):''}
  function route(page,navId){var nav=byId(navId);if(typeof window.showPage==='function'&&nav)window.showPage(page,nav)}
  function number(value){var parsed=Number(value||0);return Number.isFinite(parsed)?parsed:0}
  function percentage(value,total){return total?Math.round(number(value)/total*1000)/10:0}
  function setText(id,value){var element=byId(id);if(element)element.textContent=String(value==null?'':value)}
  function useful(value){return value!==undefined&&value!==null&&String(value).trim()!==''}
  function greeting(){
    var hour=new Date().getHours(),period=hour<12?'Good morning':hour<18?'Good afternoon':'Good evening';
    var name=String(profile().name||'').trim().split(/\s+/)[0];
    setText('dashboardHeading',period+(name?', '+name:'')+'!');
    setText('dashboardCommandDate',"Here's your readiness summary for "+longDate(new Date())+'.');
  }
  function profileCompletion(data){
    var fields=[data.name,data.surname,data.position,data.country,data.phone||data.phoneLocal,data.birthDate,data.address||data.zipCode,data.availabilityStatus&&data.availabilityStatus!=='not_set'?data.availabilityStatus:''];
    return Math.round(fields.filter(useful).length/fields.length*100);
  }
  function addAction(container,label,page,navId){
    var button=document.createElement('button');button.type='button';button.className='secondary';button.textContent=label;
    button.addEventListener('click',function(){route(page,navId)});container.appendChild(button);
  }
  function healthRow(label,value,tone,detail){
    var row=document.createElement('div');row.className='dashboard-health-item';row.setAttribute('role','listitem');
    var copy=document.createElement('div'),title=document.createElement('strong'),note=document.createElement('span'),count=document.createElement('b');
    title.textContent=label;note.textContent=detail||'';count.textContent=String(value);if(tone)count.className=tone;
    copy.appendChild(title);if(note.textContent)copy.appendChild(note);row.appendChild(copy);row.appendChild(count);return row;
  }
  function renderOverallPersonal(data,items){
    var risk=number(data.review),expired=number(data.expired);setText('dashboardOverallLabel','PERSONAL READINESS');
    if(!items.length){setText('dashboardOverallStatus','Start your document register');setText('dashboardOverallDetail','Add your first document to begin expiry tracking.');return}
    if(expired){setText('dashboardOverallStatus','Action required');setText('dashboardOverallDetail',expired+' expired document'+(expired===1?' requires':'s require')+' attention.');return}
    if(risk){setText('dashboardOverallStatus','Review upcoming expiries');setText('dashboardOverallDetail',risk+' document'+(risk===1?' needs':'s need')+' review.');return}
    setText('dashboardOverallStatus','Documents are current');setText('dashboardOverallDetail','No document expiry risk is currently detected.');
  }
  function personalWindows(items){
    var api=expiryApi(),counts={exp90:0,exp60:0,exp30:0,exp7:0,expired:0};
    items.forEach(function(item){
      var result=api&&typeof api.classify==='function'?api.classify(item&&item.expiry):null;if(!result)return;
      if(result.bucket==='expired'){counts.expired+=1;return}
      if(!Number.isFinite(result.days)||result.days<0||result.days>90)return;
      if(result.days<=7)counts.exp7+=1;
      else if(result.days<=30)counts.exp30+=1;
      else if(result.days<=60)counts.exp60+=1;
      else counts.exp90+=1;
    });
    return counts;
  }
  function firstReviewItem(items){
    var api=expiryApi(),review=null;
    items.some(function(item){var result=api&&typeof api.classify==='function'?api.classify(item&&item.expiry):null;if(result&&result.review){review={item:item,result:result};return true}return false});
    return review;
  }
  function syncPersonalSummary(data,items,completion){
    var total=items.length,windows=personalWindows(items);
    setText('totalCertsText','Uploaded Documents');setText('totalCerts',total);setText('dashboardCurrentDocuments',data.current);setText('dashboardProfileCompletion',completion+'%');
    setText('exp90',windows.exp90);setText('exp60',windows.exp60);setText('exp30',windows.exp30);setText('exp7',windows.exp7);setText('expiredText','Expired');setText('expired',windows.expired);
    setText('totalCertsMeta','Total');setText('dashboardCurrentDocumentsMeta',percentage(data.current,total)+'%');setText('exp90Meta',percentage(windows.exp90,total)+'%');setText('exp60Meta',percentage(windows.exp60,total)+'%');setText('exp30Meta',percentage(windows.exp30,total)+'%');setText('exp7Meta',percentage(windows.exp7,total)+'%');setText('expiredMeta',percentage(windows.expired,total)+'%');
  }
  function renderCommandCenter(data,items,completion){
    var review=firstReviewItem(items),risk=number(data.review),expired=number(data.expired),type=review&&String(review.item&&review.item.type||'Document'),expiry=review&&String(review.item&&review.item.expiry||''),readiness=byId('personalReadinessCommand'),attention=byId('dashboardAttentionSummary'),attentionReview=byId('dashboardAttentionReview');
    if(readiness)readiness.classList.toggle('is-clear',Boolean(items.length&&!risk));
    if(attention)attention.classList.toggle('is-clear',!risk);
    if(!items.length){
      setText('dashboardReadinessTitle','Start your document register.');setText('dashboardReadinessDetail','Add your first document to begin readiness tracking.');setText('dashboardReadinessNote','ATSRS will organise document status and expiry windows here.');
      setText('dashboardCommandActionLabel','GET STARTED');setText('dashboardCommandActionCopy','Upload a document to create your readiness view.');setText('dashboardReadinessAction','Add first document');
    }else if(expired){
      setText('dashboardReadinessTitle',expired===1?"You're almost ready.":'Your readiness needs attention.');setText('dashboardReadinessDetail','Your profile is '+completion+'% complete and '+data.current+' of '+items.length+' documents are current.');setText('dashboardReadinessNote',expired+' expired document'+(expired===1?' needs':'s need')+' your attention.');
      setText('dashboardCommandActionLabel','ACTION REQUIRED');setText('dashboardCommandActionCopy','Review '+(expired===1?'your expired document':'expired documents')+' to maintain continuous readiness.');setText('dashboardReadinessAction',expired===1?'Review expired document':'Review expired documents');
    }else if(risk){
      setText('dashboardReadinessTitle','Plan your next renewal.');setText('dashboardReadinessDetail','Your profile is '+completion+'% complete and '+data.current+' of '+items.length+' documents are current.');setText('dashboardReadinessNote',risk+' document'+(risk===1?' needs':'s need')+' review before expiry.');
      setText('dashboardCommandActionLabel','REVIEW UPCOMING');setText('dashboardCommandActionCopy','Open your document register and plan the next renewal.');setText('dashboardReadinessAction','Review documents');
    }else{
      setText('dashboardReadinessTitle',"You're ready to go.");setText('dashboardReadinessDetail','Your profile is '+completion+'% complete and all '+items.length+' documents are current.');setText('dashboardReadinessNote','No document expiry risk is currently detected.');
      setText('dashboardCommandActionLabel','ALL CLEAR');setText('dashboardCommandActionCopy','Your document register is ready for your next opportunity.');setText('dashboardReadinessAction','View documents');
    }
    setText('dashboardAttentionLabel',risk?'ATTENTION REQUIRED':'ALL CLEAR');setText('dashboardAttentionCount',risk);
    if(review){setText('dashboardAttentionTitle',type);setText('dashboardAttentionMeta',(review.result.label||'Review required')+(expiry?' · '+expiry:''));}
    else{setText('dashboardAttentionTitle','No document requires attention');setText('dashboardAttentionMeta','Your current document register has no detected expiry risk.');}
    if(attentionReview){attentionReview.classList.toggle('hidden',!review);attentionReview.textContent=expired?'Review now':'Open documents';}
  }
  function renderPersonal(){
    var items=documents(),data=summary(items),userProfile=profile(),completion=profileCompletion(userProfile);
    setText('dashboardHealthBadge','DOCUMENT HEALTH');setText('dashboardHealthTitle','Document status overview');setText('dashboardHealthSub','A current breakdown of your Personal document register.');
    syncPersonalSummary(data,items,completion);renderCommandCenter(data,items,completion);
    renderOverallPersonal(data,items);
    var list=byId('dashboardHealthList');if(list){
      list.innerHTML='';
      list.appendChild(healthRow('Current',data.current,'good','No immediate expiry action.'));
      list.appendChild(healthRow('Expiring within 90 days',number(data.expiring_31_90)+number(data.expiring_1_30)+number(data.expires_today),'warning','Renewal planning may be required.'));
      list.appendChild(healthRow('Expired',data.expired,'danger','Expired records require attention.'));
      list.appendChild(healthRow('Date not confirmed',data.unconfirmed,'warning','Review incomplete expiry information.'));
    }
    renderTypes(items.map(function(item){return String(item&&item.type||'Document')}));
    renderRecent(personalRecent(),'Latest activity in your Personal document register.');renderActions(false);syncViewDocuments();
  }
  function missingCorporateProfiles(rows){return rows.filter(function(row){return !useful(row&&row.name)||!useful(row&&row.position)||!useful(row&&row.country)}).length}
  function corporateDocuments(data){
    var files=[];((data&&data.rows)||[]).forEach(function(row){var owner=(String(row.name||'')+' '+String(row.surname||'')).trim();(row.documents||[]).forEach(function(file){files.push(Object.assign({},file,{owner:owner}))})});return files;
  }
  function renderCorporateUnavailable(message){
    setText('dashboardOverallLabel','WORKFORCE READINESS');setText('dashboardOverallStatus','Corporate overview unavailable');setText('dashboardOverallDetail',message||'Live Personnel data could not be loaded.');
    setText('dashboardHealthBadge','COMPLIANCE OVERVIEW');setText('dashboardHealthTitle','Workforce compliance');setText('dashboardHealthSub','Live linked-Personnel data is currently unavailable.');
    var list=byId('dashboardHealthList');if(list){list.innerHTML='';list.appendChild(healthRow('Corporate data','Unavailable','warning','Use Refresh in the Corporate workflow to try again.'))}
    renderTypes([]);renderRecent([],'Recent linked-Personnel uploads are unavailable.');renderActions(true);syncViewDocuments();
  }
  function renderCorporate(data){
    if(!data){renderCorporateUnavailable('Loading live linked-Personnel compliance data…');return}
    corporateDashboard=data;
    var rows=Array.isArray(data.rows)?data.rows:[],totals=data.summary||{},files=corporateDocuments(data),missing=missingCorporateProfiles(rows);
    var risk=number(totals.expiring_30)+number(totals.expiring_today)+number(totals.expiring_90)+number(totals.expired)+number(totals.unconfirmed);
    setText('dashboardOverallLabel','WORKFORCE READINESS');
    if(!rows.length){setText('dashboardOverallStatus','No Personnel linked yet');setText('dashboardOverallDetail','Add profiles to Company Personnel to begin compliance oversight.');}
    else if(risk){setText('dashboardOverallStatus','Workforce review required');setText('dashboardOverallDetail',risk+' document record'+(risk===1?' requires':'s require')+' attention.');}
    else{setText('dashboardOverallStatus','Workforce documents are clear');setText('dashboardOverallDetail','No linked-Personnel document expiry risk is currently detected.');}
    setText('dashboardHealthBadge','COMPLIANCE OVERVIEW');setText('dashboardHealthTitle','Workforce compliance');setText('dashboardHealthSub','Live document status across linked Company Personnel.');setText('dashboardCurrentDocuments',totals.current);
    var list=byId('dashboardHealthList');if(list){
      list.innerHTML='';
      list.appendChild(healthRow('Profiles clear',totals.clear,'good','No dated document requires attention.'));
      list.appendChild(healthRow('Profiles requiring review',totals.review,'warning','One or more documents need attention.'));
      list.appendChild(healthRow('Missing profile information',missing,missing?'warning':'good','Name, position or country is incomplete.'));
      list.appendChild(healthRow('Public/shared profile state','Unavailable','','Not exposed by the existing compliance service.'));
    }
    renderTypes(files.map(function(file){return String(file.title||'Document')}));renderRecent(corporateRecent(files),'Latest timestamped uploads across linked Company Personnel.');renderActions(true);syncViewDocuments();
  }
  function typeEntries(values){
    var counts=Object.create(null);values.forEach(function(value){var label=String(value||'Document').trim()||'Document';counts[label]=(counts[label]||0)+1});
    return Object.keys(counts).map(function(label){return{label:label,count:counts[label]}}).sort(function(a,b){return b.count-a.count||a.label.localeCompare(b.label)});
  }
  function renderTypes(values){
    var list=byId('dashboardDocumentTypes');if(!list)return;
    var entries=typeEntries(values),visible=entries.slice(0,5),remainder=entries.slice(5).reduce(function(total,item){return total+item.count},0),total=values.length;list.innerHTML='';
    if(!visible.length){var empty=document.createElement('div');empty.className='dashboard-native-empty';var title=document.createElement('strong'),copy=document.createElement('span');title.textContent='No document categories yet';copy.textContent='Categories will appear after document data is available.';empty.appendChild(title);empty.appendChild(copy);list.appendChild(empty);return}
    if(remainder)visible.push({label:'Other',count:remainder});
    visible.sort(function(a,b){return b.count-a.count||a.label.localeCompare(b.label)});
    visible.forEach(function(item){
      var percentage=total?item.count/total*100:0;
      var row=document.createElement('div');row.className='dashboard-type-item';row.setAttribute('role','listitem');row.style.setProperty('--dashboard-type-share',percentage.toFixed(2)+'%');
      var copy=document.createElement('div');copy.className='dashboard-type-copy';
      var label=document.createElement('span');var icon=document.createElement('i');icon.className='ph ph-file-text';icon.setAttribute('aria-hidden','true');label.appendChild(icon);label.appendChild(document.createTextNode(item.label));
      var count=document.createElement('b'),share=null;
      if(corporate())count.textContent=item.count+' ('+percentage.toFixed(1)+'%)';
      else{count.textContent=String(item.count);share=document.createElement('span');share.className='dashboard-type-percentage';share.textContent=percentage.toFixed(1)+'%';}
      var track=document.createElement('span');track.className='dashboard-type-track';track.setAttribute('aria-hidden','true');var fill=document.createElement('span');track.appendChild(fill);
      copy.appendChild(label);copy.appendChild(count);if(share)copy.appendChild(share);row.appendChild(copy);row.appendChild(track);list.appendChild(row);
    });
  }
  function personalRecent(){
    var api=expiryApi();return documents().map(function(item){var result=api&&typeof api.classify==='function'?api.classify(item&&item.expiry):{label:''};return{title:String(item&&item.type||'Document'),owner:'',uploaded:uploadValue(item),time:uploadTime(item),status:result.label||''}}).filter(function(item){return item.time>0}).sort(function(a,b){return b.time-a.time}).slice(0,5);
  }
  function corporateRecent(files){return files.map(function(file){return{title:String(file.title||'Document'),owner:file.owner||'',uploaded:file.uploaded_at||'',time:uploadTime({uploaded_at:file.uploaded_at}),status:String(file.status||'')}}).filter(function(item){return item.time>0}).sort(function(a,b){return b.time-a.time}).slice(0,5)}
  function renderRecent(items,description){
    var list=byId('dashboardRecentList');setText('dashboardRecentSub',description);if(!list)return;list.innerHTML='';
    if(!items.length){var empty=document.createElement('li');empty.className='dashboard-recent-empty';empty.textContent='No timestamped document activity is available yet.';list.appendChild(empty);return}
    items.forEach(function(item){
      var row=document.createElement('li');row.className='dashboard-recent-item';var copy=document.createElement('div');copy.className='dashboard-recent-copy';
      var title=document.createElement('strong');title.textContent=item.title;var detail=document.createElement('span');detail.textContent=[item.owner,item.status].filter(Boolean).join(' · ');
      var meta=document.createElement('time');meta.className='dashboard-recent-meta';meta.dateTime=item.uploaded;meta.textContent=dateLabel(item.uploaded);
      copy.appendChild(title);if(detail.textContent)copy.appendChild(detail);row.appendChild(copy);row.appendChild(meta);list.appendChild(row);
    });
  }
  function renderActions(isCorporate){
    var area=byId('dashboardQuickActions');if(!area)return;area.innerHTML='';
    if(isCorporate){setText('dashboardQuickActionsSub','Open the existing Corporate workflows that need attention.');addAction(area,'Review personnel','personnel','navPersonnel');addAction(area,'Open compliance','compliance','navCompliance');addAction(area,'View reports','reports','navReports');addAction(area,'Manage projects','projects','navProjects');}
    else{setText('dashboardQuickActionsSub','Open the existing Personal workflows from one place.');addAction(area,'Add document','certificates','navCertificates');addAction(area,'Manage profile','profile','navProfile');addAction(area,'Browse jobs','jobs','navJobs');addAction(area,'Privacy & sharing','privacy','navPrivacy');}
  }
  function syncViewDocuments(){
    var button=byId('dashboardViewDocumentsBtn');if(button&&!button.__atsrsExecutiveBound){button.__atsrsExecutiveBound=true;button.addEventListener('click',function(){var company=corporate();route(company?'personnel':'certificates',company?'navPersonnel':'navCertificates')})}
    ['dashboardReadinessAction','dashboardAttentionReview','dashboardTypesViewAll','dashboardRecentViewAll'].forEach(function(id){var target=byId(id);if(!target||target.__atsrsExecutiveBound)return;target.__atsrsExecutiveBound=true;target.addEventListener('click',function(){route('certificates','navCertificates')})});
  }
  function requestCorporateData(){
    if(corporateLoadRequested)return;var reporting=window.atsrsCorporateReporting;if(!reporting||typeof reporting.loadCompliance!=='function')return;corporateLoadRequested=true;
    Promise.resolve(reporting.getCompliance&&reporting.getCompliance()||reporting.loadCompliance()).then(function(data){corporateDashboard=data||null;renderCorporate(corporateDashboard)}).catch(function(error){renderCorporateUnavailable(error&&error.message||'Live Personnel data could not be loaded.')}).finally(function(){corporateLoadRequested=false});
  }
  function sync(){
    if(!dashboardVisible())return;
    greeting();
    if(corporate()){var reporting=window.atsrsCorporateReporting;var cached=corporateDashboard||(reporting&&typeof reporting.getCompliance==='function'&&reporting.getCompliance());renderCorporate(cached||null);if(!cached)requestCorporateData();}
    else renderPersonal();
  }

  window.addEventListener('atsrs:corporate-compliance',function(event){corporateDashboard=event&&event.detail||null;if(corporate())renderCorporate(corporateDashboard)});
  document.addEventListener('atsrs-document-files-updated',sync);
  window.addEventListener('atsrs:data-hydrated',function(){corporateDashboard=null;setTimeout(sync,0)});
  window.addEventListener('atsrs:workspace-changed',function(){corporateDashboard=null;setTimeout(sync,0)});
  var oldShow=window.showPage;
  if(typeof oldShow==='function'&&!oldShow.__atsrsExecutiveDashboard){window.showPage=function(){var result=oldShow.apply(this,arguments);setTimeout(sync,0);return result};window.showPage.__atsrsExecutiveDashboard=true;}
  var oldRender=window.renderAll;
  if(typeof oldRender==='function'&&!oldRender.__atsrsExecutiveDashboard){window.renderAll=function(){var result=oldRender.apply(this,arguments);setTimeout(sync,0);return result};window.renderAll.__atsrsExecutiveDashboard=true;}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(sync,120)});else setTimeout(sync,120);
})();
