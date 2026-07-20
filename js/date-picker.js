(function(){
  'use strict';

  var picker=null;
  var activeInput=null;
  var selectedDate=null;
  var viewDate=null;
  var monthFormatter=new Intl.DateTimeFormat('en',{month:'long',year:'numeric'});
  var selectionFormatter=new Intl.DateTimeFormat('en',{day:'2-digit',month:'short',year:'numeric'});

  function pad(value){return String(value).padStart(2,'0');}
  function iso(date){
    if(!date)return '';
    return date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate());
  }
  function parse(value){
    var match=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!match)return null;
    var year=Number(match[1]);
    var month=Number(match[2])-1;
    var day=Number(match[3]);
    var date=new Date(year,month,day);
    if(Number.isNaN(date.getTime()))return null;
    return date.getFullYear()===year&&date.getMonth()===month&&date.getDate()===day
      ?date
      :null;
  }
  function sameDate(a,b){
    return !!(a&&b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate());
  }
  function button(label,className){
    var element=document.createElement('button');
    element.type='button';
    element.textContent=label;
    if(className)element.className=className;
    return element;
  }
  function fieldTitle(input){
    var wrap=input&&input.closest?input.closest('.field-wrap,.career-record-date'):null;
    var label=wrap&&wrap.querySelector?wrap.querySelector('label'):null;
    return (label&&label.textContent.trim())||input.getAttribute('title')||'Select date';
  }
  function ensurePicker(){
    if(picker)return picker;
    picker=document.createElement('div');
    picker.id='atsrsDatePicker';
    picker.className='atsrs-date-picker hidden';
    picker.setAttribute('role','dialog');
    picker.setAttribute('aria-modal','true');
    picker.setAttribute('aria-labelledby','atsrsDatePickerTitle');
    picker.innerHTML=
      '<div class="atsrs-date-picker-backdrop" data-date-cancel="true"></div>'+
      '<div class="atsrs-date-picker-dialog">'+
        '<p class="atsrs-date-picker-kicker">ATSRS CALENDAR</p>'+
        '<h3 id="atsrsDatePickerTitle" class="atsrs-date-picker-title">Select date</h3>'+
        '<div class="atsrs-date-picker-nav">'+
          '<button type="button" data-date-prev="true" aria-label="Previous month">‹</button>'+
          '<div id="atsrsDatePickerMonth" class="atsrs-date-picker-month"></div>'+
          '<button type="button" data-date-next="true" aria-label="Next month">›</button>'+
        '</div>'+
        '<div class="atsrs-date-picker-weekdays"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div>'+
        '<div id="atsrsDatePickerDays" class="atsrs-date-picker-days"></div>'+
        '<div id="atsrsDatePickerSelection" class="atsrs-date-picker-selection"></div>'+
        '<div class="atsrs-date-picker-actions">'+
          '<button type="button" class="secondary" data-date-clear="true">Clear</button>'+
          '<button type="button" class="secondary" data-date-today="true">Today</button>'+
          '<button type="button" class="secondary cancel" data-date-cancel="true">Cancel</button>'+
          '<button type="button" class="confirm" data-date-confirm="true">OK</button>'+
        '</div>'+
      '</div>';
    document.body.appendChild(picker);
    picker.addEventListener('click',onPickerClick);
    return picker;
  }
  function render(){
    ensurePicker();
    var month=picker.querySelector('#atsrsDatePickerMonth');
    var days=picker.querySelector('#atsrsDatePickerDays');
    var selection=picker.querySelector('#atsrsDatePickerSelection');
    month.textContent=monthFormatter.format(viewDate);
    selection.textContent=selectedDate?'Selected: '+selectionFormatter.format(selectedDate):'No date selected';
    days.innerHTML='';

    var year=viewDate.getFullYear();
    var monthIndex=viewDate.getMonth();
    var firstDay=new Date(year,monthIndex,1).getDay();
    var dayCount=new Date(year,monthIndex+1,0).getDate();
    for(var empty=0;empty<firstDay;empty++){
      var spacer=document.createElement('span');
      spacer.className='empty';
      days.appendChild(spacer);
    }
    var today=new Date();
    today.setHours(0,0,0,0);
    for(var day=1;day<=dayCount;day++){
      (function(dayValue){
        var date=new Date(year,monthIndex,dayValue);
        var dayButton=button(String(dayValue));
        dayButton.setAttribute('data-date-day',String(dayValue));
        dayButton.setAttribute('aria-label',selectionFormatter.format(date));
        if(sameDate(date,today))dayButton.classList.add('today');
        if(sameDate(date,selectedDate)){
          dayButton.classList.add('selected');
          dayButton.setAttribute('aria-pressed','true');
        }
        days.appendChild(dayButton);
      })(day);
    }
  }
  function open(input){
    if(!input||input.disabled)return;
    activeInput=input;
    selectedDate=parse(input.value);
    viewDate=selectedDate?new Date(selectedDate):new Date();
    viewDate=new Date(viewDate.getFullYear(),viewDate.getMonth(),1);
    ensurePicker();
    picker.querySelector('#atsrsDatePickerTitle').textContent=fieldTitle(input);
    picker.classList.remove('hidden');
    document.body.classList.add('atsrs-date-picker-open');
    render();
    setTimeout(function(){
      var selected=picker.querySelector('.selected');
      var focusTarget=selected||picker.querySelector('[data-date-confirm]');
      if(focusTarget)focusTarget.focus();
    },0);
  }
  function close(){
    if(!picker)return;
    picker.classList.add('hidden');
    document.body.classList.remove('atsrs-date-picker-open');
    var returnTarget=activeInput;
    activeInput=null;
    if(returnTarget)setTimeout(function(){returnTarget.focus();},0);
  }
  function commit(){
    if(!activeInput)return;
    activeInput.value=iso(selectedDate);
    activeInput.dispatchEvent(new Event('input',{bubbles:true}));
    activeInput.dispatchEvent(new Event('change',{bubbles:true}));
    close();
  }
  function onPickerClick(event){
    var target=event.target.closest('button,[data-date-cancel]');
    if(!target)return;
    if(target.hasAttribute('data-date-prev')){
      viewDate=new Date(viewDate.getFullYear(),viewDate.getMonth()-1,1);render();return;
    }
    if(target.hasAttribute('data-date-next')){
      viewDate=new Date(viewDate.getFullYear(),viewDate.getMonth()+1,1);render();return;
    }
    if(target.hasAttribute('data-date-day')){
      selectedDate=new Date(viewDate.getFullYear(),viewDate.getMonth(),Number(target.getAttribute('data-date-day')));
      render();return;
    }
    if(target.hasAttribute('data-date-today')){
      selectedDate=new Date();
      selectedDate.setHours(0,0,0,0);
      viewDate=new Date(selectedDate.getFullYear(),selectedDate.getMonth(),1);
      render();return;
    }
    if(target.hasAttribute('data-date-clear')){selectedDate=null;render();return;}
    if(target.hasAttribute('data-date-confirm')){commit();return;}
    if(target.hasAttribute('data-date-cancel'))close();
  }
  function upgrade(input){
    if(!input||input.dataset.atsrsDateReady==='true')return;
    var value=input.value;
    input.type='text';
    input.value=value;
    input.readOnly=true;
    input.inputMode='none';
    input.autocomplete='off';
    input.dataset.atsrsDateReady='true';
    input.classList.add('atsrs-date-input');
    input.setAttribute('aria-haspopup','dialog');
    input.setAttribute('placeholder','YYYY-MM-DD');
    input.addEventListener('click',function(){open(input);});
    input.addEventListener('keydown',function(event){
      if(event.key==='Enter'||event.key===' '||event.key==='ArrowDown'){
        event.preventDefault();open(input);
      }
    });
  }
  function upgradeAll(root){
    if(root&&root.matches&&root.matches('input[type="date"]'))upgrade(root);
    var scope=root&&root.querySelectorAll?root:document;
    Array.prototype.forEach.call(scope.querySelectorAll('input[type="date"]'),upgrade);
  }
  function install(){
    ensurePicker();
    upgradeAll(document);
    new MutationObserver(function(records){
      records.forEach(function(record){
        Array.prototype.forEach.call(record.addedNodes,function(node){
          if(node.nodeType===1)upgradeAll(node);
        });
      });
    }).observe(document.body,{childList:true,subtree:true});
    document.addEventListener('keydown',function(event){
      if(event.key==='Escape'&&picker&&!picker.classList.contains('hidden'))close();
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);
  else install();
})();
