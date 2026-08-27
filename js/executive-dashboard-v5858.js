/* ATSRS executive dashboard: real-data hierarchy and existing-route actions only. */
(function(){
  'use strict';

  window.__atsrsExecutiveDashboardVersion='5871';

  var corporateDashboard=null;
  var personalStorageLoading=false;
  var personalStorageLoadedAt=0;
  var personalStorageChartState={percent:0,label:'0%'};
  var personalTimelineSort={key:null,direction:'asc'};

  function byId(id){return document.getElementById(id)}
  function mode(){
    try{return String(localStorage.getItem('atsrs_use_mode')||window.useMode||'personal').toLowerCase()}
    catch(error){return 'personal'}
  }
  function corporate(){return mode()==='company'||mode()==='corporate'}
  function personalStorageSnapshotKey(userId){return userId?'atsrs_dashboard_storage_'+userId:''}
  function readPersonalStorageSnapshot(userId){
    var id=String(userId||(window.currentUser&&window.currentUser.id)||'');if(!id)return null;
    try{
      var value=JSON.parse(localStorage.getItem(personalStorageSnapshotKey(id))||'null');
      return value&&value.userId===id?value:null;
    }catch(error){return null}
  }
  function writePersonalStorageSnapshot(userId,value){
    var id=String(userId||'');if(!id||!value)return;
    try{localStorage.setItem(personalStorageSnapshotKey(id),JSON.stringify(Object.assign({userId:id,updatedAt:Date.now()},value)))}catch(error){}
  }
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
  function addPersonalAction(container,label,icon,tone,handler){
    var button=document.createElement('button');
    button.type='button';button.className='secondary dashboard-personal-action';
    button.dataset.tone=tone;
    button.innerHTML='<i class="ph '+icon+'" aria-hidden="true"></i><span>'+label+'</span>';
    button.addEventListener('click',handler);container.appendChild(button);
  }
  function openDocumentMethod(method){
    var manualPanel=byId('certManualPanel');
    if(method&&manualPanel)manualPanel.dataset.keepOpen='quick-action';
    route('certificates','navCertificates');
    if(!method)return;
    setTimeout(function(){
      var id=method==='scan'?'certScanModeBtn':method==='qr'?'certQrModeBtn':'certManualModeBtn';
      var button=byId(id);if(button)button.click();
    },220);
    setTimeout(function(){
      if(manualPanel&&manualPanel.dataset.keepOpen==='quick-action')delete manualPanel.dataset.keepOpen;
    },500);
  }
  function openProfileSharing(){
    route('profile','navProfile');
    setTimeout(function(){if(typeof window.showAccountTab==='function')window.showAccountTab('sharing');},80);
  }
  function openProfilePersonalInformation(){
    try{
      var url=new URL(window.location.href);
      ['route','tab','request','share_id'].forEach(function(key){url.searchParams.delete(key)});
      window.history.replaceState(null,'',url.pathname+(url.searchParams.toString()?'?'+url.searchParams.toString():'')+url.hash);
    }catch(error){}
    route('profile','navProfile');
    [0,80,220].forEach(function(delay){
      setTimeout(function(){
        if(typeof window.showAccountTab==='function')window.showAccountTab('general');
        if(typeof window.showProfileWorkspaceTab==='function')window.showProfileWorkspaceTab('personal',false);
      },delay);
    });
  }
  function ensurePersonalToolsGrid(stats){
    var grid=byId('dashboardPersonalTools');
    if(grid)return grid;
    grid=document.createElement('div');grid.id='dashboardPersonalTools';grid.className='dashboard-personal-tools';
    var quick=document.createElement('section');quick.className='panel dashboard-personal-tool-card dashboard-personal-actions-card';quick.setAttribute('aria-labelledby','dashboardPersonalActionsTitle');
    quick.innerHTML='<div class="dashboard-personal-tool-head"><div><h2 id="dashboardPersonalActionsTitle">Quick Actions</h2><p class="sub">Frequently used Personal tools and shortcuts.</p></div></div><div id="dashboardPersonalActions" class="dashboard-personal-actions"></div>';
    var storage=document.createElement('section');storage.className='panel dashboard-personal-tool-card dashboard-storage-card';storage.setAttribute('aria-labelledby','dashboardStorageTitle');
    storage.innerHTML='<div class="dashboard-personal-tool-head"><div><h2 id="dashboardStorageTitle">Storage Usage</h2><p id="dashboardStoragePlan" class="sub">Personal plan · secure server storage</p></div><a id="dashboardManageStorage" href="/pricing.html#comparison" class="secondary" role="button">Manage Storage</a></div><div class="dashboard-storage-visual"><div class="dashboard-storage-chart" role="img" aria-label="Personal storage usage"><canvas id="dashboardStorageChart" width="112" height="112" aria-hidden="true"></canvas><strong id="dashboardStoragePercent">—</strong></div><div class="dashboard-storage-copy"><div class="dashboard-storage-summary"><strong id="dashboardStorageUsed">—</strong><span id="dashboardStorageDetail" aria-live="polite"> stored</span></div><p>Secure server encrypted archival storage is active.</p></div></div>';
    grid.appendChild(quick);grid.appendChild(storage);stats.insertAdjacentElement('afterend',grid);
    var actions=byId('dashboardPersonalActions');
    addPersonalAction(actions,'Add Document','ph-file-plus','document',function(){openDocumentMethod('');});
    addPersonalAction(actions,'Scan with AI','ph-magic-wand','ai',function(){openDocumentMethod('scan');});
    addPersonalAction(actions,'Scan with QR','ph-qr-code','qr',function(){openDocumentMethod('qr');});
    addPersonalAction(actions,'Manual Upload','ph-upload-simple','upload',function(){openDocumentMethod('manual');});
    addPersonalAction(actions,'Manage Profile','ph-users-three','profile',openProfilePersonalInformation);
    addPersonalAction(actions,'Share Link','ph-link','sharing',openProfileSharing);
    var cachedStorage=readPersonalStorageSnapshot();
    if(cachedStorage)applyPersonalStorageSnapshot(cachedStorage);else drawStorageChart(0,'—');
    return grid;
  }
  function remainingStatus(expiry){
    if(window.atsrsExpiryStatus&&typeof window.atsrsExpiryStatus.classify==='function'){
      return window.atsrsExpiryStatus.classify(expiry);
    }
    return{bucket:'current',dateState:'unconfirmed',days:null,label:'Date not confirmed'};
  }
  function remainingTone(result){
    if(!result||result.days===null)return result&&result.dateState==='no_expiry'?'no-expiry':'unconfirmed';
    if(result.days<0)return'expired';
    if(result.days<=7)return'critical';
    if(result.days<=30)return'warning';
    if(result.days<=90)return'notice';
    if(result.days<=180)return'mid';
    return'current';
  }
  function remainingProgress(result){
    if(!result||result.days===null)return 6;
    if(result.days<=0)return 100;
    return Math.max(4,Math.min(100,Math.round(100/(1+result.days/90))));
  }
  function remainingLabel(result){
    if(!result||result.days===null)return result&&result.dateState==='no_expiry'?'No expiry':'Date not confirmed';
    if(result.days<0)return'Expired '+Math.abs(result.days)+' days';
    if(result.days===0)return'Expires today';
    return result.days+' days left';
  }
  function timelineName(item,index){
    return String(item&&item.type||item&&item.title||item&&item.name||'Document '+(index+1));
  }
  function sortedTimelineItems(items){
    var decorated=items.map(function(item,index){return{item:item,index:index,name:timelineName(item,index),status:remainingStatus(item&&item.expiry)}});
    if(!personalTimelineSort.key)return decorated;
    var direction=personalTimelineSort.direction==='desc'?-1:1;
    decorated.sort(function(a,b){
      if(personalTimelineSort.key==='name')return direction*a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'});
      var aDays=a.status&&a.status.days,bDays=b.status&&b.status.days;
      if(aDays===null&&bDays===null)return a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'});
      if(aDays===null)return 1;
      if(bDays===null)return-1;
      return direction*(aDays-bDays)||a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'});
    });
    return decorated;
  }
  function updateTimelineSortControls(){
    [['dashboardDocumentNameSort','name'],['dashboardDocumentDaysSort','days']].forEach(function(entry){
      var button=byId(entry[0]),active=personalTimelineSort.key===entry[1];if(!button)return;
      button.dataset.direction=active?personalTimelineSort.direction:'none';
      button.setAttribute('aria-pressed',active?'true':'false');
      button.setAttribute('aria-label',entry[1]==='name'?(active&&personalTimelineSort.direction==='asc'?'Sort names Z to A':'Sort names A to Z'):(active&&personalTimelineSort.direction==='asc'?'Sort days high to low':'Sort days low to high'));
    });
  }
  function setTimelineSort(key){
    personalTimelineSort.direction=personalTimelineSort.key===key&&personalTimelineSort.direction==='asc'?'desc':'asc';
    personalTimelineSort.key=key;renderPersonalDocumentTimeline();
    var documentRows=byId('dashboardDocumentListRows'),barRows=byId('dashboardDocumentBarRows');
    if(documentRows)documentRows.scrollTop=0;if(barRows)barRows.scrollTop=0;
  }
  function ensurePersonalDocumentTimeline(stats){
    var layout=byId('dashboardDocumentTimelineLayout');
    if(layout)return layout;
    layout=document.createElement('div');layout.id='dashboardDocumentTimelineLayout';layout.className='dashboard-document-timeline-layout';
    var documentsPanel=document.createElement('section');documentsPanel.className='panel dashboard-document-timeline-card dashboard-document-list-card';documentsPanel.setAttribute('aria-labelledby','dashboardDocumentTimelineTitle');
    documentsPanel.innerHTML='<div class="dashboard-document-timeline-head"><div><h2 id="dashboardDocumentTimelineTitle">Uploaded Documents</h2><p class="sub">Your Personal document register.</p></div><span id="dashboardDocumentTimelineCount" class="dashboard-document-timeline-count"></span></div><div class="dashboard-document-timeline-columns"><button id="dashboardDocumentNameSort" class="dashboard-document-sort" type="button" data-direction="none" aria-pressed="false"><span>Name</span><span class="dashboard-document-sort-arrows" aria-hidden="true"><i class="ph ph-caret-up"></i><i class="ph ph-caret-down"></i></span></button></div><div id="dashboardDocumentListRows" class="dashboard-document-timeline-rows dashboard-document-list-rows" tabindex="0" aria-label="Uploaded documents"></div>';
    var remainingPanel=document.createElement('section');remainingPanel.className='panel dashboard-document-timeline-card dashboard-document-bars-card';remainingPanel.setAttribute('aria-labelledby','dashboardDocumentBarsTitle');
    remainingPanel.innerHTML='<div class="dashboard-document-timeline-head"><div><h2 id="dashboardDocumentBarsTitle">Time Remaining</h2><p class="sub">Days until each document expires.</p></div></div><div class="dashboard-document-timeline-columns"><button id="dashboardDocumentDaysSort" class="dashboard-document-sort" type="button" data-direction="none" aria-pressed="false"><span>Days</span><span class="dashboard-document-sort-arrows" aria-hidden="true"><i class="ph ph-caret-up"></i><i class="ph ph-caret-down"></i></span></button></div><div id="dashboardDocumentBarRows" class="dashboard-document-timeline-rows dashboard-document-bar-rows" tabindex="0" aria-label="Document expiry time remaining"></div>';
    layout.appendChild(documentsPanel);layout.appendChild(remainingPanel);
    var tools=byId('dashboardPersonalTools');
    if(tools)tools.insertAdjacentElement('afterend',layout);else stats.insertAdjacentElement('afterend',layout);
    var documentRows=byId('dashboardDocumentListRows'),barRows=byId('dashboardDocumentBarRows'),scrollSyncing=false;
    function syncScroll(source,target){
      if(scrollSyncing)return;scrollSyncing=true;target.scrollTop=source.scrollTop;
      requestAnimationFrame(function(){scrollSyncing=false;});
    }
    documentRows.addEventListener('scroll',function(){syncScroll(documentRows,barRows)},{passive:true});
    barRows.addEventListener('scroll',function(){syncScroll(barRows,documentRows)},{passive:true});
    byId('dashboardDocumentNameSort').addEventListener('click',function(){setTimelineSort('name')});
    byId('dashboardDocumentDaysSort').addEventListener('click',function(){setTimelineSort('days')});
    updateTimelineSortControls();
    return layout;
  }
  function renderPersonalDocumentTimeline(){
    var documentRows=byId('dashboardDocumentListRows'),barRows=byId('dashboardDocumentBarRows'),count=byId('dashboardDocumentTimelineCount');if(!documentRows||!barRows)return;
    var sourceItems=documents(),items=sortedTimelineItems(sourceItems);documentRows.innerHTML='';barRows.innerHTML='';if(count)count.textContent=sourceItems.length+' document'+(sourceItems.length===1?'':'s');
    if(!items.length){
      var empty=document.createElement('p');empty.className='dashboard-document-timeline-empty';empty.textContent='No uploaded documents yet.';documentRows.appendChild(empty);
      var emptyBars=document.createElement('p');emptyBars.className='dashboard-document-timeline-empty';emptyBars.textContent='No expiry data yet.';barRows.appendChild(emptyBars);return;
    }
    items.forEach(function(entry){
      var item=entry.item,index=entry.index,result=entry.status,tone=remainingTone(result);
      var documentRow=document.createElement('article');documentRow.className='dashboard-document-list-row';documentRow.dataset.tone=tone;
      var documentCell=document.createElement('div');documentCell.className='dashboard-document-timeline-document';
      var icon=document.createElement('span');icon.className='dashboard-document-timeline-icon';icon.setAttribute('aria-hidden','true');icon.innerHTML='<i class="ph ph-file-text"></i>';
      var copy=document.createElement('div');copy.className='dashboard-document-timeline-copy';
      var title=document.createElement('strong');title.textContent=entry.name;
      var detail=document.createElement('span');detail.textContent=String(item&&item.provider||item&&item.authority||item&&item.country||'Uploaded document');
      copy.appendChild(title);copy.appendChild(detail);documentCell.appendChild(icon);documentCell.appendChild(copy);documentRow.appendChild(documentCell);documentRows.appendChild(documentRow);
      var barRow=document.createElement('article');barRow.className='dashboard-document-bar-row';barRow.dataset.tone=tone;barRow.style.setProperty('--remaining-progress',remainingProgress(result)+'%');
      var remaining=document.createElement('div');remaining.className='dashboard-document-timeline-remaining';
      var track=document.createElement('span');track.className='dashboard-document-timeline-track';track.setAttribute('aria-hidden','true');
      var fill=document.createElement('span');fill.className='dashboard-document-timeline-fill';track.appendChild(fill);
      var label=document.createElement('span');label.className='dashboard-document-timeline-label';label.textContent=remainingLabel(result);
      remaining.appendChild(track);remaining.appendChild(label);barRow.appendChild(remaining);barRows.appendChild(barRow);
    });
    updateTimelineSortControls();
  }
  function formatBytes(value){
    var bytes=Math.max(0,Number(value)||0);
    if(bytes<1024)return bytes+' B';
    if(bytes<1048576)return(bytes/1024).toFixed(bytes<10240?1:0)+' KB';
    if(bytes<1073741824)return(bytes/1048576).toFixed(bytes<10485760?1:0)+' MB';
    var gb=bytes/1073741824;
    return gb.toFixed(gb>=10||Number.isInteger(gb)?0:2)+' GB';
  }
  function storagePercent(usedBytes,limitBytes){
    if(!limitBytes)return{value:0,label:'—'};
    var exact=Math.min(100,Math.max(0,usedBytes/limitBytes*100));
    return{value:exact,label:exact>0&&exact<.05?'<0.1%':(exact>0&&exact<1?exact.toFixed(1):Math.round(exact))+'%'};
  }
  function drawStorageChart(value,label){
    personalStorageChartState={percent:value,label:label};
    var canvas=byId('dashboardStorageChart'),text=byId('dashboardStoragePercent'),wrap=canvas&&canvas.parentElement;if(!canvas||!wrap)return;
    if(text)text.textContent=label;
    var ratio=Math.max(1,Math.min(2,window.devicePixelRatio||1)),size=Math.max(72,Math.round(canvas.getBoundingClientRect().width||84));
    canvas.width=size*ratio;canvas.height=size*ratio;
    var context=canvas.getContext('2d');if(!context)return;
    var style=getComputedStyle(wrap),track=style.getPropertyValue('--dashboard-storage-track').trim()||'#24302c',accent=style.getPropertyValue('--dashboard-storage-accent').trim()||'#43c95b';
    context.clearRect(0,0,canvas.width,canvas.height);context.scale(ratio,ratio);
    var center=size/2,line=Math.max(9,Math.round(size*.12)),radius=center-line/2;
    context.lineWidth=line;context.lineCap='butt';context.strokeStyle=track;context.beginPath();context.arc(center,center,radius,0,Math.PI*2);context.stroke();
    if(value>0){context.lineCap='round';context.strokeStyle=accent;context.beginPath();context.arc(center,center,radius,-Math.PI/2,-Math.PI/2+Math.PI*2*(Math.min(100,value)/100));context.stroke();}
    wrap.setAttribute('aria-label',label+' of Personal storage used');
  }
  function redrawStorageChart(){drawStorageChart(personalStorageChartState.percent,personalStorageChartState.label)}
  function applyPersonalStorageSnapshot(snapshot){
    if(!snapshot)return;
    var used=byId('dashboardStorageUsed'),detail=byId('dashboardStorageDetail'),plan=byId('dashboardStoragePlan');
    if(used)used.textContent=String(snapshot.usedText||'—');
    if(detail)detail.textContent=String(snapshot.detailText||' stored');
    if(plan)plan.textContent=String(snapshot.planText||'Personal plan · secure server storage');
    drawStorageChart(Number(snapshot.percentValue)||0,String(snapshot.percentLabel||'—'));
  }
  async function loadPersonalStorage(force){
    if(corporate()||!byId('dashboardStorageUsed'))return;
    if(personalStorageLoading||(!force&&Date.now()-personalStorageLoadedAt<30000))return;
    var c=window.supabaseClient;
    if(!c||!c.auth)return;
    personalStorageLoading=true;
    try{
      var auth=await c.auth.getUser(),activeUser=auth&&auth.data&&auth.data.user;
      if(!activeUser)throw new Error('No authenticated Personal account.');
      var cached=readPersonalStorageSnapshot(activeUser.id);if(cached)applyPersonalStorageSnapshot(cached);
      var results=await Promise.all([
        c.from('atsrs_files').select('size_bytes').eq('user_id',activeUser.id).eq('account_type','personal'),
        c.rpc('atsrs_my_personal_entitlements')
      ]);
      if(results[0].error)throw results[0].error;if(results[1].error)throw results[1].error;
      var usedBytes=(results[0].data||[]).reduce(function(total,row){return total+Math.max(0,Number(row&&row.size_bytes)||0);},0);
      var entitlement=Array.isArray(results[1].data)?results[1].data[0]:results[1].data||{};
      var limitBytes=Number(entitlement&&entitlement.storage_bytes_limit)||0;
      var percent=storagePercent(usedBytes,limitBytes);
      var snapshot={
        usedText:formatBytes(usedBytes),
        detailText:limitBytes?' of '+formatBytes(limitBytes)+' used':' stored · no fixed storage limit',
        planText:String(entitlement&&entitlement.plan_name||'Personal')+' plan · secure server storage',
        percentValue:percent.value,
        percentLabel:percent.label
      };
      applyPersonalStorageSnapshot(snapshot);writePersonalStorageSnapshot(activeUser.id,snapshot);
      personalStorageLoadedAt=Date.now();
    }catch(error){console.warn('ATSRS Personal storage usage could not be loaded',error);}
    finally{personalStorageLoading=false;}
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
    ensureCurrentCard(stats);renderCurrent();
    if(!corporate()){
      var personalGrid=byId('dashboardExecutiveGrid');
      if(personalGrid)personalGrid.remove();
      ensurePersonalToolsGrid(stats);ensurePersonalDocumentTimeline(stats);renderPersonalDocumentTimeline();loadPersonalStorage(false);
      return;
    }
    var personalTools=byId('dashboardPersonalTools');if(personalTools)personalTools.remove();
    var personalTimeline=byId('dashboardDocumentTimelineLayout');if(personalTimeline)personalTimeline.remove();
    ensureExecutiveGrid(stats);renderActions();renderRecent();
  }
  function beginInitialSync(){
    var attempts=0,timer=setInterval(function(){
      attempts+=1;sync();
      if(byId('dashboardPersonalTools')||byId('dashboardExecutiveGrid')||attempts>=40)clearInterval(timer);
    },250);
  }

  window.addEventListener('atsrs:corporate-compliance',function(event){corporateDashboard=event&&event.detail||null;sync()});
  document.addEventListener('atsrs-document-files-updated',function(){personalStorageLoadedAt=0;sync();loadPersonalStorage(true);});
  window.addEventListener('resize',redrawStorageChart,{passive:true});
  new MutationObserver(redrawStorageChart).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  window.addEventListener('atsrs:data-hydrated',function(){setTimeout(sync,0)});

  var dashboardPage=byId('dashboardPage');
  if(dashboardPage&&typeof MutationObserver==='function'){
    new MutationObserver(function(){if(dashboardVisible())setTimeout(sync,0)}).observe(dashboardPage,{attributes:true,attributeFilter:['class']});
    new MutationObserver(function(){if(dashboardVisible())setTimeout(sync,0)}).observe(document.body,{attributes:true,attributeFilter:['class']});
  }

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
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',beginInitialSync);else beginInitialSync();
})();
