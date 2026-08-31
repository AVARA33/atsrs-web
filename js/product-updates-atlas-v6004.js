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
  function select(key){
    var item=releases[key];if(!item)return;
    root.querySelectorAll('.atlas-marker').forEach(function(marker){marker.classList.toggle('is-selected',marker.dataset.release===key)});
  }
  root.querySelectorAll('.atlas-marker').forEach(function(marker){marker.addEventListener('click',function(){select(marker.dataset.release)})});
  root.querySelectorAll('[data-atlas-view]').forEach(function(button){button.addEventListener('click',function(){root.querySelectorAll('[data-atlas-view]').forEach(function(item){item.classList.toggle('active',item===button)});canvas.dataset.atlasMode=button.dataset.atlasView})});
  var zoom=1,zoomOutput=root.querySelector('.atlas-zoom output');
  root.querySelectorAll('[data-atlas-zoom]').forEach(function(button){button.addEventListener('click',function(){var action=button.dataset.atlasZoom;zoom=action==='fit'?1:Math.max(.8,Math.min(1.3,zoom+(action==='in'?.1:-.1)));canvas.style.setProperty('--atlas-zoom',zoom.toFixed(2));zoomOutput.textContent=Math.round(zoom*100)+'%'})});
  var list=root.querySelector('.updates-atlas-list');
  Object.keys(releases).forEach(function(key){var item=releases[key],button=document.createElement('button');button.type='button';button.dataset.release=key;button.innerHTML='<i class="ph '+item.icon+'"></i><strong>'+item.title+'</strong><span>'+item.statusLabel+'</span><small>'+item.description+'</small>';button.addEventListener('click',function(){select(key)});list.appendChild(button)});
  select('jobs');
})();
