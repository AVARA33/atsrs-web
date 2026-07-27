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
      ['Ready',summary.ready,'ready'],
      ['Needs review',summary.review,'review'],
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
    return value==='ready'?'Ready':'Needs review';
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
        ['Documents',row.document_count],
        ['Current',row.current_count],
        ['<=30 days',row.expiring_30_count],
        ['31-90 days',row.expiring_90_count],
        ['Expired',row.expired_count]
      ].forEach(function(item){
        var metric=document.createElement('div'),label=document.createElement('span'),value=document.createElement('b');
        label.textContent=item[0];value.textContent=String(number(item[1]));
        metric.appendChild(label);metric.appendChild(value);metrics.appendChild(metric);
      });
      card.appendChild(head);card.appendChild(metrics);
      list.appendChild(card);
    });
  }
  function renderDashboard(data){
    var dashboard=data||complianceCache;
    if(mode()!=='company'||!dashboard)return;
    var summary=dashboard.summary||{},rows=Array.isArray(dashboard.rows)?dashboard.rows:[],
        documents=[],todayCount=0,expiring30=0,expiring90=0,expiredCount=0,currentCount=0;
    rows.forEach(function(row){
      currentCount+=number(row.current_count);
      expiring30+=number(row.expiring_30_count);
      expiring90+=number(row.expiring_90_count);
      expiredCount+=number(row.expired_count);
      (Array.isArray(row.documents)?row.documents:[]).forEach(function(file){
        documents.push({
          person:(text(row.name)+' '+text(row.surname)).trim()||'Profile',
          title:text(file.title)||'Document',
          expiry:text(file.expiry),
          status:text(file.status)
        });
        if(file.status==='Expires today')todayCount+=1;
      });
    });
    expiring30=Math.max(0,expiring30-todayCount);
    [
      ['totalPersonnel',summary.personnel],
      ['totalCerts',summary.documents],
      ['exp90',expiring90],
      ['exp30',expiring30],
      ['expToday',todayCount],
      ['expired',expiredCount],
      ['snapValid',currentCount],
      ['snapRisk',expiring30+expiring90+todayCount+expiredCount]
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
  function renderReport(){
    var summaryContainer=byId('corporateReportSummary'),body=byId('corporateReportBody'),generated=byId('corporateReportGenerated');
    if(!body||!reportCache)return;
    summaryCards(summaryContainer,reportCache.summary||{});
    if(generated)generated.textContent='Generated from live server data: '+new Date(reportCache.generated_at).toLocaleString();
    body.innerHTML='';
    var rows=Array.isArray(reportCache.rows)?reportCache.rows:[];
    if(!rows.length){
      var empty=document.createElement('tr'),cell=document.createElement('td');
      cell.colSpan=7;cell.textContent='No Company Personnel data is available for this report.';
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
        row.expiring_90_count,
        row.expired_count
      ].forEach(function(value){var td=document.createElement('td');td.textContent=text(value);tr.appendChild(td)});
      body.appendChild(tr);
    });
  }
  async function loadCompliance(force){
    if(mode()!=='company')return null;
    if(complianceCache&&!force){renderCompliance();renderDashboard();return complianceCache}
    if(complianceLoading)return complianceLoading;
    setStatus('corporateComplianceStatus','Loading live Personnel compliance...');
    complianceLoading=actionCall('compliance').then(function(data){
      complianceCache=data.compliance||{summary:{},rows:[]};
      renderCompliance();renderDashboard();setStatus('corporateComplianceStatus','Live server data updated.');
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
    reportLoading=actionCall('report').then(function(data){
      reportCache=data.report||{summary:{},rows:[]};
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
    var rows=[['Name','Position','Country','Status','Documents','Current','Expiring <=30 days','Expiring 31-90 days','Expired']];
    (report.rows||[]).forEach(function(row){
      rows.push([
        (text(row.name)+' '+text(row.surname)).trim(),row.position,row.country,statusLabel(row.status),
        row.document_count,row.current_count,row.expiring_30_count,row.expiring_90_count,row.expired_count
      ]);
    });
    var csv='\ufeff'+rows.map(function(row){return row.map(csvCell).join(',')}).join('\r\n');
    var blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download='atsrs-corporate-compliance-'+new Date().toISOString().slice(0,10)+'.csv';
    document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
  }
  function bind(){
    var complianceButton=byId('refreshCorporateCompliance');
    if(complianceButton)complianceButton.onclick=function(){loadCompliance(true).catch(function(){})};
    var reportButton=byId('refreshCorporateReport');
    if(reportButton)reportButton.onclick=function(){loadReport(true).catch(function(){})};
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
    refreshCompliance:function(){return loadCompliance(true)},
    refreshReport:function(){return loadReport(true)},
    exportReport:exportReport
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
