(function(){
  var root=document.querySelector('.updates-atlas');
  if(!root)return;
  var releases={
    jobs:{title:'Worldwide JobSearch',icon:'ph-globe-hemisphere-west',status:'LIVE',statusLabel:'Live',date:'31 Aug 2026',category:'Job Search',availability:'All accounts',description:'Discover opportunities across borders with trusted companies, verified recruiters and location-aware results.',action:function(){showPage('jobs',document.getElementById('navJobs'));window.dispatchEvent(new CustomEvent('atsrs:jobs-nav'))}},
    recruiters:{title:'Recruiter Directory',icon:'ph-user',status:'LIVE',statusLabel:'Live',date:'30 Aug 2026',category:'Directory',availability:'All accounts',description:'Access a verified recruiter network and build relationships that move your career forward.',action:function(){window.atsrsOpenJobsDirectory('recruiters',document.getElementById('navRecruiters'))}},
    companies:{title:'Company Directory',icon:'ph-buildings',status:'LIVE',statusLabel:'Live',date:'30 Aug 2026',category:'Directory',availability:'All accounts',description:'Explore company profiles and insights to find employers that match your ambitions.',action:function(){window.atsrsOpenJobsDirectory('employers',document.getElementById('navEmployers'))}},
    ai:{title:'AI Document Scan',icon:'ph-magic-wand',status:'LIVE',statusLabel:'Live',date:'29 Aug 2026',category:'Documents',availability:'Premium accounts',description:'Extract and review document details with AI-assisted scanning before saving.',action:null},
    qr:{title:'QR Phone Upload',icon:'ph-qr-code',status:'LIVE',statusLabel:'Live',date:'29 Aug 2026',category:'Documents',availability:'All accounts',description:'Upload a document from your phone through a secure QR handoff.',action:null},
    whatsapp:{title:'WhatsApp Expiry Alerts',icon:'ph-whatsapp-logo',status:'BUILDING',statusLabel:'In development',date:'In progress',category:'Notifications',availability:'Premium accounts',description:'Receive approved WhatsApp reminders before important documents expire.',action:null},
    reports:{title:'Automated Scheduled Reports',icon:'ph-calendar-dots',status:'NEXT',statusLabel:'Planned',date:'Planned',category:'Reports',availability:'Company accounts',description:'Prepare and deliver recurring compliance reports on a defined schedule.',action:null},
    android:{title:'ATSRS Android App',icon:'ph-device-mobile',status:'NEXT',statusLabel:'Planned',date:'Planned',category:'Mobile',availability:'All accounts',description:'Access the ATSRS workspace from a dedicated Android application.',action:null}
  };
  var canvas=root.querySelector('.updates-atlas-canvas');
  var routeCanvas=root.querySelector('.atlas-route-lines');
  var routeFrame=0;
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
    context.globalAlpha=1;context.shadowBlur=0;
  }
  function scheduleRoutes(){cancelAnimationFrame(routeFrame);routeFrame=requestAnimationFrame(drawRoutes)}
  function select(key){
    var item=releases[key];if(!item)return;
    root.querySelectorAll('.atlas-marker').forEach(function(marker){marker.classList.toggle('is-selected',marker.dataset.release===key)});
  }
  root.querySelectorAll('.atlas-marker').forEach(function(marker){marker.addEventListener('click',function(){select(marker.dataset.release)})});
  root.querySelectorAll('[data-atlas-view]').forEach(function(button){button.addEventListener('click',function(){root.querySelectorAll('[data-atlas-view]').forEach(function(item){item.classList.toggle('active',item===button)});canvas.dataset.atlasMode=button.dataset.atlasView;scheduleRoutes()})});
  var zoom=1,zoomOutput=root.querySelector('.atlas-zoom output');
  root.querySelectorAll('[data-atlas-zoom]').forEach(function(button){button.addEventListener('click',function(){var action=button.dataset.atlasZoom;zoom=action==='fit'?1:Math.max(.8,Math.min(1.3,zoom+(action==='in'?.1:-.1)));canvas.style.setProperty('--atlas-zoom',zoom.toFixed(2));zoomOutput.textContent=Math.round(zoom*100)+'%'})});
  var list=root.querySelector('.updates-atlas-list');
  Object.keys(releases).forEach(function(key){var item=releases[key],button=document.createElement('button');button.type='button';button.dataset.release=key;button.innerHTML='<i class="ph '+item.icon+'"></i><strong>'+item.title+'</strong><span>'+item.statusLabel+'</span><small>'+item.description+'</small>';button.addEventListener('click',function(){select(key)});list.appendChild(button)});
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
  select('jobs');
})();
