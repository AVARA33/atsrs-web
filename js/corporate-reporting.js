/* ATSRS corporate compliance and reporting backed by linked Personnel server data. */
(function(){
  'use strict';

  var complianceCache=null;
  var reportCache=null;
  var complianceLoading=null;
  var reportLoading=null;

  function byId(id){return document.getElementById(id)}
  function client(){return window.supabaseClient||null}
  function mode(){try{return localStorage.getItem('atsrs_use_mode')||window.useMode||'personal'}catch(error){return 'personal'}}
  function text(value){return String(value==null?'':value)}
  function number(value){var parsed=Number(value||0);return Number.isFinite(parsed)?parsed:0}
  function expiryApi(){
    if(!window.atsrsExpiryStatus)throw new Error('ATSRS expiry status contract is unavailable.');
    return window.atsrsExpiryStatus;
  }
  function dashboardExpiryCounts(documents){
    var result={current:0,expiring_7:0,expiring_30:0,expiring_60:0,expiring_90:0,expired:0};
    (Array.isArray(documents)?documents:[]).forEach(function(file){
      var status=expiryApi().classify(file&&file.expiry);
      if(status.days==null){result.current+=1;return}
      if(status.days<0){result.expired+=1;return}
      if(status.days<=7){result.expiring_7+=1;return}
      if(status.days<=30){result.expiring_30+=1;return}
      if(status.days<=60){result.expiring_60+=1;return}
      if(status.days<=90){result.expiring_90+=1;return}
      result.current+=1;
    });
    return result;
  }
  function canonicalPayload(payload){
    var source=payload||{},rows=Array.isArray(source.rows)?source.rows:[];
    var canonicalRows=rows.map(function(row){
      var documents=(Array.isArray(row.documents)?row.documents:[]).map(function(file){
        var result=expiryApi().classify(file&&file.expiry);
        return Object.assign({},file,{status:result.label,expiry_bucket:result.bucket});
      });
      var counts=expiryApi().summarize(documents,function(file){return file&&file.expiry});
      var dashboardCounts=dashboardExpiryCounts(documents);
      return Object.assign({},row,{
        status:counts.review?'review':'clear',
        document_count:counts.total,
        current_count:counts.current,
        expiring_30_count:counts.expiring_1_30,
        expiring_today_count:counts.expires_today,
        expiring_90_count:counts.expiring_31_90,
        expired_count:counts.expired,
        unconfirmed_count:counts.unconfirmed,
        dashboard_current_count:dashboardCounts.current,
        dashboard_expiring_7_count:dashboardCounts.expiring_7,
        dashboard_expiring_30_count:dashboardCounts.expiring_30,
        dashboard_expiring_60_count:dashboardCounts.expiring_60,
        dashboard_expiring_90_count:dashboardCounts.expiring_90,
        dashboard_expired_count:dashboardCounts.expired,
        documents:documents
      });
    });
    var summary=canonicalRows.reduce(function(totals,row){
      totals.personnel+=1;
      totals[row.status]+=1;
      totals.documents+=number(row.document_count);
      totals.current+=number(row.current_count);
      totals.expiring_30+=number(row.expiring_30_count);
      totals.expiring_today+=number(row.expiring_today_count);
      totals.expiring_90+=number(row.expiring_90_count);
      totals.expired+=number(row.expired_count);
      totals.unconfirmed+=number(row.unconfirmed_count);
      totals.dashboard_current+=number(row.dashboard_current_count);
      totals.dashboard_expiring_7+=number(row.dashboard_expiring_7_count);
      totals.dashboard_expiring_30+=number(row.dashboard_expiring_30_count);
      totals.dashboard_expiring_60+=number(row.dashboard_expiring_60_count);
      totals.dashboard_expiring_90+=number(row.dashboard_expiring_90_count);
      totals.dashboard_expired+=number(row.dashboard_expired_count);
      return totals;
    },{personnel:0,clear:0,review:0,documents:0,current:0,expiring_30:0,expiring_today:0,expiring_90:0,expired:0,unconfirmed:0,dashboard_current:0,dashboard_expiring_7:0,dashboard_expiring_30:0,dashboard_expiring_60:0,dashboard_expiring_90:0,dashboard_expired:0});
    return{generated_at:source.generated_at||new Date().toISOString(),summary:summary,rows:canonicalRows};
  }
  function setStatus(id,message,isError){
    var element=byId(id);if(!element)return;
    element.textContent=message||'';
    element.classList.toggle('is-error',!!isError);
  }
  async function actionCall(action){
    var c=client();if(!c||!c.functions||!c.auth)throw new Error('ATSRS service is unavailable.');
    var sessionResult=await c.auth.getSession();
    var session=sessionResult&&sessionResult.data&&sessionResult.data.session;
    if(!session||!session.access_token)throw new Error('Your session has expired. Please sign in again.');
    var result=await c.functions.invoke('talent-profile-actions',{
      body:{action:action},
      headers:{Authorization:'Bearer '+session.access_token}
    });
    if(result.error){
      var message='';
      try{
        var response=result.error.context;
        if(response&&typeof response.clone==='function')response=response.clone();
        if(response&&typeof response.json==='function'){
          var details=await response.json();
          message=details&&details.error||details&&details.message||'';
        }
      }catch(ignore){}
      throw new Error(message||'Corporate server data could not be loaded.');
    }
    if(!result.data||result.data.error)throw new Error(result.data&&result.data.error||'Corporate server data could not be loaded.');
    return result.data;
  }
  function summaryCards(container,summary){
    if(!container)return;
    container.innerHTML='';
    [
      ['Personnel',summary.personnel,'neutral'],
      ['Documents clear',summary.clear,'ready'],
      ['Review required',summary.review,'review'],
      ['Documents',summary.documents,'neutral']
    ].forEach(function(item){
      var card=document.createElement('div');
      card.className='corporate-summary-card is-'+item[2];
      var label=document.createElement('span'),value=document.createElement('b');
      label.textContent=item[0];value.textContent=String(number(item[1]));
      card.appendChild(label);card.appendChild(value);container.appendChild(card);
    });
  }
  function statusLabel(value){
    return value==='clear'?'Documents clear':'Review required';
  }
  function reviewReason(row){
    var parts=[];
    if(number(row.dashboard_expired_count))parts.push(number(row.dashboard_expired_count)+' expired');
    if(number(row.dashboard_expiring_7_count))parts.push(number(row.dashboard_expiring_7_count)+' expires in 1 week');
    if(number(row.dashboard_expiring_30_count))parts.push(number(row.dashboard_expiring_30_count)+' expires in 30 days');
    if(number(row.dashboard_expiring_60_count))parts.push(number(row.dashboard_expiring_60_count)+' expires in 60 days');
    if(number(row.dashboard_expiring_90_count))parts.push(number(row.dashboard_expiring_90_count)+' expires in 90 days');
    if(number(row.unconfirmed_count))parts.push(number(row.unconfirmed_count)+' date not confirmed');
    return parts.join(' · ');
  }
  function renderCompliance(){
    var list=byId('companyComplianceGrid'),summaryContainer=byId('corporateComplianceSummary');
    if(!list||!complianceCache)return;
    var summary=complianceCache.summary||{},rows=Array.isArray(complianceCache.rows)?complianceCache.rows:[];
    summaryCards(summaryContainer,summary);
    list.innerHTML='';
    if(!rows.length){
      var empty=document.createElement('div');empty.className='corporate-report-empty';
      empty.textContent='No profiles have been added to Company Personnel yet.';
      list.appendChild(empty);return;
    }
    rows.forEach(function(row){
      var card=document.createElement('article');card.className='corporate-compliance-card is-'+text(row.status);
      var head=document.createElement('div');head.className='corporate-compliance-head';
      var identity=document.createElement('div'),name=document.createElement('b'),role=document.createElement('span'),badge=document.createElement('em');
      name.textContent=(text(row.name)+' '+text(row.surname)).trim()||'Profile';
      role.textContent=text(row.position)||'Position not provided';
      badge.textContent=statusLabel(row.status);identity.appendChild(name);identity.appendChild(role);head.appendChild(identity);head.appendChild(badge);
      var metrics=document.createElement('div');metrics.className='corporate-compliance-metrics';
      [
        ['Current',row.dashboard_current_count],
        ['Expiring in 90 days',row.dashboard_expiring_90_count],
        ['Expiring in 60 days',row.dashboard_expiring_60_count],
        ['Expiring in 30 days',row.dashboard_expiring_30_count],
        ['Expiring in 1 week',row.dashboard_expiring_7_count],
        ['Expired',row.dashboard_expired_count]
      ].forEach(function(item){
        var metric=document.createElement('div'),label=document.createElement('span'),value=document.createElement('b');
        label.textContent=item[0];value.textContent=String(number(item[1]));
        metric.appendChild(label);metric.appendChild(value);metrics.appendChild(metric);
      });
      card.appendChild(head);card.appendChild(metrics);
      var reason=document.createElement('div');reason.className='corporate-compliance-reason';
      var reasonText=document.createElement('span');
      reasonText.textContent=row.status==='clear'
        ?'No dated document requires attention.'
        :reviewReason(row);
      reason.appendChild(reasonText);
      var view=document.createElement('button');view.type='button';view.className='secondary';
      view.textContent='View documents';
      view.addEventListener('click',function(){
        if(typeof window.showPage==='function'&&byId('navPersonnel'))window.showPage('personnel',byId('navPersonnel'));
      });
      reason.appendChild(view);card.appendChild(reason);
      list.appendChild(card);
    });
  }
  function renderDashboard(data){
    var dashboard=data||complianceCache;
    if(mode()!=='company'||!dashboard)return;
    var summary=dashboard.summary||{},rows=Array.isArray(dashboard.rows)?dashboard.rows:[],
        documents=[],expiring7=0,expiring30=0,expiring60=0,expiring90=0,expiredCount=0,currentCount=0;
    rows.forEach(function(row){
      currentCount+=number(row.current_count);
      expiredCount+=number(row.expired_count);
      (Array.isArray(row.documents)?row.documents:[]).forEach(function(file){
        var expiryResult=expiryApi().classify(file&&file.expiry);
        documents.push({
          person:(text(row.name)+' '+text(row.surname)).trim()||'Profile',
          title:text(file.title)||'Document',
          expiry:text(file.expiry),
          status:text(file.status)
        });
        if(expiryResult.days==null||expiryResult.days<0)return;
        if(expiryResult.days<=7)expiring7+=1;
        else if(expiryResult.days<=30)expiring30+=1;
        else if(expiryResult.days<=60)expiring60+=1;
        else if(expiryResult.days<=90)expiring90+=1;
      });
    });
    [
      ['totalPersonnel',summary.personnel],
      ['totalCerts',summary.documents],
      ['exp90',expiring90],
      ['exp60',expiring60],
      ['exp30',expiring30],
      ['exp7',expiring7],
      ['expired',expiredCount],
      ['snapValid',currentCount],
      ['snapRisk',expiring7+expiring30+expiring60+expiring90+expiredCount]
    ].forEach(function(item){var element=byId(item[0]);if(element)element.textContent=String(number(item[1]))});
    var list=byId('riskList');if(!list)return;
    var risks=documents.filter(function(document){
      return document.status==='Expired'||document.status==='Expires today'||
        /days remaining$/.test(document.status)||/^Expires within /.test(document.status);
    }).sort(function(a,b){
      var priority=function(value){
        if(value==='Expired')return -1;
        if(value==='Expires today')return 0;
        var match=value.match(/(\d+)/);return match?number(match[1]):9999;
      };
      return priority(a.status)-priority(b.status);
    }).slice(0,5);
    list.innerHTML='';
    if(!risks.length){
      var empty=document.createElement('div'),emptyTitle=document.createElement('b'),emptyState=document.createElement('span');
      empty.className='risk-item';emptyTitle.textContent='No urgent expiry risk detected.';emptyState.textContent='OK';
      empty.appendChild(emptyTitle);empty.appendChild(emptyState);list.appendChild(empty);return;
    }
    risks.forEach(function(file){
      var item=document.createElement('div'),details=document.createElement('div'),person=document.createElement('b'),
          line=document.createElement('span'),state=document.createElement('div');
      item.className='risk-item';person.textContent=file.person;
      line.textContent=file.title+(file.expiry?' • '+file.expiry:'');
      state.textContent=file.status;
      state.className=file.status==='Expired'||file.status==='Expires today'||/days remaining$/.test(file.status)?'danger':'warning';
      details.appendChild(person);details.appendChild(document.createElement('br'));details.appendChild(line);
      item.appendChild(details);item.appendChild(state);list.appendChild(item);
    });
  }
  function publishCompliance(){
    if(!complianceCache)return;
    window.dispatchEvent(new CustomEvent('atsrs:corporate-compliance',{detail:complianceCache}));
  }
  function renderReport(){
    var summaryContainer=byId('corporateReportSummary'),body=byId('corporateReportBody'),generated=byId('corporateReportGenerated');
    if(!body||!reportCache)return;
    summaryCards(summaryContainer,reportCache.summary||{});
    if(generated)generated.textContent='Last generated: '+new Date(reportCache.generated_at).toLocaleString('en-GB');
    body.innerHTML='';
    var rows=Array.isArray(reportCache.rows)?reportCache.rows:[];
    if(!rows.length){
      var empty=document.createElement('tr'),cell=document.createElement('td');
      cell.colSpan=8;cell.textContent='No Company Personnel data is available for this report.';
      empty.appendChild(cell);body.appendChild(empty);return;
    }
    rows.forEach(function(row){
      var tr=document.createElement('tr');
      [
        (text(row.name)+' '+text(row.surname)).trim(),
        text(row.position),
        statusLabel(row.status),
        row.document_count,
        row.expiring_30_count,
        row.expiring_today_count,
        row.expiring_90_count,
        row.expired_count
      ].forEach(function(value){var td=document.createElement('td');td.textContent=text(value);tr.appendChild(td)});
      body.appendChild(tr);
    });
  }
  async function loadCompliance(force){
    if(mode()!=='company')return null;
    if(complianceCache&&!force){renderCompliance();renderDashboard();publishCompliance();return complianceCache}
    if(complianceLoading)return complianceLoading;
    setStatus('corporateComplianceStatus','Loading live Personnel compliance...');
    complianceLoading=actionCall('compliance').then(function(data){
      complianceCache=canonicalPayload(data.compliance||{summary:{},rows:[]});
      reportCache=complianceCache;
      renderCompliance();renderDashboard();publishCompliance();setStatus('corporateComplianceStatus','Last updated: '+new Date(complianceCache.generated_at).toLocaleString('en-GB'));
      return complianceCache;
    }).catch(function(error){
      setStatus('corporateComplianceStatus',error.message||'Compliance data could not be loaded.',true);
      throw error;
    }).finally(function(){complianceLoading=null});
    return complianceLoading;
  }
  async function loadReport(force){
    if(mode()!=='company')return null;
    if(reportCache&&!force){renderReport();return reportCache}
    if(reportLoading)return reportLoading;
    setStatus('corporateReportStatus','Preparing live server report...');
    reportLoading=loadCompliance(!!force).then(function(data){
      reportCache=data;
      renderReport();setStatus('corporateReportStatus','Report is ready.');
      return reportCache;
    }).catch(function(error){
      setStatus('corporateReportStatus',error.message||'Report could not be loaded.',true);
      throw error;
    }).finally(function(){reportLoading=null});
    return reportLoading;
  }
  function csvCell(value){
    var valueText=text(value);
    if(/^[=+\-@]/.test(valueText))valueText="'"+valueText;
    return '"'+valueText.replace(/"/g,'""')+'"';
  }
  async function exportReport(){
    var report=reportCache||await loadReport(true);if(!report)return;
    var rows=[['Name','Position','Country','Status','Documents','Current','Expiring in 1–30 days','Expires today','Expiring in 31–90 days','Expired']];
    (report.rows||[]).forEach(function(row){
      rows.push([
        (text(row.name)+' '+text(row.surname)).trim(),row.position,row.country,statusLabel(row.status),
        row.document_count,row.current_count,row.expiring_30_count,row.expiring_today_count,row.expiring_90_count,row.expired_count
      ]);
    });
    var csv='\ufeff'+rows.map(function(row){return row.map(csvCell).join(',')}).join('\r\n');
    var blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download='atsrs-corporate-compliance-'+new Date().toISOString().slice(0,10)+'.csv';
    document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
  }
  function bind(){
    var complianceButton=byId('refreshCorporateCompliance');
    if(complianceButton)complianceButton.onclick=function(){
      complianceButton.disabled=true;complianceButton.textContent='Refreshing…';
      loadCompliance(true).catch(function(){}).finally(function(){complianceButton.disabled=false;complianceButton.textContent='Refresh'});
    };
    var reportButton=byId('refreshCorporateReport');
    if(reportButton)reportButton.onclick=function(){
      reportButton.disabled=true;reportButton.textContent='Refreshing…';
      var exportControl=byId('exportReportBtn');if(exportControl)exportControl.disabled=true;
      loadReport(true).catch(function(){}).finally(function(){reportButton.disabled=false;reportButton.textContent='Refresh';if(exportControl)exportControl.disabled=false});
    };
    var exportButton=byId('exportReportBtn');
    if(exportButton){exportButton.removeAttribute('onclick');exportButton.onclick=function(){exportReport().catch(function(error){setStatus('corporateReportStatus',error.message,true)})}}
    var oldShow=window.showPage;
    if(typeof oldShow==='function'&&!oldShow.__atsrsCorporateReporting){
      window.showPage=function(){
        var page=text(arguments[0]),result=oldShow.apply(this,arguments);
        if(page==='dashboard')setTimeout(function(){loadCompliance(false).catch(function(){})},20);
        if(page==='compliance')setTimeout(function(){loadCompliance(false).catch(function(){})},20);
        if(page==='reports')setTimeout(function(){loadReport(false).catch(function(){})},20);
        return result;
      };
      window.showPage.__atsrsCorporateReporting=true;
    }
    var oldRender=window.renderAll;
    if(typeof oldRender==='function'&&!oldRender.__atsrsCorporateDashboard){
      window.renderAll=function(){
        var result=oldRender.apply(this,arguments);
        if(complianceCache)renderDashboard();
        return result;
      };
      window.renderAll.__atsrsCorporateDashboard=true;
    }
    window.addEventListener('atsrs:data-hydrated',function(){
      complianceCache=null;reportCache=null;
      if(mode()==='company'&&byId('dashboardPage')&&!byId('dashboardPage').classList.contains('hidden')){
        setTimeout(function(){loadCompliance(true).catch(function(){})},20);
      }
    });
    window.addEventListener('atsrs:resume',function(){
      if(mode()!=='company')return;
      if(byId('dashboardPage')&&!byId('dashboardPage').classList.contains('hidden'))loadCompliance(true).catch(function(){});
      if(byId('compliancePage')&&!byId('compliancePage').classList.contains('hidden'))loadCompliance(true).catch(function(){});
      if(byId('reportsPage')&&!byId('reportsPage').classList.contains('hidden'))loadReport(true).catch(function(){});
    });
    setTimeout(function(){
      if(mode()!=='company')return;
      if(byId('dashboardPage')&&!byId('dashboardPage').classList.contains('hidden'))loadCompliance(false).catch(function(){});
      if(byId('compliancePage')&&!byId('compliancePage').classList.contains('hidden'))loadCompliance(false).catch(function(){});
      if(byId('reportsPage')&&!byId('reportsPage').classList.contains('hidden'))loadReport(false).catch(function(){});
    },80);
  }

  window.atsrsCorporateReporting={
    ownsCompliance:true,
    renderCompliance:renderCompliance,
    renderDashboard:renderDashboard,
    canonicalPayload:canonicalPayload,
    getCompliance:function(){return complianceCache},
    loadCompliance:function(){return loadCompliance(false)},
    refreshCompliance:function(){return loadCompliance(true)},
    refreshReport:function(){return loadReport(true)},
    exportReport:exportReport
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
