(function(){
  var root=document.querySelector('.updates-atlas');
  if(!root)return;
  var releases={
    jobs:{title:'Worldwide JobSearch',icon:'ph-globe-hemisphere-west',status:'LIVE',statusLabel:'Live',date:'31 Aug 2026',category:'Job Search',availability:'All accounts',description:'Discover opportunities across borders with trusted companies, verified recruiters and location-aware results.',action:function(){showPage('jobs',document.getElementById('navJobs'));window.dispatchEvent(new CustomEvent('atsrs:jobs-nav'))}},
    recruiters:{title:'Recruiter Directory',icon:'ph-user',status:'LIVE',statusLabel:'Live',date:'30 Aug 2026',category:'Directory',availability:'All accounts',description:'Access a verified recruiter network and build relationships that move your career forward.',action:function(){window.atsrsOpenJobsDirectory('recruiters',document.getElementById('navRecruiters'))}},
    companies:{title:'Company Directory',icon:'ph-buildings',status:'LIVE',statusLabel:'Live',date:'30 Aug 2026',category:'Directory',availability:'All accounts',description:'Explore company profiles and insights to find employers that match your ambitions.',action:function(){window.atsrsOpenJobsDirectory('employers',document.getElementById('navEmployers'))}},
    ai:{title:'AI Document Scan',icon:'ph-magic-wand',status:'LIVE',statusLabel:'Live',date:'29 Aug 2026',category:'Documents',availability:'Premium accounts',description:'Extract and review document details with AI-assisted scanning before saving.',action:null},
    qr:{title:'QR Phone Upload',icon:'ph-qr-code',status:'LIVE',statusLabel:'Live',date:'29 Aug 2026',category:'Documents',availability:'All accounts',description:'Upload a document from your phone through a secure QR handoff.',action:null},
    email:{title:'Email Notification Expiry Alert',icon:'ph-envelope-simple',status:'LIVE',statusLabel:'Live',date:'1 Sep 2026',category:'Notifications',availability:'All accounts',description:'Receive automatic email reminders before tracked documents reach their expiry date.',action:null},
    tracking:{title:'Document Tracking',icon:'ph-file-magnifying-glass',status:'LIVE',statusLabel:'Live',date:'1 Sep 2026',category:'Documents',availability:'All accounts',description:'Monitor document status, renewal timing and expiry progress from one controlled workspace.',action:null},
    sharing:{title:'Share Profile Link',icon:'ph-share-network',status:'LIVE',statusLabel:'Live',date:'1 Sep 2026',category:'Profile Sharing',availability:'All accounts',description:'Create a controlled profile link and share your verified ATSRS details with a selected recipient.',action:null},
    whatsapp:{title:'WhatsApp Expiry Alerts',icon:'ph-whatsapp-logo',status:'BUILDING',statusLabel:'In development',date:'In progress',category:'Notifications',availability:'Premium accounts',description:'Receive approved WhatsApp reminders before important documents expire.',action:null},
    corporate:{title:'Corporate Account',icon:'ph-identification-card',status:'BUILDING',statusLabel:'In development',date:'In progress',category:'Corporate Workspace',availability:'Company accounts',description:'Manage personnel, assignments, compliance and official company workflows through one corporate account.',action:null},
    reports:{title:'Automated Scheduled Reports',icon:'ph-calendar-dots',status:'NEXT',statusLabel:'Planned',date:'Planned',category:'Reports',availability:'Company accounts',description:'Prepare and deliver recurring compliance reports on a defined schedule.',action:null},
    android:{title:'ATSRS Android App',icon:'ph-device-mobile',status:'NEXT',statusLabel:'Planned',date:'Planned',category:'Mobile',availability:'All accounts',description:'Access the ATSRS workspace from a dedicated Android application.',action:null}
  };
  var plans=[
    {key:'bronze',accent:'#a96d36',name:'BRONZE',status:'RECOMMENDED',title:'Active Job Seekers',price:'$19.99',period:'/ month',note:'Monthly billing',features:['1000 MB Secure Storage','200 Tracked Documents','Unlimited Email + 150 WhatsApp expiry alerts / month','15 AI document scans + 3 AI CV generations / month','Full JobSearch vacancy catalogue','Immediate access to newest vacancies','Recruiter details and verified contact routes','Direct Apply and original source links','Recruiter and official company directories','24-hour recipient-specific profile sharing']},
    {key:'silver',accent:'#8a9baa',name:'SILVER',status:'COMING SOON',title:'Frequent Career Activity',price:'$39.99',period:'/ month',note:'Planned price',features:['2 GB Secure Storage','700 Tracked Documents','Unlimited Email + 300 WhatsApp expiry alerts / month','50 AI document scans + 5 AI CV generations / month','Full JobSearch vacancy catalogue','Immediate access to newest vacancies','Recruiter details and verified contact routes','Direct Apply and original source links','Recruiter and official company directories','24-hour recipient-specific profile sharing']},
    {key:'gold',accent:'#c99b2d',name:'GOLD',status:'COMING SOON',title:'Intensive Career Management',price:'$69.99',period:'/ month',note:'Planned price',features:['5 GB Secure Storage','1,500 Tracked Documents','Unlimited Email + 750 WhatsApp expiry alerts / month','150 AI document scans + 7 AI CV generations / month','Full JobSearch vacancy catalogue','Immediate access to newest vacancies','Recruiter details and verified contact routes','Direct Apply and original source links','Recruiter and official company directories','24-hour recipient-specific profile sharing']},
    {key:'titan',accent:'#8d79b8',name:'TITAN',status:'COMING SOON',title:'Maximum Personal Capacity',price:'$119.99',period:'/ month',note:'Planned price',features:['10 GB Secure Storage','2,000 Tracked Documents','Unlimited Email and WhatsApp expiry alerts','500 AI document scans + 10 AI CV generations / month','Full JobSearch vacancy catalogue','Immediate access to newest vacancies','Recruiter details and verified contact routes','Direct Apply and original source links','Recruiter and official company directories','24-hour recipient-specific profile sharing']}
  ];
  var planCarousel=root.querySelector('.atlas-plan-carousel'),planControls=root.querySelector('.atlas-plan-controls'),planIndex=0,planTimer=0,planTransitionTimer=0,planVibrationTimer=0,planVibrationEndTimer=0;
  function planCardMarkup(plan,entering){return '<article class="atlas-plan-card is-'+plan.key+(entering?' is-entering':'')+'"><header><span>'+plan.status+'</span><p>'+plan.name+'</p></header><h3>'+plan.title+'</h3><div class="atlas-plan-price"><strong>'+plan.price+'</strong><span>'+plan.period+'</span><small>'+plan.note+'</small></div><ul>'+plan.features.map(function(feature){return '<li>'+feature+'</li>'}).join('')+'</ul></article>'}
  function schedulePlanVibration(card,reduceMotion){
    clearTimeout(planVibrationTimer);clearTimeout(planVibrationEndTimer);
    if(!card||reduceMotion)return;
    card.classList.remove('is-vibrating');
    planVibrationTimer=setTimeout(function(){
      if(!card.isConnected)return;
      card.classList.add('is-vibrating');
      planVibrationEndTimer=setTimeout(function(){if(card.isConnected)card.classList.remove('is-vibrating')},2000);
    },4000);
  }
  function showPlan(index,instant){
    if(!planCarousel||!planControls)return;
    planIndex=(index+plans.length)%plans.length;var plan=plans[planIndex];
    var showcase=root.querySelector('.atlas-pricing-showcase');if(showcase)showcase.style.setProperty('--plan-accent',plan.accent);
    clearTimeout(planTransitionTimer);planCarousel.querySelectorAll('.atlas-plan-card.is-leaving').forEach(function(card){card.remove()});
    var current=planCarousel.querySelector('.atlas-plan-card');var reduceMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var activeCard;
    if(!current||instant||reduceMotion){planCarousel.innerHTML=planCardMarkup(plan,false);activeCard=planCarousel.querySelector('.atlas-plan-card')}else{
      current.classList.remove('is-entering');current.classList.add('is-leaving');planCarousel.insertAdjacentHTML('beforeend',planCardMarkup(plan,true));
      var incoming=planCarousel.lastElementChild;activeCard=incoming;planTransitionTimer=setTimeout(function(){if(current&&current.isConnected)current.remove();if(incoming&&incoming.isConnected)incoming.classList.remove('is-entering')},920);
    }
    schedulePlanVibration(activeCard,reduceMotion);
    planControls.querySelectorAll('button').forEach(function(button,i){var active=i===planIndex;button.classList.toggle('active',active);button.setAttribute('aria-pressed',active?'true':'false')});
    var link=root.querySelector('.atlas-plan-link');if(link)link.href='/pricing.html#'+plan.key;
  }
  var plansVisible=false;
  function plansAreVisible(){return !document.hidden&&root.getClientRects().length>0}
  function startPlans(){clearInterval(planTimer);if(!plansAreVisible())return;planTimer=setInterval(function(){if(plansAreVisible())showPlan(planIndex+1);else syncPlanVisibility()},10000)}
  function syncPlanVisibility(){var visible=plansAreVisible();if(visible&&!plansVisible){showPlan(0,true);startPlans()}else if(!visible){clearInterval(planTimer);clearTimeout(planVibrationTimer);clearTimeout(planVibrationEndTimer)}plansVisible=visible}
  if(planControls){plans.forEach(function(plan,index){var button=document.createElement('button');button.type='button';button.setAttribute('aria-label','Show '+plan.name+' plan');button.addEventListener('click',function(){showPlan(index);startPlans()});planControls.appendChild(button)});showPlan(0,true);startPlans()}
  root.querySelectorAll('[data-plan-direction]').forEach(function(button){button.addEventListener('click',function(){showPlan(planIndex+(button.dataset.planDirection==='previous'?-1:1));startPlans()})});
  var pricingShowcase=root.querySelector('.atlas-pricing-showcase');if(pricingShowcase){pricingShowcase.addEventListener('pointerenter',function(){clearInterval(planTimer)});pricingShowcase.addEventListener('pointerleave',startPlans);pricingShowcase.addEventListener('focusin',function(){clearInterval(planTimer)});pricingShowcase.addEventListener('focusout',startPlans)}
  var planVisibilityObserver=new MutationObserver(syncPlanVisibility);
  [document.getElementById('app'),document.getElementById('introPage')].forEach(function(node){if(node)planVisibilityObserver.observe(node,{attributes:true,attributeFilter:['class','style','hidden']})});
  document.addEventListener('visibilitychange',syncPlanVisibility);
  window.addEventListener('pageshow',syncPlanVisibility);
  syncPlanVisibility();
  var canvas=root.querySelector('.updates-atlas-canvas');
  var routeCanvas=root.querySelector('.atlas-route-lines');
  var routeFrame=0,selectedMarker=null;
  function drawRoutes(){
    if(!routeCanvas||canvas.dataset.atlasMode==='list')return;
    var bounds=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
    if(!bounds.width||!bounds.height)return;
    routeCanvas.width=Math.round(bounds.width*dpr);routeCanvas.height=Math.round(bounds.height*dpr);
    routeCanvas.style.width=bounds.width+'px';routeCanvas.style.height=bounds.height+'px';
    var context=routeCanvas.getContext('2d');context.setTransform(dpr,0,0,dpr,0,0);context.clearRect(0,0,bounds.width,bounds.height);
    [['live','--atlas-green'],['building','--atlas-yellow'],['next','--atlas-next']].forEach(function(group){
      var zone=root.querySelector('.atlas-zone-'+group[0]);if(!zone)return;
      var zoneBox=zone.getBoundingClientRect(),startX=zoneBox.right-bounds.left-2,startY=zoneBox.top-bounds.top+zoneBox.height/2;
      var color=getComputedStyle(root).getPropertyValue(group[1]).trim(),markers=root.querySelectorAll('.atlas-marker.is-'+group[0]);
      var isLight=document.documentElement.dataset.theme==='light',routeAlpha=isLight?.58:.92;
      context.strokeStyle=color;context.fillStyle=color;context.lineWidth=isLight?1.25:1.75;context.globalAlpha=routeAlpha;context.setLineDash([4,7]);context.lineCap='round';context.shadowColor=color;context.shadowBlur=isLight?0:4;
      markers.forEach(function(marker,index){
        var icon=marker.querySelector('i'),target=(icon||marker).getBoundingClientRect();
        var endX=target.left-bounds.left+target.width/2,endY=target.top-bounds.top+target.height/2;
        var bendX=startX+Math.max(42,(endX-startX)*.42),spread=(index-(markers.length-1)/2)*10;
        context.beginPath();context.moveTo(startX,startY);context.bezierCurveTo(bendX,startY+spread,bendX,endY,endX,endY);context.stroke();
        context.setLineDash([]);context.globalAlpha=1;context.beginPath();context.arc(endX,endY,isLight?2.4:3,0,Math.PI*2);context.fill();context.setLineDash([4,7]);context.globalAlpha=routeAlpha;
      });
    });
    if(selectedMarker&&releaseCard&&!releaseCard.hidden){
      var markerBox=selectedMarker.getBoundingClientRect(),cardBox=releaseCard.getBoundingClientRect();
      var markerX=markerBox.left-bounds.left+markerBox.width/2,markerY=markerBox.top-bounds.top;
      var cardOnRight=cardBox.left>markerBox.left,cardX=(cardOnRight?cardBox.left:cardBox.right)-bounds.left;
      var cardTop=cardBox.top-bounds.top,cardBottom=cardBox.bottom-bounds.top;
      var cardY=Math.max(cardTop+40,Math.min(cardBottom-40,markerY-58)),direction=cardOnRight?1:-1;
      var elbowX=markerX+(38*direction),elbowY=Math.min(markerY-28,cardY);
      var connectorColor=selectedMarker.classList.contains('is-building')?getComputedStyle(root).getPropertyValue('--atlas-yellow').trim():selectedMarker.classList.contains('is-next')?getComputedStyle(root).getPropertyValue('--atlas-next').trim():getComputedStyle(root).getPropertyValue('--atlas-green').trim();
      context.save();context.setLineDash([]);context.strokeStyle=connectorColor;context.fillStyle=connectorColor;context.globalAlpha=.92;context.lineWidth=1.8;context.lineCap='round';context.lineJoin='round';context.shadowColor=connectorColor;context.shadowBlur=5;
      context.beginPath();context.moveTo(markerX,markerY);context.lineTo(elbowX,elbowY);context.lineTo(cardX-(8*direction),elbowY);context.lineTo(cardX,cardY);context.stroke();
      context.beginPath();context.arc(markerX,markerY,3,0,Math.PI*2);context.fill();context.restore();
    }
    context.globalAlpha=1;context.shadowBlur=0;
  }
  function scheduleRoutes(){cancelAnimationFrame(routeFrame);routeFrame=requestAnimationFrame(drawRoutes)}
  var releaseCard=root.querySelector('.atlas-release-card'),releaseCardTimer=0;
  function typeReleaseCopy(text){
    if(!releaseCard)return;clearInterval(releaseCardTimer);var copy=releaseCard.querySelector('[data-release-card-copy]'),index=0;copy.textContent='';
    if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){copy.textContent=text;return}
    releaseCardTimer=setInterval(function(){copy.textContent=text.slice(0,++index);if(index>=text.length)clearInterval(releaseCardTimer)},18);
  }
  function openReleaseCard(item,marker){
    if(!releaseCard)return;releaseCard.hidden=false;releaseCard.setAttribute('aria-hidden','false');releaseCard.classList.remove('is-visible');
    releaseCard.querySelector('.atlas-release-card-head>i').className='ph '+item.icon;
    releaseCard.querySelector('[data-release-card-status]').textContent=item.statusLabel;
    releaseCard.querySelector('[data-release-card-title]').textContent=item.title;
    releaseCard.querySelector('[data-release-card-meta]').textContent=item.category+' · '+item.availability+' · '+item.date;
    if(window.innerWidth>760&&marker){
      var canvasBox=canvas.getBoundingClientRect(),markerBox=marker.getBoundingClientRect(),cardWidth=Math.min(360,canvasBox.width-56);
      var placeRight=markerBox.left-canvasBox.left<canvasBox.width*.58;
      var left=placeRight?Math.min(canvasBox.width-cardWidth-28,markerBox.right-canvasBox.left+72):Math.max(28,markerBox.left-canvasBox.left-cardWidth-72);
      var top=Math.max(28,Math.min(canvasBox.height-280,markerBox.top-canvasBox.top-72));
      releaseCard.style.left=left+'px';releaseCard.style.top=top+'px';releaseCard.style.right='auto';releaseCard.style.bottom='auto';
    }else{releaseCard.style.removeProperty('left');releaseCard.style.removeProperty('top');releaseCard.style.removeProperty('right');releaseCard.style.removeProperty('bottom')}
    requestAnimationFrame(function(){releaseCard.classList.add('is-visible');scheduleRoutes()});typeReleaseCopy(item.description);
  }
  function closeReleaseCard(){if(!releaseCard)return;clearInterval(releaseCardTimer);releaseCard.classList.remove('is-visible');releaseCard.hidden=true;releaseCard.setAttribute('aria-hidden','true');selectedMarker=null;scheduleRoutes()}
  function select(key){
    var item=releases[key];if(!item)return;
    root.querySelectorAll('.atlas-marker').forEach(function(marker){marker.classList.toggle('is-selected',marker.dataset.release===key)});
    selectedMarker=root.querySelector('.atlas-marker[data-release="'+key+'"]');openReleaseCard(item,selectedMarker);
  }
  function clearSelection(){root.querySelectorAll('.atlas-marker.is-selected').forEach(function(marker){marker.classList.remove('is-selected')});closeReleaseCard()}
  root.querySelectorAll('.atlas-marker').forEach(function(marker){marker.addEventListener('click',function(){select(marker.dataset.release)})});
  root.addEventListener('click',function(event){if(!event.target.closest('[data-release],.atlas-release-card'))clearSelection()});
  var zoom=1,zoomOutput=root.querySelector('.atlas-zoom output');
  root.querySelectorAll('[data-atlas-zoom]').forEach(function(button){button.addEventListener('click',function(){var action=button.dataset.atlasZoom;zoom=action==='fit'?1:Math.max(.8,Math.min(1.3,zoom+(action==='in'?.1:-.1)));canvas.style.setProperty('--atlas-zoom',zoom.toFixed(2));zoomOutput.textContent=Math.round(zoom*100)+'%'})});
  var list=root.querySelector('.updates-atlas-list'),listItems=root.querySelector('.updates-atlas-list-items'),listPagination=root.querySelector('.updates-atlas-pagination'),RELEASES_PER_PAGE=30,listPage=1;
  function releasePageItems(current,count){if(count<=7)return Array.from({length:count},function(_,i){return i+1});var keep=Array.from(new Set([1,count,current-1,current,current+1].filter(function(n){return n>=1&&n<=count}))).sort(function(a,b){return a-b}),out=[];keep.forEach(function(n,i){if(i&&n-keep[i-1]>1)out.push('ellipsis');out.push(n)});return out}
  function releasePageButton(label,target,disabled,current,ariaLabel){var button=document.createElement('button');button.type='button';button.className='updates-atlas-page-button'+(current?' is-current':'');button.textContent=label;button.disabled=disabled;button.setAttribute('aria-label',ariaLabel);if(current)button.setAttribute('aria-current','page');if(!disabled)button.addEventListener('click',function(){listPage=target;renderReleaseList();if(list)list.scrollTo({top:0,behavior:'smooth'})});return button}
  function renderReleaseList(){
    if(!listItems||!listPagination)return;var keys=Object.keys(releases),pages=Math.max(1,Math.ceil(keys.length/RELEASES_PER_PAGE));listPage=Math.max(1,Math.min(listPage,pages));listItems.replaceChildren();
    keys.slice((listPage-1)*RELEASES_PER_PAGE,listPage*RELEASES_PER_PAGE).forEach(function(key){var item=releases[key],button=document.createElement('button');button.type='button';button.dataset.release=key;button.className='is-'+item.status.toLowerCase();button.innerHTML='<i class="ph '+item.icon+'"></i><strong>'+item.title+'</strong><span>'+item.statusLabel+'</span><small>'+item.description+'</small>';button.addEventListener('click',function(){select(key)});listItems.appendChild(button)});
    listPagination.replaceChildren();listPagination.hidden=pages<=1;if(pages<=1)return;listPagination.appendChild(releasePageButton('Previous',listPage-1,listPage<=1,false,'Previous product updates page'));releasePageItems(listPage,pages).forEach(function(item){if(item==='ellipsis'){var dots=document.createElement('span');dots.className='updates-atlas-page-ellipsis';dots.textContent='…';dots.setAttribute('aria-hidden','true');listPagination.appendChild(dots)}else listPagination.appendChild(releasePageButton(String(item),item,false,item===listPage,'Product updates page '+item))});listPagination.appendChild(releasePageButton('Next',listPage+1,listPage>=pages,false,'Next product updates page'));
  }
  var counts={live:0,building:0,next:0,total:0};Object.keys(releases).forEach(function(key){var status=releases[key].status.toLowerCase();if(counts[status]!==undefined)counts[status]+=1;counts.total+=1});Object.keys(counts).forEach(function(key){var output=root.querySelector('[data-atlas-count="'+key+'"]');if(output)output.textContent=counts[key]});renderReleaseList();
  window.addEventListener('resize',scheduleRoutes,{passive:true});
  window.addEventListener('pageshow',scheduleRoutes);
  window.addEventListener('hashchange',scheduleRoutes);
  window.addEventListener('popstate',scheduleRoutes);
  document.addEventListener('visibilitychange',scheduleRoutes);
  if(window.ResizeObserver)new ResizeObserver(scheduleRoutes).observe(canvas);
  new MutationObserver(scheduleRoutes).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  var page=root.closest('#introPage');if(page)new MutationObserver(scheduleRoutes).observe(page,{attributes:true,attributeFilter:['class','style','hidden']});
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(scheduleRoutes);
  scheduleRoutes();
  setTimeout(scheduleRoutes,250);setTimeout(scheduleRoutes,1000);
  var warmupCount=0,warmupTimer=setInterval(function(){scheduleRoutes();warmupCount+=1;if(warmupCount>=16)clearInterval(warmupTimer)},500);
  clearSelection();
})();
