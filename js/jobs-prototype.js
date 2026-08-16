/* ATSRS V574 — read-only Jobs prototype. No mailbox or server writes. */
(function(){
  'use strict';
  var JOB_NEW_WINDOW_MS=6*60*60*1000;
  var jobsNewExpiryTimer=null;
  var jobsView='cards';
  try{jobsView=localStorage.getItem('atsrs_jobs_view')==='list'?'list':'cards'}catch(ignore){}
  var JOBS=[
    {id:'accord-supervisor-sep',title:'ROV Supervisor',company:'Accord People',location:'Norfolk, UK',worksite:'Vessel · MS Server',rov:'Super Mohawk',mobilisation:'1–5 Sep 2026',duration:'Approx. 12 operational days, plus mobilisation and demobilisation',received:'14 Aug 2026',summary:'Nearshore UK assignment within 12 nautical miles.',requirements:'GWO certificates, UK Right to Work, and Super Mohawk or Seaeye experience.',recruiterEmail:'ryan.webster@accordbps.com',source:'Recruiter email'},
    {id:'accord-pilot-sep',title:'ROV Pilot Technician',company:'Accord People',location:'Norfolk, UK',worksite:'Vessel · MS Server',rov:'Super Mohawk',mobilisation:'1–5 Sep 2026',duration:'Approx. 12 operational days, plus mobilisation and demobilisation',received:'14 Aug 2026',summary:'Two Pilot Technician positions on a nearshore UK assignment.',requirements:'GWO certificates, UK Right to Work, and Super Mohawk or Seaeye experience.',recruiterEmail:'ryan.webster@accordbps.com',source:'Recruiter email'},
    {id:'maris-taiwan-supervisor',title:'ROV Supervisor',company:'Maris Subsea',location:'Taiwan',worksite:'Vessel',rov:'Seaeye Falcon',mobilisation:'1 Sep 2026',duration:'3–4 weeks, plus two travel days either side',received:'6 Aug 2026',summary:'Platform inspection scope covering GVI, CP and marine-growth cleaning.',requirements:'Seaeye Falcon or similar experience; OPITO Survival, CA-EBS, OEUK, passport, Seaman’s Book and Full GWO.',recruiterPhone:'01224001215',recruiterEmail:'ellie.malim@marissubsea.com',source:'Recruiter email'},
    {id:'maris-taiwan-pilot',title:'ROV Pilot Technician',company:'Maris Subsea',location:'Taiwan',worksite:'Vessel',rov:'Seaeye Falcon',mobilisation:'1 Sep 2026',duration:'3–4 weeks, plus two travel days either side',received:'6 Aug 2026',summary:'Platform inspection scope covering GVI, CP and marine-growth cleaning.',requirements:'Seaeye Falcon or similar experience; OPITO Survival, CA-EBS, OEUK, passport, Seaman’s Book and Full GWO.',recruiterPhone:'01224001215',recruiterEmail:'ellie.malim@marissubsea.com',source:'Recruiter email'},
    {id:'maris-north-sea-supervisor',title:'ROV Supervisor',company:'Maris Subsea',location:'North Sea, UK',worksite:'Platform · outside 12 nm',rov:'Seaeye Falcon',mobilisation:'10 Sep 2026',duration:'3 weeks; possible rotation through October',received:'6 Aug 2026',summary:'Platform inspection scope including FMD, GVI, CP and marine-growth cleaning.',requirements:'Seaeye Falcon or similar experience; offshore certificates and valid UK work eligibility.',recruiterPhone:'01224001215',recruiterEmail:'ellie.malim@marissubsea.com',source:'Recruiter email'},
    {id:'maris-north-sea-pilot',title:'ROV Pilot Technician',company:'Maris Subsea',location:'North Sea, UK',worksite:'Platform · outside 12 nm',rov:'Seaeye Falcon',mobilisation:'10 Sep 2026',duration:'3 weeks; possible rotation through October',received:'6 Aug 2026',summary:'Platform inspection scope including FMD, GVI, CP and marine-growth cleaning.',requirements:'Seaeye Falcon or similar experience; offshore certificates and valid UK work eligibility.',recruiterPhone:'01224001215',recruiterEmail:'ellie.malim@marissubsea.com',source:'Recruiter email'},
    {id:'maris-poland-supervisor',title:'ROV Supervisor',company:'Maris Subsea',location:'Poland',worksite:'Platform',rov:'Seaeye Falcon',mobilisation:'15 Sep 2026',duration:'Not stated',received:'6 Aug 2026',summary:'Drill-support assignment covering spud-can survey and monitoring.',requirements:'Seaeye Falcon or similar experience; offshore certificates and valid UK or EU work eligibility.',recruiterPhone:'01224001215',recruiterEmail:'ellie.malim@marissubsea.com',source:'Recruiter email'},
    {id:'maris-poland-pilot',title:'ROV Pilot Technician',company:'Maris Subsea',location:'Poland',worksite:'Platform',rov:'Seaeye Falcon',mobilisation:'15 Sep 2026',duration:'Not stated',received:'6 Aug 2026',summary:'Drill-support assignment covering spud-can survey and monitoring.',requirements:'Seaeye Falcon or similar experience; offshore certificates and valid UK or EU work eligibility.',recruiterPhone:'01224001215',recruiterEmail:'ellie.malim@marissubsea.com',source:'Recruiter email'},
    {id:'maris-lowestoft-pilot',title:'ROV Pilot Technician',company:'Maris Subsea',location:'Lowestoft, UK',worksite:'Vessel · UK Southern North Sea',rov:'JM Robotics HD3',mobilisation:'19 Aug 2026',duration:'4-week rota with staggered two-week crew changes',received:'29 Jul 2026',rate:'£550/day · Limited Company',summary:'General visual inspection and CP-stab scope.',requirements:'Micro ROV experience; British passport, OPITO Survival, CA-EBS, OEUK, competence certificate and Seaman’s Book.',recruiterPhone:'01224001213',recruiterEmail:'cheryl.nicolson@marissubsea.com',source:'Recruiter email'},
    {id:'maris-australia-kystdesign',title:'ROV Supervisor / Pilot Technician',company:'Maris Subsea',location:'Australia',worksite:'Project-based',rov:'KystDesign',mobilisation:'Upcoming · exact date not stated',duration:'Up to 6 months, with possible extension',received:'23 Jul 2026',summary:'Longer-term heavy-construction ROV project.',requirements:'KystDesign experience, at least 3 years heavy-construction scope, 6 years ROV experience and 600 piloting hours.',recruiterPhone:'01224001215',recruiterEmail:'ellie.malim@marissubsea.com',source:'Recruiter email'}
  ];
  function byId(id){return document.getElementById(id)}
  function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function unique(key){return Array.from(new Set(JOBS.map(function(job){return job[key]}))).sort()}
  function option(value){return '<option value="'+esc(value)+'">'+esc(value)+'</option>'}
  function fact(label,value){return value?'<div class="job-fact"><dt>'+esc(label)+'</dt><dd>'+esc(value)+'</dd></div>':''}
  function recruiterFact(label,value,kind){return value?'<p class="job-contact-'+esc(kind||'item')+'"><strong>'+esc(label)+'</strong><span>'+esc(value)+'</span></p>':''}
  function publishedAtMs(job){
    if(!job||typeof job.published_at!=='string'||!job.published_at.trim())return NaN;
    return Date.parse(job.published_at);
  }
  function isNewPublishedJob(job,nowMs){
    var published=publishedAtMs(job),now=Number(nowMs);
    return Number.isFinite(published)&&Number.isFinite(now)&&published<=now&&now-published<JOB_NEW_WINDOW_MS;
  }
  function newBadge(job,nowMs){
    return isNewPublishedJob(job,nowMs)?'<span class="job-new-badge" aria-label="New vacancy published within the last 6 hours"><i aria-hidden="true">★</i><span>NEW</span></span>':'';
  }
  function card(job,nowMs){
    return '<article class="job-card" data-job-id="'+esc(job.id)+'">'+
      '<div class="job-card-head"><div><h2>'+esc(job.title)+'</h2><p class="job-card-company"><span>Recruiter</span>'+esc(job.company)+'</p></div><div class="job-card-meta">'+newBadge(job,nowMs)+'<span class="job-card-date">Received '+esc(job.received)+'</span></div></div>'+
      '<div class="job-project-info"><p class="job-card-summary">'+esc(job.summary)+'</p><dl class="job-facts">'+fact('Location',job.location)+fact('Mobilisation',job.mobilisation)+fact('ROV / equipment',job.rov)+fact('Duration',job.duration)+fact('Worksite',job.worksite)+fact('Rate',job.rate)+'</dl><p class="job-requirements"><strong>Requirements</strong><span>'+esc(job.requirements)+'</span></p></div>'+
      '<div class="job-contact-info"><h3 class="job-contact-title">Contact information</h3><div class="job-recruiter-info" aria-label="Recruiter information">'+recruiterFact('Recruiter organisation',job.company,'org')+recruiterFact('Recruiter phone',job.recruiterPhone,'phone')+recruiterFact('Recruiter email',job.recruiterEmail,'email')+recruiterFact('Listing source',job.source,'source')+'</div></div></article>';
  }
  function updateView(){
    var grid=byId('jobsGrid');if(grid){grid.classList.toggle('jobs-list',jobsView==='list');grid.classList.toggle('jobs-cards',jobsView==='cards')}
    document.querySelectorAll('[data-jobs-view]').forEach(function(button){
      var selected=button.dataset.jobsView===jobsView;
      button.classList.toggle('active',selected);
      button.setAttribute('aria-pressed',selected?'true':'false');
    });
  }
  function render(){
    var grid=byId('jobsGrid');if(!grid)return;
    if(jobsNewExpiryTimer!==null){clearTimeout(jobsNewExpiryTimer);jobsNewExpiryTimer=null}
    var nowMs=Date.now();
    var query=String(byId('jobsSearch')&&byId('jobsSearch').value||'').trim().toLowerCase();
    var role=String(byId('jobsRoleFilter')&&byId('jobsRoleFilter').value||'');
    var location=String(byId('jobsLocationFilter')&&byId('jobsLocationFilter').value||'');
    var filtered=JOBS.filter(function(job){var hay=[job.title,job.company,job.location,job.rov,job.summary].join(' ').toLowerCase();return(!query||hay.indexOf(query)!==-1)&&(!role||job.title===role)&&(!location||job.location===location)});
    grid.innerHTML=filtered.map(function(job){return card(job,nowMs)}).join('');updateView();
    var nearestExpiry=filtered.reduce(function(nearest,job){
      var published=publishedAtMs(job),expiry=published+JOB_NEW_WINDOW_MS;
      return isNewPublishedJob(job,nowMs)&&expiry<nearest?expiry:nearest;
    },Infinity);
    if(Number.isFinite(nearestExpiry))jobsNewExpiryTimer=setTimeout(render,Math.max(1,nearestExpiry-nowMs+1));
    grid.classList.toggle('hidden',!filtered.length);var empty=byId('jobsEmpty');if(empty)empty.classList.toggle('hidden',!!filtered.length);
    var count=byId('jobsVisibleCount');if(count)count.textContent=filtered.length+' opportunit'+(filtered.length===1?'y':'ies');
  }
  function boot(){
    var role=byId('jobsRoleFilter'),location=byId('jobsLocationFilter');if(!role||!location)return;
    role.insertAdjacentHTML('beforeend',unique('title').map(option).join(''));location.insertAdjacentHTML('beforeend',unique('location').map(option).join(''));
    ['jobsSearch','jobsRoleFilter','jobsLocationFilter'].forEach(function(id){var el=byId(id);if(el)el.addEventListener(id==='jobsSearch'?'input':'change',render)});
    var clear=byId('jobsClearFilters');if(clear)clear.addEventListener('click',function(){byId('jobsSearch').value='';role.value='';location.value='';render()});
    document.querySelectorAll('[data-jobs-view]').forEach(function(button){button.addEventListener('click',function(){
      jobsView=button.dataset.jobsView==='list'?'list':'cards';
      try{localStorage.setItem('atsrs_jobs_view',jobsView)}catch(ignore){}
      updateView();
    })});
    render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  window.atsrsJobsPrototype={count:JOBS.length,render:render,getView:function(){return jobsView},isNewPublishedJob:isNewPublishedJob,newWindowMs:JOB_NEW_WINDOW_MS};
})();
