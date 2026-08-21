/* ATSRS canonical floating-border field standard. */
(function(){
  'use strict';

  var observer=null;
  var scheduled=false;
  var generatedSequence=0;
  var controlSelector='input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="button"]):not([type="submit"]):not([type="reset"]),select:not([multiple]),textarea';
  var fieldContainers='.field-wrap,.jobs-filter-field,.jobs-secondary-field,.personnel-search-field,.personnel-combobox-field,.personnel-select-field,.talent-search-field,.atsrs-document-filter,.profile-labeled-field,.work-type-field,.talent-summary-filter';
  var frameSelector='.atsrs-disclosure-shell,.jobs-select-host,.jobs-search-control,.personnel-combobox,.personnel-select-shell,.phone-field,.work-type-select,.talent-work-type-filter';
  var labelFallbacks={
    cPerson:'Personnel',crewSearch:'Search',crewCompanyFilter:'Company',crewPositionFilter:'Profession',crewStatusFilter:'Status',
    profilePhoneLocal:'Mobile phone',profileWhatsappLocal:'WhatsApp number',certDocumentFilter:'Filter',
    v134_appraisal_filter:'Sort appraisals',v134_reference_filter:'Sort references',
    v134_recommendation_filter:'Sort recommendations',v134_coverLetter_filter:'Sort cover letters'
  };

  function clean(value){return String(value==null?'':value).replace(/\s+/g,' ').trim()}
  function escapeSelector(value){
    if(window.CSS&&typeof window.CSS.escape==='function')return window.CSS.escape(value);
    return String(value).replace(/["\\]/g,'\\$&');
  }
  function eligible(control){
    if(!control||control.nodeType!==1||!control.matches(controlSelector))return false;
    if(control.closest('.atsrs-select-menu,.date-pop,.datepicker-popover,.atsrs-date-picker,[role="listbox"]'))return false;
    if(control.parentElement&&control.parentElement.closest('.hidden,[hidden],[aria-hidden="true"]'))return false;
    return true;
  }
  function labelValue(node){
    if(!node)return '';
    var clone=node.cloneNode(true);
    clone.querySelectorAll('input,select,textarea,button,.atsrs-select-menu,.personnel-combobox-options,.work-type-select-menu,.small-note,.phone-verification-note').forEach(function(item){item.remove()});
    return clean(clone.textContent);
  }
  function labelledText(control){
    var direct=clean(control.getAttribute('aria-label'));
    if(direct)return direct.replace(/:\s*[^:]+$/,'');
    var labelled=clean(control.getAttribute('aria-labelledby'));
    if(labelled){
      var text=labelled.split(/\s+/).map(function(id){var node=document.getElementById(id);return labelValue(node)}).filter(Boolean).join(' ');
      if(text)return text;
    }
    if(control.id){
      var explicit=document.querySelector('label[for="'+escapeSelector(control.id)+'"]');
      var explicitText=labelValue(explicit);
      if(explicitText)return explicitText;
    }
    var nested=control.closest('label');
    var nestedText=labelValue(nested);
    if(nestedText)return nestedText;
    if(control.id&&labelFallbacks[control.id])return labelFallbacks[control.id];
    if(clean(control.title))return clean(control.title);
    if(clean(control.placeholder))return clean(control.placeholder).replace(/\.{3}$/,'');
    return clean((control.id||control.name||'Field').replace(/^profile|Filter$/g,'').replace(/([a-z])([A-Z])/g,'$1 $2'))||'Field';
  }
  function directTextLabel(shell){
    var value='';
    Array.from(shell.childNodes).forEach(function(node){
      if(node.nodeType===3&&clean(node.nodeValue)&&!value){value=clean(node.nodeValue);node.nodeValue=''}
    });
    return value;
  }
  function labelCandidate(shell,control){
    var direct=Array.from(shell.children||[]).find(function(child){
      if(child===control||child.matches('input,select,textarea,button'))return false;
      if(child.matches(frameSelector)||child.querySelector(controlSelector))return false;
      if(child.matches('.small-note,.phone-verification-note,.personnel-combobox-options,.work-type-select-menu'))return false;
      if(child.matches('label,.field-label,.phone-entry-label'))return true;
      return child.matches('span,b')&&!!labelValue(child);
    });
    return direct||null;
  }
  function frameFor(control){
    return control.closest(frameSelector)||control;
  }
  function createShell(control,frame){
    var shell=document.createElement('div');
    shell.className='atsrs-field-shell atsrs-generated-field-shell';
    if(!control.id)control.id='atsrsField'+(++generatedSequence);
    frame.parentNode.insertBefore(shell,frame);
    shell.appendChild(frame);
    return shell;
  }
  function shellFor(control){
    var phone=control.closest('.phone-field');
    if(phone){
      var entry=phone.closest('.phone-entry'),phoneLabel=entry&&entry.querySelector(':scope > .phone-entry-label');
      if(phoneLabel){
        if(!phoneLabel.id)phoneLabel.id='atsrsFieldLabel'+(++generatedSequence);
        if(!clean(control.getAttribute('aria-label'))&&!clean(control.getAttribute('aria-labelledby')))control.setAttribute('aria-labelledby',phoneLabel.id);
        if(!phone.contains(phoneLabel))phone.insertBefore(phoneLabel,phone.firstChild);
      }
      return phone;
    }
    var nested=control.closest('label');
    if(nested&&!nested.matches('.jobs-compact-check,.share-document-choice,.share-expiry-option,.share-select-all,.cv-enhancement-consent,.atsrs-ai-consent-check,.assignment-primary,.project-member-select'))return nested;
    var container=control.closest(fieldContainers);
    if(container)return container;
    var frame=frameFor(control);
    var parent=frame.parentElement;
    if(parent&&parent.children.length<=3){
      var external=Array.from(parent.children).find(function(child){return child!==frame&&child.matches('label[for],.field-label')&&labelValue(child)});
      if(external){
        var generated=createShell(control,frame);
        external.classList.remove('atsrs-field-source-label');
        generated.insertBefore(external,generated.firstChild);
        return generated;
      }
    }
    return createShell(control,frame);
  }
  function ensureLabel(shell,control){
    var label=shell.querySelector(':scope > .atsrs-field-label');
    if(label)return label;
    var candidate=labelCandidate(shell,control);
    var text=candidate?labelValue(candidate):directTextLabel(shell);
    if(!text)text=labelledText(control);
    if(candidate){
      label=candidate;
      label.classList.add('atsrs-field-label');
    }else{
      label=document.createElement(shell.tagName==='LABEL'?'span':'label');
      label.className='atsrs-field-label';
      if(label.tagName==='LABEL')label.htmlFor=control.id;
      label.textContent=text;
      shell.insertBefore(label,shell.firstChild);
    }
    if(!clean(label.textContent))label.textContent=text||'Field';
    return label;
  }
  function isSearch(control){
    if(control.tagName!=='INPUT')return false;
    var text=[control.type,control.id,control.name,control.className,control.placeholder,control.getAttribute('aria-label')].join(' ').toLowerCase();
    return /(^|\s)(search|filter)(\s|$)/.test(text)||/(search|filter)/.test(text);
  }
  function addAdornment(shell,control,proxy){
    if(isSearch(control)){
      shell.classList.add('atsrs-field-search');
      var searchIcon=shell.querySelector('.atsrs-field-search-icon,.jobs-search-control>i');
      if(!searchIcon){searchIcon=document.createElement('i');searchIcon.className='ph ph-magnifying-glass atsrs-field-search-icon';searchIcon.setAttribute('aria-hidden','true');shell.appendChild(searchIcon)}
      else searchIcon.classList.add('atsrs-field-search-icon');
    }
    if(control.tagName==='SELECT'&&proxy===control&&!shell.querySelector('.atsrs-field-chevron,.atsrs-disclosure-indicator,.personnel-filter-arrow,.work-type-select-arrow')){
      var chevron=document.createElement('i');
      chevron.className='ph ph-caret-down atsrs-field-chevron';
      chevron.setAttribute('aria-hidden','true');
      shell.appendChild(chevron);
    }
  }
  function fieldProxy(control,shell){
    var disclosure=control.closest('.atsrs-disclosure-shell');
    var proxy=disclosure&&disclosure.querySelector('.atsrs-select-trigger');
    var jobsHost=control.closest('.jobs-select-host');
    if(!proxy&&jobsHost)proxy=jobsHost.querySelector('.jobs-select-toggle')||control;
    if(!proxy&&control.closest('.personnel-combobox'))proxy=control.closest('.personnel-combobox');
    if(!proxy)proxy=control;
    proxy.classList.add('atsrs-field-control');
    var frame=frameFor(control);
    if(frame!==control)frame.classList.add('atsrs-field-control-frame');
    shell.classList.toggle('atsrs-field-textarea',control.tagName==='TEXTAREA');
    shell.classList.toggle('atsrs-field-disabled',!!control.disabled);
    shell.classList.toggle('atsrs-field-readonly',!!control.readOnly);
    addAdornment(shell,control,proxy);
  }
  function enhance(control){
    if(!eligible(control))return;
    if(control.dataset.atsrsFloatingField==='1'){
      var existing=control.closest('.atsrs-field-shell');if(existing)fieldProxy(control,existing);
      return;
    }
    var shell=shellFor(control);
    shell.classList.add('atsrs-field-shell');
    ensureLabel(shell,control);
    fieldProxy(control,shell);
    control.dataset.atsrsFloatingField='1';
  }
  function enhanceCustom(root){
    var scope=root&&root.querySelectorAll?root:document;
    scope.querySelectorAll('.work-type-select-toggle').forEach(function(button){
      var shell=button.closest('.work-type-field');
      if(!shell||shell.classList.contains('atsrs-field-shell'))return;
      shell.classList.add('atsrs-field-shell');
      var label=labelCandidate(shell,button)||document.createElement('span');
      if(!label.isConnected){label.textContent='Preferred work type';shell.insertBefore(label,shell.firstChild)}
      label.classList.add('atsrs-field-label');button.classList.add('atsrs-field-control');button.closest('.work-type-select').classList.add('atsrs-field-control-frame');
    });
    scope.querySelectorAll('.talent-work-type-filter > summary').forEach(function(summary){
      var shell=summary.closest('.talent-filter-field'),frame=summary.closest('.talent-work-type-filter');
      if(!shell)return;
      shell.classList.add('atsrs-field-shell');
      var label=shell.querySelector(':scope > span')||document.createElement('span');
      if(!label.isConnected){label.textContent='Work type';shell.insertBefore(label,shell.firstChild)}
      label.classList.add('atsrs-field-label');
      summary.classList.add('atsrs-field-control');frame.classList.add('atsrs-field-control-frame');
    });
  }
  function scan(root){
    var scope=root&&root.querySelectorAll?root:document;
    if(root&&root.matches&&eligible(root))enhance(root);
    scope.querySelectorAll(controlSelector).forEach(enhance);
    enhanceCustom(root);
  }
  function refresh(){
    scheduled=false;scan(document);
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(refresh)}
  function bind(){
    refresh();
    if(window.MutationObserver&&document.body){
      observer=new MutationObserver(schedule);
      observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','disabled','readonly','aria-hidden','aria-label','aria-labelledby','aria-expanded']});
    }
    window.addEventListener('atsrs:data-hydrated',schedule);
    window.addEventListener('atsrs:field-scan',schedule);
  }
  window.atsrsFloatingFields={scan:scan,refresh:refresh};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
