/* Independent AI search surface. Existing catalogue and access rules stay in jobs-prototype.js. */
(function(){
'use strict';
function start(){
 var page=document.getElementById('jobsPage');
 if(!page||document.getElementById('personalSearchModes'))return;
 function node(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e}
 var nav=node('div','personal-search-modes');nav.id='personalSearchModes';nav.setAttribute('role','group');nav.setAttribute('aria-label','Job search mode');
 var browse=node('button','','Browse jobs'),ai=node('button','','AI Job Search');browse.type=ai.type='button';nav.append(browse,ai);
 var panel=node('section','personal-search-panel');panel.id='personalSearchPanel';panel.hidden=true;panel.setAttribute('aria-label','Personal AI Job Search');
 var title=node('h2','','Your next role, wherever it takes you.');
 var intro=node('p','','Describe your profession, preferred countries, experience and work preferences. Search international vacancies with source links.');
 var balance=node('div','personal-search-balance','Checking availability…');balance.setAttribute('aria-live','polite');
 var form=node('form'),label=node('label','','What kind of work are you looking for?'),input=node('textarea');input.id='personalSearchQuery';input.maxLength=2000;input.rows=3;input.placeholder='e.g. Electrical technician in Europe, offshore, 28/28 rotation';label.htmlFor=input.id;
 var submit=node('button','personal-search-submit','Find opportunities');submit.type='submit';submit.disabled=true;
 var rules=node('p','personal-search-rules','Each submitted search uses 1 credit, including follow-up requests and completed searches with no matches. Technical failures do not use credits. Browsing existing jobs is free.');
 var status=node('p','personal-search-status','');status.setAttribute('role','status');
 var packages=node('details','personal-search-packages'),summary=node('summary','','Extra search credits');
 packages.append(summary,node('p','','Search allowances will be included in eligible plans. When they run out, extra packages require a separate purchase. Package quantities and prices are being finalised; purchases are not open yet. No automatic charges.'));
 var results=node('div','personal-search-results');results.setAttribute('aria-live','polite');
 form.append(label,input,submit);panel.append(title,intro,balance,form,rules,packages,status,results);
 var hero=page.querySelector('.jobs-hero');hero.after(nav);nav.after(panel);
 var enabled=false,busy=false,currentUser=null,authBound=false,epoch=0;
 function mode(isAI){page.classList.toggle('personal-ai-active',isAI);panel.hidden=!isAI;browse.setAttribute('aria-pressed',String(!isAI));ai.setAttribute('aria-pressed',String(isAI));if(isAI)refresh()}
 browse.addEventListener('click',function(){mode(false)});ai.addEventListener('click',function(){mode(true)});mode(false);
 function update(){submit.disabled=busy||!enabled||input.value.trim().length<3;submit.textContent=busy?'Searching…':'Find opportunities'}
 input.addEventListener('input',update);
 async function call(body){
  var client=window.supabaseClient;if(!client)throw new Error('Search is temporarily unavailable. Please try again.');
  var result=await client.functions.invoke('personal-job-search',{body:body});
  if(result.error){var message='Search is temporarily unavailable. Please try again.';try{var details=await result.error.context.json();if(details.error)message=details.error}catch(ignore){}throw new Error(message)}
  return result.data;
 }
 async function refresh(){
  var ticket=++epoch;enabled=false;update();
  try{
   var client=window.supabaseClient;if(!client)throw new Error('Search is loading. Select AI Job Search again in a moment.');
   if(!authBound){authBound=true;client.auth.onAuthStateChange(function(event){if(event==='SIGNED_OUT'||event==='SIGNED_IN'){epoch++;enabled=false;currentUser=null;results.replaceChildren();input.value='';status.textContent='';update();if(!panel.hidden)setTimeout(refresh,0)}})}
   var session=await client.auth.getSession();if(ticket!==epoch)return;
   currentUser=session.data.session&&session.data.session.user.id;
   if(!currentUser){balance.textContent='Sign in to see your AI search allowance.';return}
   var data=await call({action:'status'});if(ticket!==epoch)return;
   enabled=data.enabled&&(data.included+data.extra)>0;
   balance.textContent=data.enabled?'Monthly searches: '+data.included+'/'+data.allowance+' remaining · Extra credits: '+data.extra:'Coming soon — AI search and paid credit packages are not open yet.';
   if(data.enabled&&!enabled)status.textContent='Your search credits are used up. You can still use Browse jobs.';
  }catch(error){if(ticket===epoch)balance.textContent=error.message}finally{if(ticket===epoch)update()}
 }
 form.addEventListener('submit',async function(event){
  event.preventDefault();if(busy||!enabled||input.value.trim().length<3)return;
  var owner=currentUser;busy=true;update();status.textContent='Searching international vacancy sources…';
  try{
   var data=await call({query:input.value.trim(),request_id:crypto.randomUUID()});
   if(owner!==currentUser)return;
   results.replaceChildren();results.append(node('h3','','Search results'),node('p','personal-search-answer',data.text));
   var list=node('ul','personal-search-sources');
   (data.sources||[]).forEach(function(source){try{var url=new URL(source.url);if(url.protocol!=='https:')return;var li=node('li'),link=node('a','',source.title||url.hostname);link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';li.append(link);list.append(li)}catch(ignore){}});
   if(list.children.length)results.append(node('h4','','Vacancy sources'),list);
   results.append(node('p','personal-search-rules','Check the source for current availability and eligibility before applying.'));
   status.textContent='Search complete · 1 credit used.';
  }catch(error){if(owner===currentUser)status.textContent=error.message}finally{busy=false;await refresh();update()}
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
