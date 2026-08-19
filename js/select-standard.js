/* ATSRS shared single-select interaction standard. */
(function(){
  'use strict';

  var controls=new WeakMap();
  var openControl=null;
  var sequence=0;
  var observer=null;

  function clean(value){return String(value==null?'':value).trim()}
  function selectorEscape(value){
    if(window.CSS&&typeof window.CSS.escape==='function')return window.CSS.escape(value);
    return String(value).replace(/["\\]/g,'\\$&');
  }
  function labelValue(label){
    if(!label)return '';
    var clone=label.cloneNode(true);
    clone.querySelectorAll('select,input,button,.atsrs-select-menu').forEach(function(node){node.remove()});
    return clean(clone.textContent);
  }
  function visible(select){
    return !!(select&&select.isConnected&&!select.multiple&&Number(select.size||0)<=1
      &&!select.matches('[data-atsrs-native-select],.jobs-native-select')
      &&!select.closest('.jobs-select-host')
      &&select.id!=='profilePhoneCountryCode'&&select.id!=='profileWhatsappCountryCode');
  }
  function labelText(select){
    var direct=clean(select.getAttribute('aria-label'));
    if(direct)return direct;
    var labelled=clean(select.getAttribute('aria-labelledby'));
    if(labelled){
      var text=labelled.split(/\s+/).map(function(id){
        var node=document.getElementById(id);return node?clean(node.textContent):'';
      }).filter(Boolean).join(' ');
      if(text)return text;
    }
    if(select.id){
      var explicit=document.querySelector('label[for="'+selectorEscape(select.id)+'"]');
      var explicitValue=labelValue(explicit);
      if(explicitValue)return explicitValue;
    }
    var label=select.closest('label');
    if(label){
      var nestedValue=labelValue(label);
      if(nestedValue)return nestedValue;
    }
    var setting=select.closest('.setting-row');
    var heading=setting&&setting.querySelector('b');
    if(heading&&clean(heading.textContent))return clean(heading.textContent);
    if(clean(select.title))return clean(select.title);
    return clean(select.id.replace(/([a-z])([A-Z])/g,'$1 $2'))||'Select option';
  }
  function optionId(control,index){return control.menu.id+'-option-'+index}
  function enabledIndexes(control){
    return Array.from(control.select.options).map(function(option,index){
      return option.disabled?null:index;
    }).filter(function(index){return index!==null});
  }
  function selectedIndex(control){
    var index=control.select.selectedIndex;
    return index>=0?index:(enabledIndexes(control)[0]||0);
  }
  function activeButton(control){
    return control.menu.querySelector('[data-option-index="'+control.active+'"]');
  }
  function clearActive(control){
    control.active=-1;
    control.menu.querySelectorAll('.atsrs-select-option').forEach(function(button){button.removeAttribute('data-active')});
    control.trigger.removeAttribute('aria-activedescendant');
  }
  function paintActive(control,index,scroll){
    var enabled=enabledIndexes(control);
    if(!enabled.length)return;
    if(enabled.indexOf(index)<0)index=enabled[0];
    control.active=index;
    control.menu.querySelectorAll('.atsrs-select-option').forEach(function(button){
      button.toggleAttribute('data-active',Number(button.dataset.optionIndex)===index);
    });
    var button=activeButton(control);
    control.trigger.setAttribute('aria-activedescendant',button?button.id:'');
    if(scroll&&button)button.scrollIntoView({block:'nearest'});
  }
  function move(control,delta){
    var enabled=enabledIndexes(control),position=enabled.indexOf(control.active);
    if(!enabled.length)return;
    if(position<0)position=0;
    paintActive(control,enabled[(position+delta+enabled.length)%enabled.length],true);
  }
  function rebuild(control){
    var fragment=document.createDocumentFragment();
    Array.from(control.select.options).forEach(function(option,index){
      var button=document.createElement('button');
      var selected=index===control.select.selectedIndex;
      button.type='button';
      button.className='atsrs-select-option';
      button.id=optionId(control,index);
      button.setAttribute('role','option');
      button.setAttribute('aria-selected',selected?'true':'false');
      button.dataset.optionIndex=String(index);
      button.tabIndex=-1;
      button.disabled=!!option.disabled;
      button.innerHTML='<span class="atsrs-select-option-check" aria-hidden="true">'+(selected?'✓':'')+'</span>'+
        '<span class="atsrs-select-option-label"></span>';
      button.querySelector('.atsrs-select-option-label').textContent=option.textContent;
      button.addEventListener('pointerenter',function(){if(!button.disabled)paintActive(control,index,false)});
      button.addEventListener('click',function(){
        if(button.disabled)return;
        control.select.selectedIndex=index;
        control.select.dispatchEvent(new Event('input',{bubbles:true}));
        control.select.dispatchEvent(new Event('change',{bubbles:true}));
        sync(control);
        close(control,true);
      });
      fragment.appendChild(button);
    });
    control.menu.replaceChildren(fragment);
    paintActive(control,selectedIndex(control),false);
  }
  function sync(control){
    if(!control||!control.select.isConnected)return;
    control.trigger.disabled=!!control.select.disabled;
    control.trigger.setAttribute('aria-label',labelText(control.select)+': '+
      clean(control.select.options[control.select.selectedIndex]&&control.select.options[control.select.selectedIndex].textContent));
    rebuild(control);
  }
  function position(control){
    if(!control||control.menu.hidden)return;
    var rect=control.shell.getBoundingClientRect();
    var edge=8,gap=6,availableBelow=window.innerHeight-rect.bottom-gap-edge;
    var availableAbove=rect.top-gap-edge;
    var desired=Math.min(360,Math.max(160,control.menu.scrollHeight));
    var above=availableBelow<Math.min(desired,220)&&availableAbove>availableBelow;
    var maxHeight=Math.max(120,Math.min(desired,above?availableAbove:availableBelow));
    control.menu.style.left=Math.max(edge,Math.min(rect.left,window.innerWidth-rect.width-edge))+'px';
    control.menu.style.width=Math.max(120,Math.min(rect.width,window.innerWidth-edge*2))+'px';
    control.menu.style.maxHeight=maxHeight+'px';
    control.menu.style.top=(above?Math.max(edge,rect.top-gap-maxHeight):rect.bottom+gap)+'px';
    control.menu.classList.toggle('is-above',above);
  }
  function open(control,keyboard){
    if(control.trigger.disabled)return;
    if(openControl&&openControl!==control)close(openControl,false);
    sync(control);
    control.menu.hidden=false;
    control.trigger.setAttribute('aria-expanded','true');
    openControl=control;
    if(keyboard)paintActive(control,selectedIndex(control),true);else clearActive(control);
    position(control);
    if(keyboard)control.trigger.focus({preventScroll:true});
  }
  function close(control,focus){
    if(!control)return;
    control.menu.hidden=true;
    control.trigger.setAttribute('aria-expanded','false');
    control.trigger.removeAttribute('aria-activedescendant');
    if(openControl===control)openControl=null;
    if(focus)control.trigger.focus({preventScroll:true});
  }
  function chooseActive(control){
    var option=control.select.options[control.active];
    if(!option||option.disabled)return;
    control.select.selectedIndex=control.active;
    control.select.dispatchEvent(new Event('input',{bubbles:true}));
    control.select.dispatchEvent(new Event('change',{bubbles:true}));
    sync(control);
    close(control,true);
  }
  function onKeydown(event,control){
    var openNow=!control.menu.hidden;
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      event.preventDefault();
      if(!openNow)open(control,true);
      move(control,event.key==='ArrowDown'?1:-1);
      return;
    }
    if(event.key==='Home'||event.key==='End'){
      event.preventDefault();
      if(!openNow)open(control,true);
      var enabled=enabledIndexes(control);
      if(enabled.length)paintActive(control,event.key==='Home'?enabled[0]:enabled[enabled.length-1],true);
      return;
    }
    if(event.key==='Enter'||event.key===' '){
      event.preventDefault();
      if(openNow)chooseActive(control);else open(control,true);
      return;
    }
    if(event.key==='Escape'&&openNow){
      event.preventDefault();close(control,true);
    }
  }
  function enhance(select){
    if(!visible(select)||controls.has(select))return;
    var shell=select.closest('.atsrs-disclosure-shell');
    if(!shell){
      shell=document.createElement('span');
      shell.className='atsrs-disclosure-shell';
      select.parentNode.insertBefore(shell,select);
      shell.appendChild(select);
      var indicator=document.createElement('span');
      indicator.className='atsrs-disclosure-indicator';
      indicator.setAttribute('aria-hidden','true');
      shell.appendChild(indicator);
    }
    shell.classList.add('atsrs-custom-select');
    select.classList.add('atsrs-select-source');
    select.tabIndex=-1;
    select.setAttribute('aria-hidden','true');

    var trigger=document.createElement('button');
    trigger.type='button';
    trigger.className='atsrs-select-trigger';
    trigger.setAttribute('role','combobox');
    trigger.setAttribute('aria-haspopup','listbox');
    trigger.setAttribute('aria-expanded','false');
    trigger.innerHTML='<span class="sr-only">Open options</span>';

    var menu=document.createElement('div');
    menu.className='atsrs-select-menu';
    menu.id='atsrsSelectMenu'+(++sequence);
    menu.setAttribute('role','listbox');
    menu.hidden=true;
    trigger.setAttribute('aria-controls',menu.id);

    shell.appendChild(trigger);
    document.body.appendChild(menu);
    var control={select:select,shell:shell,trigger:trigger,menu:menu,active:0};
    controls.set(select,control);
    trigger.addEventListener('click',function(){control.menu.hidden?open(control,false):close(control,false)});
    trigger.addEventListener('keydown',function(event){onKeydown(event,control)});
    select.addEventListener('change',function(){sync(control)});
    select.addEventListener('input',function(){sync(control)});
    select.addEventListener('focus',function(){trigger.focus()});
    if(select.form)select.form.addEventListener('reset',function(){setTimeout(function(){sync(control)},0)});
    if(window.MutationObserver){
      new MutationObserver(function(){sync(control)}).observe(select,{
        childList:true,subtree:true,attributes:true,
        attributeFilter:['disabled','selected','label','value']
      });
    }
    sync(control);
  }
  function scan(root){
    if(root&&root.matches&&root.matches('select'))enhance(root);
    var scope=root&&root.querySelectorAll?root:document;
    scope.querySelectorAll('select:not([multiple])').forEach(enhance);
  }
  function bind(){
    scan(document);
    if(window.MutationObserver&&document.body){
      observer=new MutationObserver(function(records){
        records.forEach(function(record){
          record.addedNodes.forEach(function(node){if(node.nodeType===1)scan(node)});
        });
      });
      observer.observe(document.body,{childList:true,subtree:true});
    }
    document.addEventListener('pointerdown',function(event){
      if(openControl&&!openControl.shell.contains(event.target)&&!openControl.menu.contains(event.target))close(openControl,false);
    });
    document.addEventListener('focusin',function(event){
      if(openControl&&!openControl.shell.contains(event.target)&&!openControl.menu.contains(event.target))close(openControl,false);
    });
    window.addEventListener('resize',function(){if(openControl)position(openControl)});
    window.addEventListener('scroll',function(){if(openControl)position(openControl)},true);
    window.addEventListener('atsrs:data-hydrated',function(){scan(document)});
  }

  window.atsrsSelectStandard={enhance:enhance,scan:scan,close:function(){close(openControl,false)}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
