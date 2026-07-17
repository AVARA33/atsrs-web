/* ATSRS V178 extracted JavaScript batch: documents.js. Loaded in original V178 execution order. No placeholder code. */
/* ===== extracted from inline script id=ATSRS_V127_DASHBOARD_STABILITY_JS ===== */
(function(){
  function q(s,r){return (r||document).querySelector(s)}
  function qa(s,r){return Array.from((r||document).querySelectorAll(s))}
  function applyBuild(){
    var BUILD='ATSRS V231';
    var UPDATE='Last Update: 17 Jul 2026';
    qa('.build-badge').forEach(function(b){
      var d=b.querySelectorAll('div');
      if(d[0])d[0].textContent=BUILD;
      if(d[1])d[1].textContent=UPDATE;
      if(d[2])d[2].textContent='TEST BUILD';
    });
  }
  function parkDashboardBuilder(){
    var page=q('#dashboardPage'); if(!page)return;
    qa('.dash-card-tools,.dash-resize-handle,.dash-placeholder',page).forEach(function(x){x.remove();});
    qa('.dash-minimized',page).forEach(function(x){x.classList.remove('dash-minimized');});
    qa('.dash-custom-ready,.dash-resizable,.dash-drag-float',page).forEach(function(el){
      el.classList.remove('dash-drag-float');
      ['width','height','left','top','right','bottom','position','transform','opacity','minWidth','maxWidth'].forEach(function(p){el.style[p]='';});
    });
    var dock=q('#dashboardDock'); if(dock){dock.innerHTML='';dock.classList.add('hidden');dock.style.display='none';}
  }
  function attachTopActionsToPage(){
    var app=q('#app'); if(!app)return;
    var top=q('body > .top-actions') || q('body > .atsrs-global-top-actions') || q('body > .atsrs-v56-top-actions') || q('body > .atsrs-v64-top-actions') || q('#app > .top-actions');
    if(!top)return;
    if(top.parentElement!==app)app.insertBefore(top,app.firstChild);
    top.classList.remove('atsrs-global-top-actions','atsrs-v56-top-actions','atsrs-v64-top-actions');
    top.classList.add('top-actions');
    top.style.position='absolute';
    top.style.top='18px';
    top.style.right='18px';
    top.style.left='auto';
    top.style.zIndex='90';
  }
  function compactShareProfile(){
    var p=q('#shareProfilePanel'); if(!p)return;
    p.classList.add('atsrs-v127-share-compact');
    var sub=q('#shareSub',p); if(sub)sub.textContent='Share one controlled profile link when needed.';
  }
  function run(){applyBuild();parkDashboardBuilder();attachTopActionsToPage();compactShareProfile();}
  /* Park older interval-based dashboard builder by replacing exposed init with stable cleanup. */
  window.initDashboardBuilderV123=function(){setTimeout(run,0);return true;};
  var oldShow=window.showPage;
  if(typeof oldShow==='function')window.showPage=function(){var r=oldShow.apply(this,arguments);setTimeout(run,30);setTimeout(run,250);return r;};
  var oldRender=window.renderAll;
  if(typeof oldRender==='function')window.renderAll=function(){var r=oldRender.apply(this,arguments);setTimeout(run,30);return r;};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',function(){run();setTimeout(run,300);});
  setTimeout(run,800);
})();

/* ===== extracted from inline script id=ATSRS_V134_REFERENCES_STABLE_SINGLE_SYSTEM_JS ===== */
(function(){
  'use strict';

  var BUILD='ATSRS V231';
  var UPDATE='Last Update: 17 Jul 2026';
  var CONFIGS=[
    {kind:'appraisal',title:'Appraisals',desc:'Upload annual appraisals, performance reviews and evaluation forms.',upload:'Upload',order:10,oldKeys:['atsrs_v105_appraisal_files','appraisalFiles']},
    {kind:'reference',title:'References',desc:'Store reference letters and contact-ready career proof.',upload:'Upload',order:20,oldKeys:['atsrs_v105_reference_files','referenceFiles']},
    {kind:'recommendation',title:'Recommendation Letters',desc:'Store recommendation letters from supervisors, clients and companies.',upload:'Upload',order:30,oldKeys:['recommendationFiles']},
    {kind:'coverLetter',title:'Cover Letter',desc:'Store cover letter versions next to your CV for faster applications.',upload:'Upload',order:40,oldKeys:['coverLetterFiles']}
  ];

  function byId(id){return document.getElementById(id);}
  function q(s,r){return (r||document).querySelector(s);}
  function qa(s,r){return Array.from((r||document).querySelectorAll(s));}
  function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c;});}
  function parse(raw){try{var p=JSON.parse(raw||'[]');return Array.isArray(p)?p:[];}catch(e){return [];}}
  function safeUserId(){try{return (window.currentUser&&window.currentUser.id)?window.currentUser.id:'local_test_user';}catch(e){return 'local_test_user';}}
  function scopedKey(name){try{if(typeof window.localKey==='function'&&window.currentUser&&window.currentUser.id)return window.localKey(name);}catch(e){} return 'atsrs_'+safeUserId()+'_'+name;}
  function newKey(kind){return scopedKey('v134_'+kind+'_files');}
  function label(n){return n>0?(n+' File'+(n>1?'s':'')):'No File';}

  function readRawKey(k){
    try{return parse(localStorage.getItem(k));}catch(e){return [];}
  }
  function readPossibleStorage(kind,cfg){
    var arr=readRawKey(newKey(kind));
    if(arr.length)return arr;
    var sources=[];
    (cfg.oldKeys||[]).forEach(function(k){
      sources=sources.concat(readRawKey(k));
      sources=sources.concat(readRawKey(scopedKey(k)));
    });
    try{ if(kind!=='coverLetter' && typeof window.getManagedFiles==='function'){var m=window.getManagedFiles(kind); if(Array.isArray(m))sources=sources.concat(m);} }catch(e){}
    var seen={}, out=[];
    sources.forEach(function(f){
      if(!f || !f.name)return;
      var id=f.id || (Date.now()+'_'+Math.random().toString(36).slice(2));
      var key=String(f.name)+'|'+String(f.size||'')+'|'+String(f.updated||f.signedDate||'');
      if(seen[key])return; seen[key]=1;
      out.push({
        id:id,name:f.name,type:f.type||'application/octet-stream',size:f.size||0,
        updated:f.updated||new Date().toISOString(),data:f.data||''
      });
    });
    if(out.length)writeFiles(kind,out);
    return out;
  }
  function readFiles(kind){
    var cfg=CONFIGS.find(function(x){return x.kind===kind;});
    return readPossibleStorage(kind,cfg||{});
  }
  function writeFiles(kind,arr){
    try{localStorage.setItem(newKey(kind),JSON.stringify(Array.isArray(arr)?arr:[]));}catch(e){}
  }

  function setBuild(){
    qa('.build-badge').forEach(function(b){
      var d=b.querySelectorAll('div');
      if(d[0])d[0].textContent=BUILD;
      if(d[1])d[1].textContent=UPDATE;
      if(d[2])d[2].textContent='TEST BUILD';
    });
  }

  function findGrid(){
    return q('#refsPage .ref-grid');
  }
  function findCard(kind){
    if(kind==='coverLetter')return byId('coverLetterCard');
    var titleId=kind==='appraisal'?'appraisalCardTitle':kind==='reference'?'referenceCardTitle':'recommendationCardTitle';
    var title=byId(titleId);
    return title?title.closest('.ref-card'):null;
  }
  function createCard(kind){
    var grid=findGrid(); if(!grid)return null;
    var card=document.createElement('div');
    card.className='ref-card atsrs-v134-career-card';
    if(kind==='coverLetter')card.id='coverLetterCard';
    grid.appendChild(card);
    return card;
  }

  function buildCard(cfg){
    var grid=findGrid(); if(!grid)return;
    var card=findCard(cfg.kind)||createCard(cfg.kind); if(!card)return;
    card.className='ref-card atsrs-v134-career-card'+(cfg.kind==='coverLetter'?' cover-letter-card':'');
    card.style.order=String(cfg.order);
    card.dataset.atsrsV134Kind=cfg.kind;
    var titleId=cfg.kind==='appraisal'?'appraisalCardTitle':cfg.kind==='reference'?'referenceCardTitle':cfg.kind==='recommendation'?'recommendationCardTitle':'coverLetterCardTitle';
    card.innerHTML=
      '<h3 id="'+titleId+'">'+esc(cfg.title)+'</h3>'+
      '<p class="atsrs-v134-desc">'+esc(cfg.desc)+'</p>'+
      '<input id="v134_'+cfg.kind+'_input" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" class="hidden" multiple>'+
      '<div class="atsrs-v134-statusbar"><button id="v134_'+cfg.kind+'_upload" class="atsrs-v134-upload" type="button">Upload</button><select id="v134_'+cfg.kind+'_filter" class="atsrs-v134-filter"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="az">A-Z</option><option value="za">Z-A</option></select><span id="v134_'+cfg.kind+'_status" class="atsrs-v134-status empty">No File</span></div>'+
      '<div id="v134_'+cfg.kind+'_list" class="atsrs-v134-list"><div class="atsrs-v134-empty">No files uploaded yet.</div></div>';
    var btn=byId('v134_'+cfg.kind+'_upload');
    var inp=byId('v134_'+cfg.kind+'_input');
    if(btn&&inp){
      btn.onclick=function(){inp.click();};
      inp.onchange=function(e){handleUpload(cfg.kind,e);};
    }
    var fil=byId('v134_'+cfg.kind+'_filter');
    if(fil){ fil.onchange=function(){ render(); }; }
  }

  function ensureLayout(){
    var grid=findGrid(); if(!grid)return;
    var cvTitle=byId('cvCardTitle');
    var cvCard=cvTitle?cvTitle.closest('.ref-card'):q('#refsPage .cv-card');
    if(cvCard){cvCard.classList.add('cv-card');cvCard.style.order='-100';cvCard.style.gridColumn='1 / -1';}
    CONFIGS.forEach(buildCard);
  }

  function handleUpload(kind,event){
    var files=event.target.files||[]; if(!files.length)return;
    var arr=readFiles(kind), left=files.length;
    Array.prototype.forEach.call(files,function(file){
      var reader=new FileReader();
      reader.onload=function(){
        arr.unshift({id:Date.now()+'_'+Math.random().toString(36).slice(2),name:file.name,type:file.type||'application/octet-stream',size:file.size||0,updated:new Date().toISOString(),data:reader.result});
        left--;
        if(left===0){writeFiles(kind,arr);event.target.value='';render();}
      };
      reader.readAsDataURL(file);
    });
  }

  window.atsrsV134Preview=function(kind,id){
    var f=readFiles(kind).find(function(x){return x.id===id;}); if(!f||!f.data){alert('File preview is not available.');return;}
    var w=window.open('','_blank'); if(w){w.document.write('<title>'+esc(f.name||'File')+'</title><iframe src="'+f.data+'" style="border:0;width:100%;height:100vh"></iframe>');w.document.close();}
  };
  window.atsrsV134Download=function(kind,id){
    var f=readFiles(kind).find(function(x){return x.id===id;}); if(!f||!f.data){alert('File download is not available.');return;}
    var a=document.createElement('a');a.href=f.data;a.download=f.name||('ATSRS-'+kind);document.body.appendChild(a);a.click();a.remove();
  };
  window.atsrsV134Delete=function(kind,id){
    writeFiles(kind,readFiles(kind).filter(function(f){return f.id!==id;})); render();
  };

  function row(kind,f){
    return '<div class="atsrs-v134-row">'+
      '<div><b title="'+esc(f.name)+'">'+esc(f.name||'File')+'</b><span>'+Math.round((f.size||0)/1024)+' KB</span></div>'+
      '<div class="atsrs-v134-actions">'+
      '<button class="secondary" onclick="atsrsV134Preview(\''+kind+'\',\''+esc(f.id)+'\')">Preview</button>'+
      '<button class="secondary" onclick="atsrsV134Download(\''+kind+'\',\''+esc(f.id)+'\')">Download</button>'+
      '<button class="action" onclick="atsrsV134Delete(\''+kind+'\',\''+esc(f.id)+'\')">Delete</button>'+
      '</div></div>';
  }

  function render(){
    setBuild(); ensureLayout();
    CONFIGS.forEach(function(cfg){
      var arr=readFiles(cfg.kind).slice();
      var filter=byId('v134_'+cfg.kind+'_filter');
      var mode=filter?filter.value:'newest';
      arr.sort(function(a,b){
        if(mode==='oldest')return String(a.updated||'').localeCompare(String(b.updated||''));
        if(mode==='az')return String(a.name||'').localeCompare(String(b.name||''));
        if(mode==='za')return String(b.name||'').localeCompare(String(a.name||''));
        return String(b.updated||'').localeCompare(String(a.updated||''));
      });
      var status=byId('v134_'+cfg.kind+'_status');
      var list=byId('v134_'+cfg.kind+'_list');
      if(status){
        status.textContent=label(arr.length);
        status.className='atsrs-v134-status '+(arr.length?'ready':'empty');
      }
      if(filter){
        filter.classList.toggle('active',arr.length>0);
      }
      if(list){
        list.innerHTML=arr.length?arr.map(function(f){return row(cfg.kind,f);}).join(''):'<div class="atsrs-v134-empty">No files uploaded yet.</div>';
      }
    });
  }

  function hideLegacyNoise(){
    qa('#refsPage #appraisalStatusBadge,#refsPage #referenceStatusBadge,#refsPage #recommendationStatusBadge,#refsPage #coverLetterStatusBadge,#refsPage #v105_appraisal_badge,#refsPage #v105_reference_badge,#refsPage .ref-doc-head .badge').forEach(function(x){x.remove();});
  }

  function run(){setBuild();ensureLayout();hideLegacyNoise();render();}

  ['renderAll','showPage','applyLanguage','renderManagedFiles'].forEach(function(name){
    var old=window[name];
    if(typeof old==='function'&&!old.__atsrsV134){
      var wrapped=function(){var r=old.apply(this,arguments);setTimeout(run,40);setTimeout(run,240);return r;};
      wrapped.__atsrsV134=true;
      window[name]=wrapped;
    }
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',function(){run();setTimeout(run,500);});
  setTimeout(run,900);
})();

/* ===== extracted from inline script id=ATSRS_V136_DASHBOARD_STABILITY_DC_CU_JS ===== */
(function(){
  var BUILD='ATSRS V231';
  var UPDATE='Last Update: 17 Jul 2026';
  function q(s,r){return (r||document).querySelector(s)}
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function setBuild(){
    qa('.build-badge').forEach(function(b){
      var d=b.querySelectorAll('div');
      if(d[0])d[0].textContent=BUILD;
      if(d[1])d[1].textContent=UPDATE;
      if(d[2])d[2].textContent='TEST BUILD';
    });
  }
  function clearDashboardStorageOnce(){
    try{
      ['atsrs_dashboard_order_v124','atsrs_dashboard_size_v124','atsrs_dashboard_min_v124'].forEach(function(k){localStorage.removeItem(k);});
    }catch(e){}
  }
  function parkDashboardBuilder(){
    var page=q('#dashboardPage'); if(!page)return;
    qa('.dash-card-tools,.dash-resize-handle,.dash-placeholder',page).forEach(function(x){x.remove();});
    qa('.dash-minimized',page).forEach(function(x){x.classList.remove('dash-minimized');});
    qa('.dash-custom-ready,.dash-resizable,.dash-drag-float',page).forEach(function(el){
      el.classList.remove('dash-drag-float','dash-resizable');
      ['width','height','left','top','right','bottom','transform','opacity','minWidth','maxWidth','zIndex'].forEach(function(p){el.style[p]='';});
      if(el.classList.contains('dash-custom-ready')) el.classList.remove('dash-custom-ready');
    });
    var dock=q('#dashboardDock');
    if(dock){dock.innerHTML='';dock.className='hidden';dock.style.display='none';}
  }
  function attachTopActionsToApp(){
    var app=q('#app'); if(!app)return;
    var top=q('body > .top-actions') || q('body > .atsrs-global-top-actions') || q('body > .atsrs-v56-top-actions') || q('body > .atsrs-v64-top-actions') || q('#app > .top-actions');
    if(!top)return;
    if(top.parentElement!==app)app.insertBefore(top,app.firstChild);
    top.classList.remove('atsrs-global-top-actions','atsrs-v56-top-actions','atsrs-v64-top-actions');
    top.classList.add('top-actions');
    top.removeAttribute('style');
  }
  function stabilizeDashboard(){
    var page=q('#dashboardPage'); if(!page)return;
    var stats=q('.stats-grid',page);
    if(stats){stats.style.cssText=''; qa(':scope > .card',stats).forEach(function(card){card.style.cssText=card.style.cssText.replace(/(?:width|height|left|top|right|bottom|transform|opacity|z-index)\s*:[^;]+;?/gi,'');});}
    var share=q('#shareProfilePanel'); if(share){share.classList.add('atsrs-v136-share-compact');}
  }
  function run(){setBuild();clearDashboardStorageOnce();parkDashboardBuilder();attachTopActionsToApp();stabilizeDashboard();}
  window.initDashboardBuilderV123=function(){setTimeout(run,0);return true;};
  ['showPage','renderAll','applyLanguage'].forEach(function(name){
    var old=window[name];
    if(typeof old==='function' && !old.__atsrsV136){
      var wrapped=function(){var r=old.apply(this,arguments);setTimeout(run,30);setTimeout(run,220);return r;};
      wrapped.__atsrsV136=true; window[name]=wrapped;
    }
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',function(){run();setTimeout(run,500);});
  setTimeout(run,900);
  setInterval(function(){setBuild();parkDashboardBuilder();attachTopActionsToApp();},2500);
})();

/* ===== extracted from inline script id=ATSRS_V137_TOP_ACTIONS_SCROLL_FIX_JS ===== */
(function(){
  var BUILD='ATSRS V231';
  var UPDATE='Last Update: 17 Jul 2026';
  function q(s,r){return (r||document).querySelector(s)}
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function setBuild(){qa('.build-badge').forEach(function(b){var d=b.querySelectorAll('div');if(d[0])d[0].textContent=BUILD;if(d[1])d[1].textContent=UPDATE;if(d[2])d[2].textContent='TEST BUILD';});}
  function topbar(){
    var app=q('#app'); if(!app)return;
    var top=q('#app > .top-actions') || q('#app > .atsrs-global-top-actions') || q('#app > .atsrs-v56-top-actions') || q('#app > .atsrs-v64-top-actions') || q('body > .top-actions') || q('body > .atsrs-global-top-actions') || q('body > .atsrs-v56-top-actions') || q('body > .atsrs-v64-top-actions');
    if(!top)return;
    if(top.parentElement!==app) app.insertBefore(top, app.firstChild);
    top.classList.remove('atsrs-global-top-actions','atsrs-v56-top-actions','atsrs-v64-top-actions');
    top.classList.add('top-actions');
    top.style.setProperty('display',app.classList.contains('hidden')?'none':'flex','important');
    top.style.setProperty('position','absolute','important');
    top.style.setProperty('top',window.innerWidth<=800?'12px':'18px','important');
    top.style.setProperty('right',window.innerWidth<=800?'12px':'18px','important');
    top.style.setProperty('left','auto','important');
    top.style.setProperty('bottom','auto','important');
    top.style.setProperty('z-index','90','important');
    top.style.setProperty('transform','none','important');
    top.style.setProperty('will-change','auto','important');
    top.style.setProperty('position','absolute','important');
    var lang=top.querySelector('.lang-floating,.app-lang-switcher');
    if(lang){lang.style.setProperty('position','relative','important');lang.style.setProperty('top','auto','important');lang.style.setProperty('right','auto','important');lang.style.setProperty('left','auto','important');lang.style.setProperty('bottom','auto','important');lang.style.setProperty('transform','none','important');}
  }
  function run(){setBuild();topbar();}
  window.forceTopControlsFixed=topbar;
  window.v55DockTopActions=topbar;
  window.atsrsV70NormaliseTopActions=topbar;
  ['openApp','showPage','renderAll','applyLanguage','changeLanguage','login','localTestLogin','logout','confirmLogout'].forEach(function(name){
    var old=window[name];
    if(typeof old==='function' && !old.__atsrsV137){
      var wrapped=function(){var r=old.apply(this,arguments);setTimeout(run,0);setTimeout(run,100);setTimeout(run,400);return r;};
      wrapped.__atsrsV137=true; window[name]=wrapped;
    }
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',function(){run();setTimeout(run,300);});
  window.addEventListener('resize',run);
  setTimeout(run,0);setTimeout(run,500);setTimeout(run,1200);
})();

/* ===== extracted from inline script id=ATSRS_V138_CV_PREVIEW_DIRECT_JS ===== */
(function(){
  function dataUrlToBlob(dataUrl){
    var parts=String(dataUrl||'').split(',');
    if(parts.length<2) return null;
    var meta=parts[0]||'';
    var mimeMatch=meta.match(/data:([^;]+)/i);
    var mime=mimeMatch?mimeMatch[1]:'application/octet-stream';
    var binary=atob(parts.slice(1).join(','));
    var len=binary.length;
    var bytes=new Uint8Array(len);
    for(var i=0;i<len;i++) bytes[i]=binary.charCodeAt(i);
    return new Blob([bytes],{type:mime});
  }
  window.previewCV=function(){
    var cv=(typeof getCV==='function')?getCV():null;
    if(!cv){
      if(typeof v48==='function') alert(v48('cvNoFile'));
      else alert('No CV uploaded yet.');
      return;
    }
    try{
      var targetUrl=cv.data;
      if(String(cv.data||'').indexOf('data:')===0){
        var blob=dataUrlToBlob(cv.data);
        if(blob) targetUrl=URL.createObjectURL(blob);
      }
      var w=window.open(targetUrl,'_blank','noopener');
      if(!w){
        var a=document.createElement('a');
        a.href=targetUrl;
        a.target='_blank';
        a.rel='noopener';
        a.click();
      }
      if(targetUrl!==cv.data){setTimeout(function(){try{URL.revokeObjectURL(targetUrl)}catch(e){}},60000);}
    }catch(e){
      if(cv.data){window.open(cv.data,'_blank','noopener');}
    }
  };
})();

/* ===== extracted from inline script id=ATSRS_V141_REFERENCES_CARD_MAXIMIZE_JS ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V231';
  var UPDATE='Last Update: 17 Jul 2026';
  function qa(s,r){return Array.from((r||document).querySelectorAll(s));}
  function setBuild(){
    qa('.build-badge').forEach(function(b){
      var d=b.querySelectorAll('div');
      if(d[0])d[0].textContent=BUILD;
      if(d[1])d[1].textContent=UPDATE;
      if(d[2])d[2].textContent='TEST BUILD';
    });
  }
  function ensureReferenceMaxIcons(){
    var cards=qa('#refsPage .atsrs-v134-career-card');
    cards.forEach(function(card){
      if(card.querySelector('.atsrs-v134-max-icon'))return;
      var btn=document.createElement('button');
      btn.type='button';
      btn.className='atsrs-v134-max-icon';
      btn.setAttribute('aria-label','Maximize card');
      btn.title='Maximize';
      btn.textContent='□';
      btn.onclick=function(e){
        e.preventDefault();
        e.stopPropagation();
        var expanded=card.classList.toggle('atsrs-v141-expanded');
        btn.textContent=expanded?'—':'□';
        btn.title=expanded?'Minimize':'Maximize';
        btn.setAttribute('aria-label',expanded?'Minimize card':'Maximize card');
      };
      card.appendChild(btn);
    });
  }
  function run(){setBuild();ensureReferenceMaxIcons();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',function(){run();setTimeout(run,250);setTimeout(run,900);});
  ['renderAll','showPage','applyLanguage'].forEach(function(name){
    var old=window[name];
    if(typeof old==='function'&&!old.__atsrsV141){
      var wrapped=function(){var r=old.apply(this,arguments);setTimeout(run,50);setTimeout(run,300);return r;};
      wrapped.__atsrsV141=true;
      window[name]=wrapped;
    }
  });
  setInterval(function(){if(document.getElementById('refsPage'))run();},1500);
})();
