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
      ['Blocked',summary.blocked,'blocked'],
      ['Documents',summary.documents,'neutral'],
      ['Missing',summary.missing,'blocked']
    ].forEach(function(item){
      var card=document.createElement('div');
      card.className='corporate-summary-card is-'+item[2];
      var label=document.createElement('span'),value=document.createElement('b');
      label.textContent=item[0];value.textContent=String(number(item[1]));
      card.appendChild(label);card.appendChild(value);container.appendChild(card);
    });
  }
  function statusLabel(value){
    return value==='ready'?'Ready':value==='review'?'Needs review':'Blocked';
  }
  function renderCompliance(){
    var list=byId('companyComplianceGrid'),summaryContainer=byId('corporateComplianceSummary');
    if(!list||!complianceCache)return;
    var summary=complianceCache.summary||{},rows=Array.isArray(complianceCache.rows)?complianceCache.rows:[];
    summaryCards(summaryContainer,summary);
    list.innerHTML='';
    if(!rows.length){
      var empty=document.createElement('div');empty.className='corporate-report-empty';
      empty.textContent='No professionals have been added to Company Personnel yet.';
      list.appendChild(empty);return;
    }
    rows.forEach(function(row){
      var card=document.createElement('article');card.className='corporate-compliance-card is-'+text(row.status);
      var head=document.createElement('div');head.className='corporate-compliance-head';
      var identity=document.createElement('div'),name=document.createElement('b'),role=document.createElement('span'),badge=document.createElement('em');
      name.textContent=(text(row.name)+' '+text(row.surname)).trim()||'Professional';
      role.textContent=text(row.position)||'Position not provided';
      badge.textContent=statusLabel(row.status);identity.appendChild(name);identity.appendChild(role);head.appendChild(identity);head.appendChild(badge);
      var metrics=document.createElement('div');metrics.className='corporate-compliance-metrics';
      [
        ['Documents',row.document_count],
        ['Current',row.current_count],
        ['<=30 days',row.expiring_30_count],
        ['31-90 days',row.expiring_90_count],
        ['Expired',row.expired_count],
        ['Missing',row.missing_count]
      ].forEach(function(item){
        var metric=document.createElement('div'),label=document.createElement('span'),value=document.createElement('b');
        label.textContent=item[0];value.textContent=String(number(item[1]));
        metric.appendChild(label);metric.appendChild(value);metrics.appendChild(metric);
      });
      card.appendChild(head);card.appendChild(metrics);
      if(Array.isArray(row.missing_documents)&&row.missing_documents.length){
        var missing=document.createElement('p');missing.className='corporate-missing-documents';
        missing.textContent='Missing: '+row.missing_documents.join(', ');
        card.appendChild(missing);
      }
      list.appendChild(card);
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
        row.expiring_90_count,
        row.expired_count,
        row.missing_count
      ].forEach(function(value){var td=document.createElement('td');td.textContent=text(value);tr.appendChild(td)});
      body.appendChild(tr);
    });
  }
  async function loadCompliance(force){
    if(mode()!=='company')return null;
    if(complianceCache&&!force){renderCompliance();return complianceCache}
    if(complianceLoading)return complianceLoading;
    setStatus('corporateComplianceStatus','Loading live Personnel compliance...');
    complianceLoading=actionCall('compliance').then(function(data){
      complianceCache=data.compliance||{summary:{},rows:[]};
      renderCompliance();setStatus('corporateComplianceStatus','Live server data updated.');
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
    var rows=[['Name','Position','Country','Status','Documents','Current','Expiring <=30 days','Expiring 31-90 days','Expired','Missing','Missing document types']];
    (report.rows||[]).forEach(function(row){
      rows.push([
        (text(row.name)+' '+text(row.surname)).trim(),row.position,row.country,statusLabel(row.status),
        row.document_count,row.current_count,row.expiring_30_count,row.expiring_90_count,row.expired_count,row.missing_count,
        Array.isArray(row.missing_documents)?row.missing_documents.join('; '):''
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
        if(page==='compliance')setTimeout(function(){loadCompliance(false).catch(function(){})},20);
        if(page==='reports')setTimeout(function(){loadReport(false).catch(function(){})},20);
        return result;
      };
      window.showPage.__atsrsCorporateReporting=true;
    }
    window.addEventListener('atsrs:data-hydrated',function(){complianceCache=null;reportCache=null});
    window.addEventListener('atsrs:resume',function(){
      if(mode()!=='company')return;
      if(byId('compliancePage')&&!byId('compliancePage').classList.contains('hidden'))loadCompliance(true).catch(function(){});
      if(byId('reportsPage')&&!byId('reportsPage').classList.contains('hidden'))loadReport(true).catch(function(){});
    });
    setTimeout(function(){
      if(mode()!=='company')return;
      if(byId('compliancePage')&&!byId('compliancePage').classList.contains('hidden'))loadCompliance(false).catch(function(){});
      if(byId('reportsPage')&&!byId('reportsPage').classList.contains('hidden'))loadReport(false).catch(function(){});
    },80);
  }

  window.atsrsCorporateReporting={
    ownsCompliance:true,
    renderCompliance:renderCompliance,
    refreshCompliance:function(){return loadCompliance(true)},
    refreshReport:function(){return loadReport(true)},
    exportReport:exportReport
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
