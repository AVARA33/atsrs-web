(function(){
  'use strict';

  var KINDS=['appraisal','reference','recommendation','coverLetter'];
  var LABELS={appraisal:'Appraisals',reference:'Reference Letters',recommendation:'Recommendations',coverLetter:'Cover Letters'};
  var activeKind='appraisal';
  var scheduled=false;
  var mutating=false;

  function q(selector,root){return (root||document).querySelector(selector);}
  function qa(selector,root){return Array.from((root||document).querySelectorAll(selector));}
  function card(kind){return q('#refsPage .atsrs-v134-career-card[data-atsrs-v134-kind="'+kind+'"]');}
  function count(kind){var list=q('#v134_'+kind+'_list');return list?qa('.atsrs-v134-row',list).length:0;}
  function icon(name){return '<i class="ph ph-'+name+'" aria-hidden="true"></i>';}

  function ensureSummary(page){
    var summary=q('.atsrs-references-summary',page);
    if(summary)return summary;
    summary=document.createElement('div');
    summary.className='atsrs-references-summary';
    summary.setAttribute('aria-label','Reference document summary');
    q('#refsSub',page).insertAdjacentElement('afterend',summary);
    return summary;
  }

  function ensureControls(grid){
    var controls=q('.atsrs-references-controls',grid);
    if(controls)return controls;
    controls=document.createElement('section');
    controls.className='atsrs-references-controls';
    controls.innerHTML=
      '<div class="atsrs-reference-tabs" role="tablist" aria-label="Reference document types"></div>'+
      '<div class="atsrs-reference-tools">'+
        '<label class="atsrs-reference-search">'+icon('magnifying-glass')+'<span class="sr-only">Search documents</span><input type="search" placeholder="Search documents..." autocomplete="off"></label>'+
        '<div class="atsrs-reference-filter-wrap"><button class="atsrs-reference-filter-button" type="button" aria-expanded="false">'+icon('sliders-horizontal')+'<span>Filters</span></button>'+
          '<div class="atsrs-reference-filter-menu" hidden><button type="button" data-sort="newest">Newest first</button><button type="button" data-sort="oldest">Oldest first</button><button type="button" data-sort="az">A–Z</button><button type="button" data-sort="za">Z–A</button></div></div>'+
        '<button class="atsrs-reference-upload-button" type="button">'+icon('upload-simple')+'<span>Upload Document</span></button>'+
      '</div>';
    grid.appendChild(controls);

    var tabs=q('.atsrs-reference-tabs',controls);
    KINDS.forEach(function(kind){
      var button=document.createElement('button');
      button.type='button';
      button.dataset.referenceTab=kind;
      button.setAttribute('role','tab');
      button.innerHTML='<span>'+LABELS[kind]+'</span><small data-reference-count="'+kind+'">0</small>';
      button.addEventListener('click',function(){activeKind=kind;applyActiveState();});
      tabs.appendChild(button);
    });
    q('input',controls).addEventListener('input',applySearch);
    q('.atsrs-reference-upload-button',controls).addEventListener('click',function(){var button=q('#v134_'+activeKind+'_upload');if(button)button.click();});
    var filterButton=q('.atsrs-reference-filter-button',controls);
    var menu=q('.atsrs-reference-filter-menu',controls);
    filterButton.addEventListener('click',function(){var open=menu.hidden;menu.hidden=!open;filterButton.setAttribute('aria-expanded',String(open));});
    qa('[data-sort]',menu).forEach(function(button){
      button.addEventListener('click',function(){
        var select=q('#v134_'+activeKind+'_filter');
        if(select){select.value=button.dataset.sort;select.dispatchEvent(new Event('change',{bubbles:true}));}
        menu.hidden=true;filterButton.setAttribute('aria-expanded','false');
      });
    });
    document.addEventListener('click',function(event){if(!controls.contains(event.target)){menu.hidden=true;filterButton.setAttribute('aria-expanded','false');}});
    return controls;
  }

  function ensureTableHead(target){
    if(!target||q('.atsrs-reference-table-head',target))return;
    var list=q('.atsrs-v134-list',target);
    if(!list)return;
    var head=document.createElement('div');
    head.className='atsrs-reference-table-head';
    head.innerHTML='<span>Document Name</span><span>Category</span><span>Date</span><span>Size</span><span>Actions</span>';
    list.insertAdjacentElement('beforebegin',head);
  }

  function decorateCv(page){
    var cv=q('.cv-card',page);if(!cv)return;
    var title=q('#cvCardTitle',cv);if(title&&title.textContent!=='Main CV')title.textContent='Main CV';
    var copy=q('#cvCardText',cv);if(copy&&copy.textContent!=='This is your profile’s Main CV used across ATSRS.')copy.textContent='This is your profile’s Main CV used across ATSRS.';
    var betaTitle=q('#cvBetaTitle',cv);if(betaTitle&&betaTitle.textContent!=='AI CV Generator')betaTitle.textContent='AI CV Generator';
    var betaCopy='Enhance your CV with AI. Upload a temporary source CV; your Profile Main CV will not be changed.';
    var betaText=q('#cvBetaText',cv);if(betaText&&betaText.textContent!==betaCopy)betaText.textContent=betaCopy;
    var badge=q('#cvBetaBadge',cv);if(badge&&badge.textContent!=='AI CV GENERATOR')badge.textContent='AI CV GENERATOR';
    var upload=q('#uploadCVBtn',cv);if(upload&&!q('i',upload))upload.innerHTML=icon('upload-simple')+'<span>Upload / Replace Main CV</span>';
    var aiUpload=q('#uploadCvFromGeneratorBtn',cv);if(aiUpload&&!q('i',aiUpload))aiUpload.innerHTML=icon('upload-simple')+'<span>Upload / Replace CV</span>';
    var generate=q('#generateCVBtn',cv);if(generate&&!q('i',generate))generate.innerHTML=icon('sparkle')+'<span>Generate CV</span>';
    var reset=q('#resetCvGeneratorBtn',cv);if(reset&&!q('i',reset))reset.innerHTML=icon('arrow-counter-clockwise')+'<span>Reset</span>';
    var mainIdentity=q('.atsrs-v156-main-identity',cv);
    if(mainIdentity&&!q('.atsrs-main-cv-icon',mainIdentity))mainIdentity.insertAdjacentHTML('afterbegin','<i class="ph ph-file-text atsrs-main-cv-icon" aria-hidden="true"></i>');
    qa('.atsrs-v156-actions',cv).forEach(function(actions){
      qa('button',actions).forEach(function(button){
        var text=button.textContent.trim();
        if(q('i',button))return;
        if(text==='Preview')button.innerHTML=icon('eye')+'<span>Preview</span>';
        else if(text==='Download')button.innerHTML=icon('download-simple')+'<span>Download</span>';
        else if(text==='Replace')button.innerHTML=icon('arrows-clockwise')+'<span>Replace</span>';
        else if(text==='Delete')button.innerHTML=icon('trash')+'<span>Delete</span>';
        else if(text==='Set as Main')button.innerHTML=icon('star')+'<span>Set as Main</span>';
      });
      var mainRow=actions.closest('.atsrs-v156-main-row:not(.atsrs-v156-additional-row)');
      if(mainRow){
        var preferred=['Preview','Download','Replace','Delete'];
        var current=qa('button',actions).map(function(button){return button.textContent.trim();});
        if(current.join('|')!==preferred.join('|'))preferred.forEach(function(label){var button=qa('button',actions).find(function(item){return item.textContent.trim()===label;});if(button)actions.appendChild(button);});
      }
    });
  }

  function decorateRows(page){
    qa('.atsrs-v134-row',page).forEach(function(row){
      var actions=q('.atsrs-v134-actions',row);if(!actions)return;
      qa('button',actions).forEach(function(button){
        var text=button.textContent.trim();
        if(q('i',button))return;
        if(text==='Preview')button.innerHTML=icon('eye')+'<span>Preview</span>';
        else if(text==='Download')button.innerHTML=icon('download-simple')+'<span>Download</span>';
        else if(text==='Delete')button.innerHTML=icon('dots-three')+'<span class="sr-only">More actions</span>';
      });
    });
  }

  function updateSummary(page){
    var summary=ensureSummary(page);
    var ready=q('#cvStatusBadge',page)&&q('#cvStatusBadge',page).classList.contains('badge-ready');
    var html=
      '<div class="is-primary">'+icon(ready?'check-circle':'warning-circle')+'<span>'+(ready?'Main CV ready':'Main CV missing')+'</span></div>'+
      KINDS.map(function(kind){return '<div>'+icon(kind==='appraisal'?'clipboard-text':kind==='recommendation'?'seal-check':'file-text')+'<span>'+count(kind)+' '+LABELS[kind].toLowerCase()+'</span></div>';}).join('');
    if(summary.innerHTML!==html)summary.innerHTML=html;
    qa('[data-reference-count]',page).forEach(function(el){var value=String(count(el.dataset.referenceCount));if(el.textContent!==value)el.textContent=value;});
  }

  function applySearch(){
    var controls=q('#refsPage .atsrs-references-controls');if(!controls)return;
    var term=q('input',controls).value.trim().toLowerCase();
    var target=card(activeKind);if(!target)return;
    qa('.atsrs-v134-row',target).forEach(function(row){row.hidden=!!term&&!row.textContent.toLowerCase().includes(term);});
  }

  function applyActiveState(){
    var page=q('#refsPage');if(!page)return;
    KINDS.forEach(function(kind){
      var target=card(kind);var button=q('[data-reference-tab="'+kind+'"]',page);var active=kind===activeKind;
      if(target){target.classList.toggle('is-active-reference-tab',active);target.hidden=!active;}
      if(button){button.classList.toggle('is-active',active);button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;}
    });
    var input=q('.atsrs-reference-search input',page);if(input)input.value='';
    applySearch();
  }

  function run(){
    var page=q('#refsPage');var grid=page&&q('.ref-grid',page);if(!page||!grid||mutating)return;
    mutating=true;
    try{
      var title=q('#refsTitle',page);if(title&&title.textContent!=='References')title.textContent='References';
      var sub=q('#refsSub',page);if(sub&&sub.textContent!=='Manage your career proof materials in one place.')sub.textContent='Manage your career proof materials in one place.';
      ensureControls(grid);
      KINDS.forEach(function(kind){ensureTableHead(card(kind));});
      decorateCv(page);decorateRows(page);updateSummary(page);applyActiveState();
      page.dataset.referencesWorkspace='v5984';
    }finally{mutating=false;}
  }

  function schedule(){if(scheduled||mutating)return;scheduled=true;requestAnimationFrame(function(){scheduled=false;run();});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',function(){run();setTimeout(run,500);setTimeout(run,1400);});
  document.addEventListener('atsrs:cv-state',schedule);
  var observer=new MutationObserver(schedule);
  var attach=function(){var page=q('#refsPage');if(page){observer.observe(page,{childList:true,subtree:true});run();}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach);else attach();
})();
