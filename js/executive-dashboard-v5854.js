/* ATSRS executive dashboard: real-data hierarchy and existing-route actions only. */
(function(){
  'use strict';

  var corporateDashboard=null;

  function byId(id){return document.getElementById(id)}
  function mode(){
    try{return String(localStorage.getItem('atsrs_use_mode')||window.useMode||'personal').toLowerCase()}
    catch(error){return 'personal'}
  }
  function corporate(){return mode()==='company'||mode()==='corporate'}
  function dashboardVisible(){var page=byId('dashboardPage');return Boolean(page&&!page.classList.contains('hidden'))}
  function documents(){
    try{return typeof window.getData==='function'?(window.getData('certs')||[]):[]}
    catch(error){return []}
  }
  function expirySummary(items){
    if(window.atsrsExpiryStatus&&typeof window.atsrsExpiryStatus.summarize==='function'){
      return window.atsrsExpiryStatus.summarize(items,function(item){return item&&item.expiry});
    }
    return{current:0};
  }
  function uploadValue(item){
    return item&&item.uploadedAt||(item&&item.cloudFileId&&window.atsrsDocumentUploadDates&&window.atsrsDocumentUploadDates[item.cloudFileId])||item&&item.uploaded_at||'';
  }
  function uploadTime(item){
    var value=uploadValue(item);
    var time=new Date(value).getTime();
    return Number.isFinite(time)?time:0;
  }
  function dateLabel(value){
    var date=new Date(value||'');
    return Number.isFinite(date.getTime())?date.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'';
  }
  function route(page,navId){
    var nav=byId(navId);
    if(typeof window.showPage==='function'&&nav)window.showPage(page,nav);
  }
  function addAction(container,label,page,navId){
    var button=document.createElement('button');
    button.type='button';button.className='secondary';button.textContent=label;
    button.addEventListener('click',function(){route(page,navId)});
    container.appendChild(button);
  }
  function ensureCurrentCard(stats){
    var card=byId('dashboardCurrentDocumentsCard');
    if(card)return card;
    card=document.createElement('div');
    card.id='dashboardCurrentDocumentsCard';
    card.className='card expiry-summary-card expiry-summary-current';
    card.innerHTML='<div class="expiry-summary-head"><span class="expiry-summary-icon" aria-hidden="true"><i class="ph ph-check-circle"></i></span><p>Current Documents</p></div><div class="stat" id="dashboardCurrentDocuments">0</div>';
    var uploaded=stats.querySelector('.expiry-summary-uploaded');
    if(uploaded)uploaded.insertAdjacentElement('afterend',card);else stats.prepend(card);
    return card;
  }
  function ensureExecutiveGrid(stats){
    var grid=byId('dashboardExecutiveGrid');
    if(grid)return grid;
    grid=document.createElement('div');grid.id='dashboardExecutiveGrid';grid.className='dashboard-executive-grid';

    var quick=document.createElement('section');quick.className='panel dashboard-executive-panel dashboard-quick-actions-panel';quick.setAttribute('aria-labelledby','dashboardQuickActionsTitle');
    quick.innerHTML='<div class="dashboard-executive-panel-head"><div><span class="pill">ACTION CENTRE</span><h2 id="dashboardQuickActionsTitle">Quick actions</h2></div></div><p id="dashboardQuickActionsSub" class="sub"></p><div id="dashboardQuickActions" class="dashboard-quick-actions"></div>';

    var recent=document.createElement('section');recent.className='panel dashboard-executive-panel dashboard-recent-activity-panel';recent.setAttribute('aria-labelledby','dashboardRecentTitle');
    recent.innerHTML='<div class="dashboard-executive-panel-head"><div><span class="pill">RECENT ACTIVITY</span><h2 id="dashboardRecentTitle">Recent document activity</h2></div></div><p id="dashboardRecentSub" class="sub"></p><ol id="dashboardRecentList" class="dashboard-recent-list"></ol>';

    grid.appendChild(quick);grid.appendChild(recent);stats.insertAdjacentElement('afterend',grid);
    return grid;
  }
  function renderActions(){
    var area=byId('dashboardQuickActions'),sub=byId('dashboardQuickActionsSub');if(!area||!sub)return;
    area.innerHTML='';
    if(corporate()){
      sub.textContent='Open the existing Corporate workflows that need attention.';
      addAction(area,'Review personnel','personnel','navPersonnel');
      addAction(area,'Open compliance','compliance','navCompliance');
      addAction(area,'View reports','reports','navReports');
      addAction(area,'Manage projects','projects','navProjects');
    }else{
      sub.textContent='Open the existing Personal workflows from one place.';
      addAction(area,'Add document','certificates','navCertificates');
      addAction(area,'Manage profile','profile','navProfile');
      addAction(area,'Browse jobs','jobs','navJobs');
      addAction(area,'Privacy & sharing','privacy','navPrivacy');
    }
  }
  function personalRecent(){
    return documents().map(function(item){
      var time=uploadTime(item),result=window.atsrsExpiryStatus&&window.atsrsExpiryStatus.classify?window.atsrsExpiryStatus.classify(item&&item.expiry):{label:''};
      return{title:String(item&&item.type||'Document'),owner:'',uploaded:uploadValue(item),time:time,status:result.label||''};
    }).filter(function(item){return item.time>0}).sort(function(a,b){return b.time-a.time}).slice(0,5);
  }
  function corporateRecent(){
    var data=corporateDashboard||(window.atsrsCorporateReporting&&window.atsrsCorporateReporting.getCompliance&&window.atsrsCorporateReporting.getCompliance());
    var items=[];
    ((data&&data.rows)||[]).forEach(function(row){
      var owner=(String(row.name||'')+' '+String(row.surname||'')).trim();
      (row.documents||[]).forEach(function(file){
        var raw=file&&file.uploaded_at||'',time=uploadTime({uploaded_at:raw});
        if(time)items.push({title:String(file.title||'Document'),owner:owner,uploaded:raw,time:time,status:String(file.status||'')});
      });
    });
    return items.sort(function(a,b){return b.time-a.time}).slice(0,5);
  }
  function renderRecent(){
    var list=byId('dashboardRecentList'),sub=byId('dashboardRecentSub');if(!list||!sub)return;
    var items=corporate()?corporateRecent():personalRecent();
    sub.textContent=corporate()?'Latest timestamped uploads across linked Personnel.':'Latest timestamped uploads in your Personal document register.';
    list.innerHTML='';
    if(!items.length){
      var empty=document.createElement('li');empty.className='dashboard-recent-empty';empty.textContent='No timestamped document activity is available yet.';list.appendChild(empty);return;
    }
    items.forEach(function(item){
      var row=document.createElement('li');row.className='dashboard-recent-item';
      var copy=document.createElement('div');copy.className='dashboard-recent-copy';
      var title=document.createElement('strong');title.textContent=item.title;
      var detail=document.createElement('span');detail.textContent=[item.owner,item.status].filter(Boolean).join(' · ');
      var meta=document.createElement('time');meta.className='dashboard-recent-meta';meta.dateTime=item.uploaded;meta.textContent=dateLabel(item.uploaded);
      copy.appendChild(title);if(detail.textContent)copy.appendChild(detail);row.appendChild(copy);row.appendChild(meta);list.appendChild(row);
    });
  }
  function renderCurrent(){
    var value=byId('dashboardCurrentDocuments');if(!value)return;
    if(corporate()){
      var data=corporateDashboard||(window.atsrsCorporateReporting&&window.atsrsCorporateReporting.getCompliance&&window.atsrsCorporateReporting.getCompliance());
      value.textContent=String(data&&data.summary?Number(data.summary.current||0):0);
    }else value.textContent=String(Number(expirySummary(documents()).current||0));
  }
  function sync(){
    if(!dashboardVisible())return;
    var stats=byId('dashboardPage').querySelector('.stats-grid');if(!stats)return;
    ensureCurrentCard(stats);ensureExecutiveGrid(stats);renderCurrent();renderActions();renderRecent();
  }

  window.addEventListener('atsrs:corporate-compliance',function(event){corporateDashboard=event&&event.detail||null;sync()});
  document.addEventListener('atsrs-document-files-updated',sync);
  window.addEventListener('atsrs:data-hydrated',function(){setTimeout(sync,0)});

  var oldShow=window.showPage;
  if(typeof oldShow==='function'&&!oldShow.__atsrsExecutiveDashboard){
    window.showPage=function(){var result=oldShow.apply(this,arguments);setTimeout(sync,0);return result};
    window.showPage.__atsrsExecutiveDashboard=true;
  }
  var oldRender=window.renderAll;
  if(typeof oldRender==='function'&&!oldRender.__atsrsExecutiveDashboard){
    window.renderAll=function(){var result=oldRender.apply(this,arguments);setTimeout(sync,0);return result};
    window.renderAll.__atsrsExecutiveDashboard=true;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(sync,120)});else setTimeout(sync,120);
})();
