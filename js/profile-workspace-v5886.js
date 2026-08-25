(function(){
  'use strict';
  var state={ready:false,activeTab:'personal',personalEditing:false,availabilityEditing:false,initialDraft:'',initialBirthDisplay:'',initialBirthIso:'',scroll:{}};
  function byId(id){return document.getElementById(id)}
  function controls(root){return root?Array.prototype.slice.call(root.querySelectorAll('input,select,textarea,button')):[]}
  function setEnabled(root,enabled){controls(root).forEach(function(el){if(el.type!=='hidden')el.disabled=!enabled})}
  function draft(){var root=byId('profileInlineEditor');if(!root)return '';return Array.prototype.slice.call(root.querySelectorAll('input,select,textarea,[contenteditable="true"]')).map(function(el){return el.id+'='+String(el.isContentEditable?el.textContent:el.type==='checkbox'?el.checked:el.value)}).join('&')}
  function dirty(){return state.personalEditing&&draft()!==state.initialDraft}
  var PROFILE_CITIES={
    'Azerbaijan':['Baku','Ganja','Sumqayit','Lankaran','Mingachevir','Nakhchivan','Shaki','Shirvan'],
    'Turkey':['Istanbul','Ankara','Izmir','Bursa','Antalya','Adana'],
    'Norway':['Oslo','Bergen','Trondheim','Stavanger'],
    'United Kingdom':['London','Manchester','Birmingham','Edinburgh','Glasgow'],
    'United States':['New York','Los Angeles','Chicago','Houston','San Francisco'],
    'Canada':['Toronto','Vancouver','Montreal','Calgary','Ottawa'],
    'Germany':['Berlin','Munich','Hamburg','Frankfurt','Cologne'],
    'France':['Paris','Lyon','Marseille','Toulouse','Nice'],
    'Spain':['Madrid','Barcelona','Valencia','Seville','Malaga'],
    'Portugal':['Lisbon','Porto','Braga','Coimbra'],
    'Italy':['Rome','Milan','Naples','Turin','Florence'],
    'Netherlands':['Amsterdam','Rotterdam','The Hague','Utrecht'],
    'Belgium':['Brussels','Antwerp','Ghent','Bruges'],
    'Denmark':['Copenhagen','Aarhus','Odense','Aalborg'],
    'Sweden':['Stockholm','Gothenburg','Malmo','Uppsala'],
    'Finland':['Helsinki','Espoo','Tampere','Turku'],
    'Poland':['Warsaw','Krakow','Wroclaw','Gdansk'],
    'Romania':['Bucharest','Cluj-Napoca','Timisoara','Iasi'],
    'Bulgaria':['Sofia','Plovdiv','Varna','Burgas'],
    'Georgia':['Tbilisi','Batumi','Kutaisi','Rustavi'],
    'Kazakhstan':['Almaty','Astana','Shymkent','Karaganda'],
    'United Arab Emirates':['Dubai','Abu Dhabi','Sharjah','Ajman'],
    'Saudi Arabia':['Riyadh','Jeddah','Dammam','Mecca'],
    'Qatar':['Doha','Al Rayyan','Al Wakrah'],
    'Kuwait':['Kuwait City','Al Ahmadi','Hawalli'],
    'Oman':['Muscat','Salalah','Sohar'],
    'Bahrain':['Manama','Riffa','Muharraq'],
    'India':['Mumbai','Delhi','Bengaluru','Hyderabad','Chennai'],
    'Pakistan':['Karachi','Lahore','Islamabad','Rawalpindi'],
    'Philippines':['Manila','Quezon City','Cebu City','Davao City'],
    'Indonesia':['Jakarta','Surabaya','Bandung','Medan'],
    'Malaysia':['Kuala Lumpur','George Town','Johor Bahru','Kuching'],
    'Singapore':['Singapore'],
    'China':['Beijing','Shanghai','Shenzhen','Guangzhou'],
    'Japan':['Tokyo','Osaka','Yokohama','Kyoto'],
    'South Korea':['Seoul','Busan','Incheon','Daegu'],
    'Australia':['Sydney','Melbourne','Brisbane','Perth'],
    'New Zealand':['Auckland','Wellington','Christchurch','Hamilton'],
    'South Africa':['Johannesburg','Cape Town','Durban','Pretoria'],
    'Equatorial Guinea':['Malabo','Bata','Ebebiyin'],
    'Angola':['Luanda','Huambo','Lobito'],
    'Nigeria':['Lagos','Abuja','Kano','Ibadan'],
    'Ghana':['Accra','Kumasi','Tema','Tamale'],
    'Egypt':['Cairo','Alexandria','Giza','Luxor'],
    'Morocco':['Casablanca','Rabat','Marrakesh','Tangier'],
    'Brazil':['Sao Paulo','Rio de Janeiro','Brasilia','Salvador'],
    'Mexico':['Mexico City','Guadalajara','Monterrey','Puebla'],
    'Argentina':['Buenos Aires','Cordoba','Rosario','Mendoza']
  };
  function populateCitySelect(select,country,value){if(!select)return;var wanted=String(value||''),cities=PROFILE_CITIES[country]||[];select.textContent='';var blank=document.createElement('option');blank.value='';blank.textContent='Not specified';select.appendChild(blank);cities.forEach(function(city){var option=document.createElement('option');option.value=option.textContent=city;select.appendChild(option)});if(wanted&&!cities.includes(wanted)){var saved=document.createElement('option');saved.value=saved.textContent=wanted;select.appendChild(saved)}select.value=wanted}
  function selectedText(select){return select&&select.options[select.selectedIndex]&&select.options[select.selectedIndex].textContent||select&&select.value||'Not specified'}
  function timezoneEditorText(select){var label=selectedText(select),zone=select&&select.value||'UTC';try{return label+' · '+new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date())}catch(error){return label}}
  function restoreScrollPosition(x,y){[0,50,150,350].forEach(function(delay){setTimeout(function(){window.scrollTo(x,y)},delay)})}
  function tabName(button){return button&&button.id?button.id.replace('profileTab','').replace('Btn','').toLowerCase():'personal'}
  function activate(name,focus){
    if(dirty()&&!window.confirm('Discard unsaved profile changes?'))return false;
    if(state.personalEditing)cancelPersonal(false);
    var buttons=Array.prototype.slice.call(document.querySelectorAll('.profile-information-tabs [role="tab"]'));
    var panels=Array.prototype.slice.call(document.querySelectorAll('.profile-settings-viewport > [role="tabpanel"]'));
    var next=byId('profileTab'+name.charAt(0).toUpperCase()+name.slice(1)+'Btn');
    var panel=byId('profileTab'+name.charAt(0).toUpperCase()+name.slice(1)+'Panel');
    if(!next||!panel)return false;
    var current=byId('profileTab'+state.activeTab.charAt(0).toUpperCase()+state.activeTab.slice(1)+'Panel');
    if(current)state.scroll[state.activeTab]=current.scrollTop;
    buttons.forEach(function(button){var active=button===next;button.classList.toggle('is-active',active);button.setAttribute('aria-selected',active?'true':'false');button.tabIndex=active?0:-1});
    panels.forEach(function(item){var active=item===panel;item.hidden=!active;item.classList.toggle('is-active',active)});
    state.activeTab=name;panel.scrollTop=state.scroll[name]||0;if(focus)next.focus();return true;
  }
  function enterPersonal(focusId){
    var savedX=window.scrollX,savedY=window.scrollY;
    activate('personal',false);var read=byId('profilePersonalReadView'),editor=byId('profileInlineEditor');if(!editor)return;
    var nationality=byId('profileInlineNationality'),nationalityDisplay=byId('profileInlineNationalityValue'),birthCountrySource=byId('profileBirthCountry'),birthCountry=byId('profileInlineBirthCountry'),birthCountryDisplay=byId('profileInlineBirthCountryValue'),citySource=byId('profileCity'),city=byId('profileInlineCity'),cityDisplay=byId('profileInlineCityValue'),country=byId('profileCountry'),inlineCountry=byId('profileInlineCountryResidence'),countryDisplay=byId('inlineCountryValue'),company=byId('profileCompany'),inlineCompany=byId('profileInlineCompany'),companyDisplay=byId('profileInlineCompanyValue'),timezoneSource=byId('profileTimezone'),timezone=byId('profileInlineTimezone'),timezoneDisplay=byId('profileInlineTimezoneValue'),birthDisplay=byId('profileInlineBirthDateDisplay'),birthPicker=byId('profileInlineBirthPicker'),birth=byId('profileBirthDate');if(nationality)nationality.value=byId('profileStageNationality')&&byId('profileStageNationality').textContent||nationality.value||country&&country.value||'';if(nationalityDisplay)nationalityDisplay.textContent=selectedText(nationality);if(birthCountry)birthCountry.value=byId('profileStageBirthCountry')&&byId('profileStageBirthCountry').textContent||birthCountrySource&&birthCountrySource.value||'';if(birthCountryDisplay)birthCountryDisplay.textContent=selectedText(birthCountry);populateCitySelect(city,birthCountry&&birthCountry.value||'',byId('profileStageCity')&&byId('profileStageCity').textContent||citySource&&citySource.value||'');if(cityDisplay)cityDisplay.textContent=selectedText(city);if(inlineCountry)inlineCountry.value=byId('profileStageCountry')&&byId('profileStageCountry').textContent||country&&country.value||'';if(countryDisplay)countryDisplay.textContent=selectedText(inlineCountry);if(inlineCompany){var companyValue=byId('profileStageCompany')&&byId('profileStageCompany').textContent||company&&company.value||'';if(companyValue&&!Array.prototype.some.call(inlineCompany.options,function(option){return option.value===companyValue})){var companyOption=document.createElement('option');companyOption.value=companyOption.textContent=companyValue;inlineCompany.appendChild(companyOption)}inlineCompany.value=companyValue}if(companyDisplay)companyDisplay.textContent=selectedText(inlineCompany);if(timezone)timezone.value=timezoneSource&&timezoneSource.value||'UTC';if(timezoneDisplay)timezoneDisplay.textContent=byId('profileStageTimezone')&&byId('profileStageTimezone').textContent||timezoneEditorText(timezone);if(birthDisplay)birthDisplay.value=byId('profileStageBirthDate')&&byId('profileStageBirthDate').textContent||'';if(birthPicker)birthPicker.value=birth&&birth.value||'';state.initialBirthDisplay=birthDisplay&&birthDisplay.value||'';state.initialBirthIso=birthPicker&&birthPicker.value||'';state.personalEditing=true;state.initialDraft=draft();
    if(read)read.classList.add('hidden');editor.classList.remove('hidden');setEnabled(editor,true);byId('profilePage').classList.add('profile-inline-editing');var actions=byId('profileInlineActions');if(actions)actions.hidden=false;
    var target=focusId?byId(focusId):null;if(target)setTimeout(function(){target.focus({preventScroll:true})},0);restoreScrollPosition(savedX,savedY);
  }
  function finishPersonal(){var savedX=window.scrollX,savedY=window.scrollY,read=byId('profilePersonalReadView'),editor=byId('profileInlineEditor'),summaryEdit=byId('profileSummaryEditBtn'),actions=byId('profileInlineActions');state.personalEditing=false;state.initialDraft='';state.initialBirthDisplay='';state.initialBirthIso='';if(read)read.classList.remove('hidden');if(editor){editor.classList.add('hidden');setEnabled(editor,false)}if(summaryEdit){summaryEdit.hidden=false;summaryEdit.focus({preventScroll:true})}if(actions)actions.hidden=true;byId('profilePage').classList.remove('profile-inline-editing');restoreScrollPosition(savedX,savedY)}
  function applyPhoneDisplay(displayId,selectId,localId){var display=byId(displayId),select=byId(selectId),local=byId(localId);if(!display||!select||!local)return;var value=String(display.isContentEditable?display.textContent:display.value||'').replace(/[\s().-]/g,''),codes=Array.prototype.map.call(select.options,function(option){return option.value}).sort(function(a,b){return b.length-a.length}),code=codes.find(function(item){return value.indexOf(item)===0})||select.value||'+994';select.value=code;local.value=value.indexOf(code)===0?value.slice(code.length):value.replace(/^\+/, '')}
  async function savePersonal(){var button=byId('profileInlineSaveBtn'),picker=byId('profileInlineBirthPicker'),birth=byId('profileBirthDate'),inlineBirthCountry=byId('profileInlineBirthCountry'),birthCountry=byId('profileBirthCountry'),inlineCity=byId('profileInlineCity'),city=byId('profileCity'),inlineCountry=byId('profileInlineCountryResidence'),country=byId('profileCountry'),inlineCompany=byId('profileInlineCompany'),company=byId('profileCompany'),inlineTimezone=byId('profileInlineTimezone'),timezone=byId('profileTimezone');if(picker&&birth&&picker.value!==state.initialBirthIso)birth.value=picker.value;if(inlineBirthCountry&&birthCountry)birthCountry.value=inlineBirthCountry.value;if(inlineCity&&city){populateCitySelect(city,inlineBirthCountry&&inlineBirthCountry.value||'',inlineCity.value);city.value=inlineCity.value}if(inlineCountry&&country)country.value=inlineCountry.value;if(inlineCompany&&company)company.value=inlineCompany.value;if(inlineTimezone&&timezone)timezone.value=inlineTimezone.value;if(button)button.disabled=true;var ok=window.saveProfile?await window.saveProfile({personalChanged:true}):false;if(button)button.disabled=false;if(ok){finishPersonal();activate('personal',false)}return ok}
  function cancelPersonal(reload){if(reload!==false&&window.loadProfile)window.loadProfile();finishPersonal()}
  function syncAvailabilityDateState(){var status=byId('profileInlineAvailabilityStatus'),date=byId('profileInlineAvailableFrom');if(date)date.disabled=!state.availabilityEditing||status&&status.value!=='available_from'}
  function setInlineSelectValue(select,value){if(!select)return;select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}))}
  function syncAvailabilityEditor(){var status=byId('profileAvailabilityStatus'),date=byId('profileAvailableFrom'),work=byId('profileWorkPreferences'),notice=byId('profileAvailabilityNoticePeriod'),inlineStatus=byId('profileInlineAvailabilityStatus'),inlineDate=byId('profileInlineAvailableFrom'),inlineWork=byId('profileInlineWorkPreference'),inlineNotice=byId('profileInlineAvailabilityNoticePeriod');setInlineSelectValue(inlineStatus,status&&status.value||'not_set');if(inlineDate)inlineDate.value=date&&date.value||'';setInlineSelectValue(inlineWork,work&&work.dataset.value||'any');if(inlineNotice)inlineNotice.value=notice&&notice.value||'';syncAvailabilityDateState()}
  function applyAvailabilityEditor(){var status=byId('profileAvailabilityStatus'),date=byId('profileAvailableFrom'),work=byId('profileWorkPreferences'),notice=byId('profileAvailabilityNoticePeriod'),inlineStatus=byId('profileInlineAvailabilityStatus'),inlineDate=byId('profileInlineAvailableFrom'),inlineWork=byId('profileInlineWorkPreference'),inlineNotice=byId('profileInlineAvailabilityNoticePeriod');if(status&&inlineStatus)status.value=inlineStatus.value;if(date&&inlineDate)date.value=inlineDate.value;if(work&&inlineWork){work.dataset.value=inlineWork.value;var summary=byId('profileWorkPreferencesSummary');if(summary)summary.textContent=inlineWork.options[inlineWork.selectedIndex]&&inlineWork.options[inlineWork.selectedIndex].textContent||'Any opportunity'}if(notice&&inlineNotice)notice.value=inlineNotice.value}
  function setAvailabilityInlineEnabled(enabled){['profileInlineAvailabilityStatus','profileInlineAvailableFrom','profileInlineWorkPreference','profileInlineAvailabilityNoticePeriod'].forEach(function(id){var control=byId(id);if(control){control.hidden=!enabled;control.disabled=!enabled}});if(enabled)syncAvailabilityDateState()}
  async function refreshAvailabilityEditor(){if(window.loadProfile)await Promise.resolve(window.loadProfile());syncAvailabilityEditor()}
  async function enterAvailability(){var card=document.querySelector('.profile-availability-card'),actions=byId('profileAvailabilityInlineActions');if(!card||state.availabilityEditing)return;state.availabilityEditing=true;await refreshAvailabilityEditor();card.classList.add('is-editing');setAvailabilityInlineEnabled(true);if(actions)actions.hidden=false;var first=byId('profileInlineAvailabilityStatus'),focusTarget=first&&first.closest('.atsrs-disclosure-shell')&&first.closest('.atsrs-disclosure-shell').querySelector('.atsrs-select-trigger')||first;if(focusTarget)setTimeout(function(){focusTarget.focus({preventScroll:true})},0)}
  async function saveAvailability(){var button=byId('profileAvailabilitySaveBtn');applyAvailabilityEditor();if(button)button.disabled=true;var ok=window.saveProfile?await window.saveProfile({availabilityChanged:true}):false;if(button)button.disabled=false;if(ok)finishAvailability();return ok}
  function finishAvailability(){var card=document.querySelector('.profile-availability-card'),actions=byId('profileAvailabilityInlineActions');state.availabilityEditing=false;if(card)card.classList.remove('is-editing');setAvailabilityInlineEnabled(false);if(actions)actions.hidden=true}
  async function cancelAvailability(){await refreshAvailabilityEditor();finishAvailability()}
  function moveRow(controlId,target){var control=byId(controlId),row=control&&control.closest('.setting-row'),host=byId(target);if(row&&host)host.appendChild(row)}
  function buildPersonalEditor(editor,source){
    source.classList.add('profile-editor-source');
    var read=byId('profilePersonalReadView'),layout=read.cloneNode(true);layout.removeAttribute('id');layout.classList.add('profile-inline-grid');layout.querySelectorAll('[id]').forEach(function(node){node.removeAttribute('id')});
    var boxes=layout.querySelectorAll('.profile-information-field');
    function field(index,id){var control=byId(id),strong=boxes[index]&&boxes[index].querySelector('strong');if(strong&&control)strong.replaceWith(control);return control}
    field(0,'profileName');field(1,'profileSurname');var birthDisplay=document.createElement('input'),birthPicker=document.createElement('input'),birthHost=document.createElement('div'),birthTrigger=document.createElement('button');birthDisplay.id='profileInlineBirthDateDisplay';birthDisplay.readOnly=true;birthDisplay.setAttribute('aria-label','Date of birth');birthPicker.id='profileInlineBirthPicker';birthPicker.type='date';birthPicker.setAttribute('aria-label','Choose date of birth');birthPicker.dataset.atsrsDatePosition='anchor-above-right';birthPicker.dataset.atsrsDateAnchorId='profileInlineBirthDateDisplay';birthHost.className='profile-birth-picker-host';birthHost.appendChild(birthPicker);document.body.appendChild(birthHost);function openBirthPicker(){birthPicker.click()}birthDisplay.addEventListener('click',openBirthPicker);birthTrigger.type='button';birthTrigger.className='profile-birth-trigger';birthTrigger.setAttribute('aria-label','Open date of birth calendar');birthTrigger.addEventListener('click',openBirthPicker);var birthStrong=boxes[2]&&boxes[2].querySelector('strong');if(birthStrong){birthStrong.replaceWith(birthDisplay);boxes[2].appendChild(birthTrigger)}birthPicker.addEventListener('change',function(){if(!birthPicker.value)return;var parts=birthPicker.value.split('-'),date=new Date(Number(parts[0]),Number(parts[1])-1,Number(parts[2]));birthDisplay.value=new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(date)});
    var country=byId('profileCountry');
    function cloneSelect(source,id,label){var select=document.createElement('select');select.id=id;select.setAttribute('aria-label',label);select.setAttribute('data-atsrs-no-field-shell','true');Array.prototype.forEach.call(source&&source.options||[],function(option){select.appendChild(option.cloneNode(true))});return select}
    function customSelect(index,select,displayId,onInput){var box=boxes[index],strong=box&&box.querySelector('strong');if(!box||!strong||!select)return null;strong.id=displayId;strong.after(select);box.querySelectorAll('i').forEach(function(icon){icon.remove()});var caret=document.createElement('i');caret.className='ph ph-caret-down profile-nationality-caret';caret.setAttribute('aria-hidden','true');box.appendChild(caret);box.classList.add('profile-nationality-select');select.addEventListener('input',function(){strong.textContent=selectedText(select);if(onInput)onInput(select,strong)});return select}
    var nationality=customSelect(3,cloneSelect(country,'profileInlineNationality','Nationality'),'profileInlineNationalityValue');
    var birthCountry=customSelect(4,cloneSelect(byId('profileBirthCountry')||country,'profileInlineBirthCountry','Country'),'profileInlineBirthCountryValue');
    var city=customSelect(5,cloneSelect(byId('profileCity'),'profileInlineCity','City'),'profileInlineCityValue');
    if(birthCountry)birthCountry.addEventListener('input',function(){populateCitySelect(city,birthCountry.value,'');var cityValue=byId('profileInlineCityValue');if(cityValue)cityValue.textContent=selectedText(city)});
    var inlineCountry=customSelect(6,cloneSelect(country,'profileInlineCountryResidence','Country of residence'),'inlineCountryValue');
    field(7,'profileAddress');field(8,'profileZipCode');
    var companySource=byId('profileCompany'),companySelect=document.createElement('select');companySelect.id='profileInlineCompany';companySelect.setAttribute('aria-label','Current workplace');companySelect.setAttribute('data-atsrs-no-field-shell','true');['Freelancer','Not currently employed','Self-employed'].forEach(function(value){var option=document.createElement('option');option.value=option.textContent=value;companySelect.appendChild(option)});var existingCompany=companySource&&companySource.value||'';if(existingCompany&&!Array.prototype.some.call(companySelect.options,function(option){return option.value===existingCompany})){var existingCompanyOption=document.createElement('option');existingCompanyOption.value=existingCompanyOption.textContent=existingCompany;companySelect.appendChild(existingCompanyOption)}customSelect(9,companySelect,'profileInlineCompanyValue');
    field(10,'profilePosition');var timezone=customSelect(11,cloneSelect(byId('profileTimezone'),'profileInlineTimezone','Timezone'),'profileInlineTimezoneValue',function(select,strong){strong.textContent=timezoneEditorText(select)});
    editor.insertBefore(layout,editor.firstChild);
    function unlockPageAfterPicker(){document.body.classList.remove('atsrs-date-picker-open');document.body.style.removeProperty('overflow');document.documentElement.style.removeProperty('overflow')}
    document.addEventListener('click',function(event){if(event.target.closest('.atsrs-date-picker [data-date-cancel],.atsrs-date-picker [data-date-confirm]'))setTimeout(unlockPageAfterPicker,0)});
    document.addEventListener('keydown',function(event){if(event.key==='Escape')setTimeout(unlockPageAfterPicker,0)});
    nationality.value=country&&country.value||'';
  }
  function bindPersonalActions(){var edit=byId('profileSummaryEditBtn'),save=byId('profileInlineSaveBtn'),cancel=byId('profileInlineCancelBtn');if(edit)edit.addEventListener('click',function(){enterPersonal()});if(save)save.addEventListener('click',savePersonal);if(cancel)cancel.addEventListener('click',function(){cancelPersonal(true)})}
  function buildAvailabilityEditor(){var hosts=Array.prototype.slice.call(document.querySelectorAll('.profile-availability-fields dd'));if(hosts.length<4)return;var status=document.createElement('select'),date=document.createElement('input'),work=document.createElement('select'),notice=document.createElement('input');status.id='profileInlineAvailabilityStatus';status.setAttribute('aria-label','Status');status.setAttribute('data-atsrs-no-field-shell','true');[['not_set','Not specified'],['available_now','Available now'],['available_from','Available from a date'],['open_to_offers','Open to offers'],['not_available','Not currently available']].forEach(function(item){var option=document.createElement('option');option.value=item[0];option.textContent=item[1];status.appendChild(option)});date.id='profileInlineAvailableFrom';date.type='date';date.setAttribute('aria-label','Available from');date.setAttribute('data-atsrs-no-field-shell','true');work.id='profileInlineWorkPreference';work.setAttribute('aria-label','Preferred work type');work.setAttribute('data-atsrs-no-field-shell','true');[['any','Any opportunity'],['freelance','Freelance'],['contract','Contract'],['permanent','Permanent']].forEach(function(item){var option=document.createElement('option');option.value=item[0];option.textContent=item[1];work.appendChild(option)});notice.id='profileInlineAvailabilityNoticePeriod';notice.autocomplete='off';notice.placeholder='Not specified';notice.setAttribute('aria-label','Notice period');notice.setAttribute('data-atsrs-no-field-shell','true');[status,date,work,notice].forEach(function(control,index){control.className='profile-availability-inline-control';control.hidden=true;control.disabled=true;hosts[index].appendChild(control)});status.addEventListener('change',syncAvailabilityDateState)}
  function bindAvailabilityActions(){var edit=byId('profileStageAvailabilityEditBtn'),save=byId('profileAvailabilitySaveBtn'),cancel=byId('profileAvailabilityCancelBtn');if(edit)edit.addEventListener('click',enterAvailability);if(save)save.addEventListener('click',saveAvailability);if(cancel)cancel.addEventListener('click',cancelAvailability)}
  function bindTabs(){var buttons=Array.prototype.slice.call(document.querySelectorAll('.profile-information-tabs [role="tab"]'));buttons.forEach(function(button,index){button.addEventListener('click',function(){activate(tabName(button),false)});button.addEventListener('keydown',function(event){if(event.key==='Enter'||event.key===' '){event.preventDefault();activate(tabName(button),true)}if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();var delta=event.key==='ArrowRight'?1:-1,next=buttons[(index+delta+buttons.length)%buttons.length];activate(tabName(next),true)}})})}
  function decorateSecurityCard(buttonId,iconClass,metaLabel,metaValue,tone){var button=byId(buttonId),row=button&&button.closest('.setting-row');if(!row)return;row.classList.add('profile-security-card');if(tone)row.classList.add(tone);var copy=row.firstElementChild;if(copy)copy.classList.add('profile-security-copy');if(!row.querySelector('.profile-security-card-icon')){var icon=document.createElement('i');icon.className='ph '+iconClass+' profile-security-card-icon';icon.setAttribute('aria-hidden','true');row.insertBefore(icon,copy)}if(!row.querySelector('.profile-security-card-meta')){var meta=document.createElement('div');meta.className='profile-security-card-meta';var label=document.createElement('span');label.textContent=metaLabel;var value=document.createElement('strong');value.textContent=metaValue;meta.appendChild(label);meta.appendChild(value);row.insertBefore(meta,button)}button.classList.add('profile-security-card-action');if(!button.querySelector('i')){var actionIcon=document.createElement('i');actionIcon.className=buttonId==='deleteAccountBtn'?'ph ph-trash':'ph ph-caret-right';actionIcon.setAttribute('aria-hidden','true');button.insertBefore(actionIcon,button.firstChild)}}
  function moveSecurityContacts(){var source=byId('profileSecurityContactSource'),host=byId('profileSecurityControls');if(!source||!host)return;Array.prototype.slice.call(source.querySelectorAll('.profile-information-contact')).forEach(function(card){card.classList.add('profile-security-card','profile-security-contact-card');host.appendChild(card)});source.remove()}
  function decorateSecurityControls(){decorateSecurityCard('setup2faBtn','ph-lock-key','Status',(byId('profileStageMfaStatus')&&byId('profileStageMfaStatus').textContent||'Not enabled'),'');decorateSecurityCard('viewSessionsBtn','ph-monitor','Current browser','Active','');decorateSecurityCard('deleteAccountBtn','ph-trash','Warning','This action cannot be undone','is-danger');var source=byId('profileStageMfaStatus'),target=byId('setup2faBtn')&&byId('setup2faBtn').closest('.profile-security-card').querySelector('.profile-security-card-meta strong');if(source&&target){var sync=function(){target.textContent=source.textContent||'Not enabled';target.classList.toggle('is-enabled',/enabled|verified/i.test(target.textContent)&&!/not enabled/i.test(target.textContent))};sync();new MutationObserver(sync).observe(source,{childList:true,subtree:true,characterData:true})}}
  function init(){
    if(state.ready||!document.body.classList.contains('personal-mode'))return false;
    var editor=byId('profileInlineEditor'),grid=document.querySelector('#accountGeneralTab .profile-grid');if(!editor||!grid)return false;
    state.ready=true;editor.appendChild(grid);buildPersonalEditor(editor,grid);bindPersonalActions();setEnabled(editor,false);
    var availability=document.querySelector('.work-availability-card');if(availability){availability.classList.add('hidden');setEnabled(availability,false)}buildAvailabilityEditor();
    moveRow('profileVisibility','profilePrivacyControls');moveRow('exportDataBtn','profilePrivacyControls');
    ['setup2faBtn','viewSessionsBtn'].forEach(function(id){moveRow(id,'profileSecurityControls')});moveSecurityContacts();moveRow('deleteAccountBtn','profileSecurityControls');decorateSecurityControls();
    var share=byId('shareProfilePanel'),sharing=byId('profileSharingControls');if(share&&sharing)sharing.appendChild(share);
    var oldEdit=byId('editProfileBtn');if(oldEdit)oldEdit.hidden=true;
    bindTabs();activate('personal',false);
    bindAvailabilityActions();
    document.querySelectorAll('[data-profile-stage-edit]').forEach(function(button){button.addEventListener('click',function(){enterPersonal(button.dataset.profileStageEdit==='whatsapp'?'profileWhatsappLocal':'profilePhoneLocal')})});
    return true;
  }
  window.initPersonalProfileWorkspace=init;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
