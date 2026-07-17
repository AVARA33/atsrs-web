/* ATSRS V178 extracted JavaScript batch: references.js. Loaded in original V178 execution order. No placeholder code. */
/* ===== extracted from inline script id=ATSRS_V142_REFERENCES_ICON_EXPAND_JS ===== */
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
  function applyIcons(){
    qa('#refsPage .atsrs-v134-career-card').forEach(function(card){
      var btn=card.querySelector('.atsrs-v134-max-icon');
      if(!btn){
        btn=document.createElement('button');
        btn.type='button';
        btn.className='atsrs-v134-max-icon';
        card.appendChild(btn);
      }
      btn.textContent=card.classList.contains('atsrs-v142-expanded')||card.classList.contains('atsrs-v141-expanded')?'⤡':'⤢';
      btn.title=card.classList.contains('atsrs-v142-expanded')||card.classList.contains('atsrs-v141-expanded')?'Minimize':'Maximize';
      btn.setAttribute('aria-label',btn.title+' card');
      btn.onclick=function(e){
        e.preventDefault();
        e.stopPropagation();
        var isExpanded=card.classList.contains('atsrs-v142-expanded')||card.classList.contains('atsrs-v141-expanded');
        card.classList.toggle('atsrs-v142-expanded',!isExpanded);
        card.classList.remove('atsrs-v141-expanded');
        btn.textContent=!isExpanded?'⤡':'⤢';
        btn.title=!isExpanded?'Minimize':'Maximize';
        btn.setAttribute('aria-label',btn.title+' card');
      };
    });
  }
  function run(){setBuild();applyIcons();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',function(){run();setTimeout(run,250);setTimeout(run,900);});
  ['renderAll','showPage','applyLanguage'].forEach(function(name){
    var old=window[name];
    if(typeof old==='function'&&!old.__atsrsV142){
      var wrapped=function(){var r=old.apply(this,arguments);setTimeout(run,50);setTimeout(run,300);return r;};
      wrapped.__atsrsV142=true;
      window[name]=wrapped;
    }
  });
  setInterval(function(){if(document.getElementById('refsPage'))run();},1200);
})();

/* ===== extracted from inline script id=ATSRS_V144_REFERENCES_OVERLAY_MAXIMIZE_JS ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V231';
  var UPDATE='Last Update: 17 Jul 2026';
  function qa(s,r){return Array.from((r||document).querySelectorAll(s));}
  function q(s,r){return (r||document).querySelector(s);}
  function setBuild(){
    qa('.build-badge').forEach(function(b){
      var d=b.querySelectorAll('div');
      if(d[0])d[0].textContent=BUILD;
      if(d[1])d[1].textContent=UPDATE;
      if(d[2])d[2].textContent='TEST BUILD';
    });
  }
  function grid(){return q('#refsPage .ref-grid');}
  function careerCards(){return qa('#refsPage .atsrs-v134-career-card');}
  function firstCareerTop(g){
    var cards=careerCards();
    if(!g || !cards.length)return 0;
    var gr=g.getBoundingClientRect();
    var top=Math.min.apply(null,cards.map(function(c){return c.getBoundingClientRect().top;}));
    return Math.max(0, Math.round(top-gr.top+g.scrollTop));
  }
  function removePlaceholder(card){
    var phId=card&&card.getAttribute('data-v144-placeholder');
    if(phId){var ph=document.getElementById(phId); if(ph)ph.remove(); card.removeAttribute('data-v144-placeholder');}
    if(card){
      var old=card.getAttribute('data-v143-placeholder');
      if(old){var oldPh=document.getElementById(old); if(oldPh)oldPh.remove(); card.removeAttribute('data-v143-placeholder');}
    }
  }
  function setIcon(card,on){
    var btn=card.querySelector('.atsrs-v134-max-icon');
    if(btn){btn.textContent=on?'⤡':'⤢';btn.title=on?'Minimize':'Maximize';btn.setAttribute('aria-label',btn.title+' card');}
  }
  function collapse(card){
    if(!card)return;
    card.classList.remove('atsrs-v144-expanded','atsrs-v143-expanded','atsrs-v142-expanded','atsrs-v141-expanded');
    removePlaceholder(card);
    setIcon(card,false);
    var g=grid();
    if(g && !q('#refsPage .atsrs-v134-career-card.atsrs-v144-expanded')){
      g.classList.remove('atsrs-v144-overlay-active','atsrs-v143-overlay-active');
      g.style.removeProperty('--atsrs-v144-overlay-top');
    }
  }
  function collapseAll(except){
    careerCards().forEach(function(c){if(c!==except)collapse(c);});
    qa('#refsPage .atsrs-v143-placeholder').forEach(function(p){p.remove();});
  }
  function expand(card){
    var g=grid(); if(!g || !card)return;
    collapseAll(card);
    removePlaceholder(card);
    g.style.setProperty('--atsrs-v144-overlay-top', firstCareerTop(g)+'px');
    var ph=document.createElement('div');
    ph.className='ref-card atsrs-v144-placeholder';
    ph.id='atsrsV144Ph_'+Math.random().toString(36).slice(2);
    ph.style.order=card.style.order || getComputedStyle(card).order || '0';
    ph.style.gridColumn=getComputedStyle(card).gridColumn || 'auto';
    ph.style.minHeight=Math.max(card.getBoundingClientRect().height,580)+'px';
    card.parentNode.insertBefore(ph,card);
    card.setAttribute('data-v144-placeholder',ph.id);
    g.classList.add('atsrs-v144-overlay-active');
    g.classList.remove('atsrs-v143-overlay-active');
    card.classList.remove('atsrs-v143-expanded','atsrs-v142-expanded','atsrs-v141-expanded');
    card.classList.add('atsrs-v144-expanded');
    setIcon(card,true);
  }
  function bind(){
    setBuild();
    qa('#refsPage .atsrs-v143-placeholder').forEach(function(p){p.remove();});
    careerCards().forEach(function(card){
      card.classList.remove('atsrs-v143-expanded');
      var btn=card.querySelector('.atsrs-v134-max-icon');
      if(!btn){btn=document.createElement('button');btn.type='button';btn.className='atsrs-v134-max-icon';card.appendChild(btn);}
      setIcon(card,card.classList.contains('atsrs-v144-expanded'));
      btn.onclick=function(e){
        e.preventDefault(); e.stopPropagation();
        if(card.classList.contains('atsrs-v144-expanded'))collapse(card); else expand(card);
        return false;
      };
    });
  }
  function run(){bind();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',function(){run();setTimeout(run,250);setTimeout(run,900);});
  ['renderAll','showPage','applyLanguage'].forEach(function(name){
    var old=window[name];
    if(typeof old==='function'&&!old.__atsrsV144){
      var wrapped=function(){var r=old.apply(this,arguments);setTimeout(run,80);setTimeout(run,350);return r;};
      wrapped.__atsrsV144=true;
      window[name]=wrapped;
    }
  });
  setInterval(function(){if(document.getElementById('refsPage'))run();},500);
})();

/* ===== extracted from inline script id=ATSRS_V145_REFERENCES_FULL_WIDTH_STACK_JS ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V231';
  var UPDATE='Last Update: 17 Jul 2026';
  function qa(s,r){return Array.from((r||document).querySelectorAll(s));}
  function q(s,r){return (r||document).querySelector(s);}
  function setBuild(){qa('.build-badge').forEach(function(b){var d=b.querySelectorAll('div');if(d[0])d[0].textContent=BUILD;if(d[1])d[1].textContent=UPDATE;if(d[2])d[2].textContent='TEST BUILD';});}
  function normalizeRefs(){
    setBuild();
    var grid=q('#refsPage .ref-grid');
    if(grid){
      grid.classList.remove('atsrs-v144-overlay-active','atsrs-v143-overlay-active');
      grid.style.removeProperty('--atsrs-v144-overlay-top');
    }
    qa('#refsPage .atsrs-v143-placeholder,#refsPage .atsrs-v144-placeholder').forEach(function(x){x.remove();});
    qa('#refsPage .atsrs-v134-career-card').forEach(function(card){
      card.classList.remove('atsrs-v144-expanded','atsrs-v143-expanded','atsrs-v142-expanded','atsrs-v141-expanded');
      card.removeAttribute('data-v144-placeholder');
      card.removeAttribute('data-v143-placeholder');
      var kind=card.getAttribute('data-atsrs-v134-kind');
      if(kind==='appraisal')card.style.order='10';
      if(kind==='reference')card.style.order='20';
      if(kind==='recommendation')card.style.order='30';
      if(kind==='coverLetter')card.style.order='40';
      qa('.atsrs-v134-max-icon',card).forEach(function(b){b.remove();});
    });
    var cv=q('#refsPage .cv-card'); if(cv)cv.style.order='0';
  }
  function run(){setBuild();normalizeRefs();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',function(){run();setTimeout(run,250);setTimeout(run,900);});
  ['renderAll','showPage','applyLanguage'].forEach(function(name){
    var old=window[name];
    if(typeof old==='function'&&!old.__atsrsV145){
      var wrapped=function(){var r=old.apply(this,arguments);setTimeout(run,80);setTimeout(run,350);return r;};
      wrapped.__atsrsV145=true; window[name]=wrapped;
    }
  });
  setInterval(function(){if(document.getElementById('refsPage')&&!document.getElementById('refsPage').classList.contains('hidden'))normalizeRefs();},700);
})();

/* ===== extracted from inline script id=ATSRS_V146_REFERENCES_COMPACT_LIST_FIVE_FILES_SCROLL_JS ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V231';
  var UPDATE='Last Update: 17 Jul 2026';
  function byId(id){return document.getElementById(id);}
  function qa(s,r){return Array.from((r||document).querySelectorAll(s));}
  function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function readJson(k,d){try{var v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}}
  function writeJson(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
  function setBuild(){qa('.build-badge').forEach(function(b){var d=b.querySelectorAll('div');if(d[0])d[0].textContent=BUILD;if(d[1])d[1].textContent=UPDATE;if(d[2])d[2].textContent='TEST BUILD';});}
  function fileRow(kind,f,api){
    return '<div class="atsrs-v146-row">'+
      '<div class="atsrs-v146-name"><b title="'+esc(f.name)+'">'+esc(f.name||'File')+'</b><span class="atsrs-v146-size">'+Math.round((f.size||0)/1024)+' KB</span></div>'+
      '<div class="atsrs-v146-actions"><button class="secondary" onclick="'+api+'.preview(\''+esc(kind)+'\',\''+esc(f.id)+'\')">Preview</button><button class="secondary" onclick="'+api+'.download(\''+esc(kind)+'\',\''+esc(f.id)+'\')">Download</button><button class="action" onclick="'+api+'.del(\''+esc(kind)+'\',\''+esc(f.id)+'\')">Delete</button></div>'+
    '</div>';
  }
  function openFile(f){if(!f||!f.data){alert('File preview is not available.');return;}var w=window.open('','_blank');if(w){w.document.write('<title>'+esc(f.name||'File')+'</title><iframe src="'+f.data+'" style="border:0;width:100%;height:100vh"></iframe>');w.document.close();}}
  function dlFile(f,prefix){if(!f||!f.data){alert('File download is not available.');return;}var a=document.createElement('a');a.href=f.data;a.download=f.name||prefix;document.body.appendChild(a);a.click();a.remove();}
  window.atsrsV146CV={
    files:function(){var a=readJson('cvFiles',[]);return Array.isArray(a)?a:[];},
    save:function(a){writeJson('cvFiles',Array.isArray(a)?a:[]);},
    preview:function(kind,id){openFile(this.files().find(function(x){return x.id===id;})||this.files()[0]);},
    download:function(kind,id){dlFile(this.files().find(function(x){return x.id===id;})||this.files()[0],'ATSRS-CV');},
    del:function(kind,id){this.save(this.files().filter(function(x){return x.id!==id;})); renderCVStatus();}
  };
  window.handleCVUpload=function(event){
    var files=event.target.files||[]; if(!files.length)return; var saved=window.atsrsV146CV.files(), left=files.length;
    Array.prototype.forEach.call(files,function(file){var reader=new FileReader();reader.onload=function(){saved.unshift({id:Date.now()+'_'+Math.random().toString(36).slice(2),name:file.name,type:file.type||'application/octet-stream',size:file.size||0,updated:new Date().toISOString(),data:reader.result}); if(--left===0){window.atsrsV146CV.save(saved);event.target.value='';renderCVStatus();}};reader.readAsDataURL(file);});
  };
  window.previewCV=function(){window.atsrsV146CV.preview('cv','');};
  window.downloadCV=function(){window.atsrsV146CV.download('cv','');};
  window.deleteCV=function(){var a=window.atsrsV146CV.files(); if(!a.length){alert('No CV uploaded yet.');return;} window.atsrsV146CV.save([]); var input=byId('cvUploadInput'); if(input)input.value=''; renderCVStatus();};
  window.renderCVStatus=function(){
    var files=window.atsrsV146CV.files();
    var badge=byId('cvStatusBadge'); if(badge){badge.textContent=files.length?(files.length+' file'+(files.length>1?'s':'')):'No File';badge.className='badge '+(files.length?'badge-ready':'badge-blocked');}
    var info=byId('cvFileInfo'); if(info){info.classList.add('atsrs-v146-list');info.innerHTML=files.length?files.map(function(f){return fileRow('cv',f,'atsrsV146CV');}).join(''):'<div class="atsrs-v146-empty">No files uploaded yet.</div>';}
    var t=byId('cvCardTitle'); if(t)t.textContent='CV / Resume';
    var b=byId('uploadCVBtn'); if(b)b.textContent='Upload CV';
    var p=byId('previewCVBtn'); if(p)p.textContent='Preview';
    var d=byId('downloadCVBtn'); if(d)d.textContent='Download';
    var del=byId('deleteCVBtn'); if(del)del.textContent='Delete';
  };
  window.atsrsV146Cover={
    files:function(){var a=readJson('coverLetterFiles',[]);return Array.isArray(a)?a:[];},
    save:function(a){writeJson('coverLetterFiles',Array.isArray(a)?a:[]);},
    preview:function(kind,id){openFile(this.files().find(function(x){return x.id===id;})||this.files()[0]);},
    download:function(kind,id){dlFile(this.files().find(function(x){return x.id===id;})||this.files()[0],'ATSRS-cover-letter');},
    del:function(kind,id){this.save(this.files().filter(function(x){return x.id!==id;})); renderCoverLetterV146();}
  };
  function renderCoverLetterV146(){
    var info=byId('coverLetterFileInfo'), badge=byId('coverLetterStatusBadge'), files=window.atsrsV146Cover.files();
    if(badge){badge.textContent=files.length?(files.length+' file'+(files.length>1?'s':'')):'No File';badge.className='badge '+(files.length?'badge-ready':'badge-blocked');}
    if(info){info.classList.add('atsrs-v146-list');info.innerHTML=files.length?files.map(function(f){return fileRow('coverLetter',f,'atsrsV146Cover');}).join(''):'<div class="atsrs-v146-empty">No files uploaded yet.</div>';}
    var p=byId('previewCoverLetterBtn'); if(p)p.textContent='Preview';
    var d=byId('downloadCoverLetterBtn'); if(d)d.textContent='Download';
    var del=byId('deleteCoverLetterBtn'); if(del)del.textContent='Delete';
  }
  window.previewCoverLetter=function(){window.atsrsV146Cover.preview('coverLetter','');};
  window.downloadCoverLetter=function(){window.atsrsV146Cover.download('coverLetter','');};
  window.deleteCoverLetter=function(){var a=window.atsrsV146Cover.files(); if(!a.length){alert('No cover letter uploaded yet.');return;} window.atsrsV146Cover.save([]);renderCoverLetterV146();};
  function normalizeRefs(){
    setBuild();
    var grid=document.querySelector('#refsPage .ref-grid'); if(grid)grid.classList.remove('atsrs-v144-overlay-active','atsrs-v143-overlay-active');
    qa('#refsPage .atsrs-v143-placeholder,#refsPage .atsrs-v144-placeholder,#refsPage .atsrs-v134-max-icon').forEach(function(x){x.remove();});
    qa('#refsPage .atsrs-v134-career-card').forEach(function(card){card.classList.remove('atsrs-v144-expanded','atsrs-v143-expanded','atsrs-v142-expanded','atsrs-v141-expanded');});
    renderCVStatus(); renderCoverLetterV146();
  }
  function run(){try{normalizeRefs();}catch(e){setBuild();}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',function(){run();setTimeout(run,250);setTimeout(run,900);});
  ['renderAll','showPage','applyLanguage'].forEach(function(name){var old=window[name];if(typeof old==='function'&&!old.__atsrsV146){var wrapped=function(){var r=old.apply(this,arguments);setTimeout(run,80);setTimeout(run,350);return r;};wrapped.__atsrsV146=true;window[name]=wrapped;}});
  setInterval(function(){var refs=byId('refsPage');if(refs&&!refs.classList.contains('hidden'))run();},900);
})();

/* ===== extracted from inline script id=ATSRS_V147_BUILD_LABEL_SCRIPT ===== */
(function(){
  function qa(s,r){return Array.from((r||document).querySelectorAll(s));}
  function setBuild(){qa('.build-badge').forEach(function(b){var d=b.querySelectorAll('div');if(d[0])d[0].textContent='ATSRS V231';if(d[1])d[1].textContent='Last Update: 17 Jul 2026';});}
  setBuild();
  document.addEventListener('DOMContentLoaded',setBuild);
  setTimeout(setBuild,300);
})();
