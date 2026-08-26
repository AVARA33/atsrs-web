(function(){
  'use strict';

  var employers=[
    {id:'subsea7',name:'Subsea7',mark:'S7',summary:'Global offshore projects and services for the energy industry.',sector:'Offshore projects',tags:['Subsea','Offshore','Energy'],website:'https://www.subsea7.com/en/index.html/',careers:'https://careers.subsea7.com/?locale=en_US',contact:'https://www.subsea7.com/en/contact-us.html'},
    {id:'oceaneering',name:'Oceaneering',mark:'OI',summary:'Engineered services, products and one of the world’s largest ROV operations.',sector:'ROV & engineering',tags:['ROV','Subsea','Engineering'],website:'https://www.oceaneering.com/',careers:'https://www.oceaneering.com/careers/',contact:'https://www.oceaneering.com/contact-us/'},
    {id:'dof',name:'DOF Group',mark:'DOF',summary:'Integrated offshore and subsea services with marine and ROV opportunities.',sector:'Marine & subsea',tags:['Marine','ROV','Subsea'],website:'https://www.dof.com/',careers:'https://www.dof.com/vacancies',contact:'https://www.dof.com/contact'},
    {id:'fugro',name:'Fugro',mark:'FG',summary:'Global Geo-data specialist supporting marine, energy and infrastructure work.',sector:'Geo-data & survey',tags:['Survey','Marine','Geo-data'],website:'https://www.fugro.com/',careers:'https://www.fugro.com/careers',contact:'https://www.fugro.com/contact'}
  ];

  function byId(id){return document.getElementById(id)}
  function buttonLink(url,label,icon){var link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.innerHTML='<i class="ph ph-'+icon+'" aria-hidden="true"></i><span>'+label+'</span>';return link}
  function share(company){
    try{sessionStorage.setItem('atsrs_employer_share_target',JSON.stringify({id:company.id,name:company.name,contact:company.contact}))}catch(_error){}
    if(typeof window.showPage==='function'&&byId('navProfile'))window.showPage('profile',byId('navProfile'));
    setTimeout(function(){var sharing=byId('profileTabSharingBtn');if(sharing)sharing.click();var edit=byId('profileSharingEditBtn');if(edit)edit.click();var recipient=document.querySelector('input[name="profileSharingAudience"][value="recipient"]');if(recipient&&!recipient.disabled){recipient.checked=true;recipient.dispatchEvent(new Event('change',{bubbles:true}))}var status=byId('profileSharingCreateStatus');if(status)status.textContent='Create a secure link for '+company.name+', then copy it to the company’s official application route.'},0)
  }
  function card(company){
    var article=document.createElement('article');article.className='employer-card';article.dataset.employerId=company.id;
    var head=document.createElement('div');head.className='employer-card-head';var mark=document.createElement('div');mark.className='employer-mark';mark.textContent=company.mark;var copy=document.createElement('div');copy.className='employer-card-copy';var source=document.createElement('span');source.className='employer-source';source.innerHTML='<i class="ph ph-seal-check" aria-hidden="true"></i> Official public sources';var title=document.createElement('h4');title.textContent=company.name;var summary=document.createElement('p');summary.textContent=company.summary;copy.append(source,title,summary);head.append(mark,copy);
    var tags=document.createElement('div');tags.className='employer-tags';company.tags.forEach(function(value){var tag=document.createElement('span');tag.className='employer-tag';tag.textContent=value;tags.appendChild(tag)});
    var actions=document.createElement('div');actions.className='employer-actions';actions.append(buttonLink(company.website,'Website','globe'),buttonLink(company.careers,'Careers','briefcase'));var contact=buttonLink(company.contact,'Contact','arrow-square-out');actions.appendChild(contact);var shareButton=document.createElement('button');shareButton.type='button';shareButton.innerHTML='<i class="ph ph-share-network" aria-hidden="true"></i><span>Share my profile</span>';shareButton.addEventListener('click',function(){share(company)});actions.appendChild(shareButton);
    var verified=document.createElement('div');verified.className='employer-verified';verified.textContent='Source routes checked against the company’s official website · 26 Aug 2026';article.append(head,tags,actions,verified);return article
  }
  function render(){
    var grid=byId('employersGrid'),empty=byId('employersEmpty'),count=byId('employersVisibleCount');if(!grid)return;var query=String(byId('employersSearch').value||'').trim().toLowerCase(),sector=byId('employersSector').value;var visible=employers.filter(function(company){var haystack=[company.name,company.summary,company.sector].concat(company.tags).join(' ').toLowerCase();return(!query||haystack.indexOf(query)>=0)&&(!sector||company.sector===sector)});grid.textContent='';visible.forEach(function(company){grid.appendChild(card(company))});if(empty)empty.classList.toggle('hidden',visible.length>0);if(count)count.textContent=visible.length+' of '+employers.length+' companies'
  }
  function install(){
    var page=byId('employersPage');if(!page)return;var sector=byId('employersSector');Array.from(new Set(employers.map(function(company){return company.sector}))).sort().forEach(function(value){var option=document.createElement('option');option.value=value;option.textContent=value;sector.appendChild(option)});byId('employersSearch').addEventListener('input',render);sector.addEventListener('change',render);byId('employersClearFilters').addEventListener('click',function(){byId('employersSearch').value='';sector.value='';render()});render()
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
