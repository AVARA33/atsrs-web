(function(){
  'use strict';
  function byId(id){return document.getElementById(id)}
  function number(id){
    var node=byId(id);if(!node)return 0;
    var value=parseInt(String(node.textContent||'').replace(/[^0-9-]/g,''),10);
    return Number.isFinite(value)?Math.max(0,value):0;
  }
  function companyMode(){return document.body.classList.contains('company-mode')}
  function syncReadiness(){
    var total=number('totalCerts');
    var risk=number('expired')+number('expToday')+number('exp30')+number('exp90');
    var current=Math.max(0,total-risk);
    var score=total?Math.round(current/total*100):0;
    var value=byId('sageReadinessValue'),progress=byId('sageReadinessProgress'),note=byId('sageReadinessNote');
    if(value)value.textContent=String(score);
    if(progress)progress.style.width=score+'%';
    if(note)note.textContent=total
      ?current+' of '+total+' uploaded documents are outside the displayed risk windows.'
      :'Calculated from uploaded document dates.';
  }
  function cleanCell(cell){
    var clone=cell.cloneNode(true);
    clone.querySelectorAll('input[type="checkbox"],.atsrs-document-select-column').forEach(function(node){node.remove()});
    return clone;
  }
  function syncLedger(){
    var source=byId('certTable'),target=byId('sageDashboardLedgerBody');
    if(!target)return;
    var query=String((byId('sageLedgerSearch')||{}).value||'').trim().toLowerCase();
    var rows=source?Array.from(source.querySelectorAll('tr')):[];
    var shown=rows.filter(function(row){return !query||String(row.textContent||'').toLowerCase().indexOf(query)!==-1}).slice(0,6);
    target.innerHTML='';
    if(!shown.length){
      var empty=document.createElement('tr');
      empty.innerHTML='<td colspan="5">'+(query?'No matching documents.':'No documents uploaded yet.')+'</td>';
      target.appendChild(empty);return;
    }
    shown.forEach(function(row){
      var next=document.createElement('tr');
      var cells=Array.from(row.children).filter(function(cell){return !cell.classList.contains('atsrs-document-select-column')});
      cells.slice(0,5).forEach(function(cell){next.appendChild(cleanCell(cell))});
      while(next.children.length<5){next.appendChild(document.createElement('td'))}
      target.appendChild(next);
    });
  }
  function sync(){syncReadiness();syncLedger()}
  window.atsrsSageOpenDocuments=function(){
    if(companyMode()&&typeof window.showCompanyCredentials==='function')return window.showCompanyCredentials('documents');
    if(typeof window.showPage==='function'&&byId('navCertificates'))return window.showPage('certificates',byId('navCertificates'));
  };
  function observe(id){var node=byId(id);if(node)new MutationObserver(sync).observe(node,{childList:true,subtree:true,characterData:true})}
  document.addEventListener('DOMContentLoaded',function(){
    ['totalCerts','expired','expToday','exp30','exp90','certTable'].forEach(observe);
    var search=byId('sageLedgerSearch');if(search)search.addEventListener('input',syncLedger);
    sync();setTimeout(sync,250);setTimeout(sync,900);
  });
  window.addEventListener('atsrs:workspace-switched',sync);
})();
