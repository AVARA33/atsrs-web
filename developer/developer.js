(function(){
  'use strict';
  var SUPABASE_URL='https://hwtjuqyxzivymofamwxl.supabase.co';
  var SUPABASE_KEY='sb_publishable_57xvbnJGp7pTXvfG11EdvA_Du_LvVyD';
  var ENDPOINT=SUPABASE_URL+'/functions/v1/developer-editor-actions';
  var client=null,session=null,status=null,changes=[],auditRows=[],activeChange=null,files=[],openFile=null;
  function byId(id){return document.getElementById(id)}
  function safe(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function preferredTheme(){var saved=localStorage.getItem('atsrs_theme');if(saved==='light'||saved==='dark')return saved;return matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}
  function applyTheme(theme){
    var selected=theme==='light'?'light':'dark';document.documentElement.dataset.theme=selected;
    document.querySelectorAll('[data-theme-mark]').forEach(function(mark){mark.src=selected==='light'?'../assets/branding/atsrs-mark-blue.png':'../assets/branding/atsrs-mark-green.png'});
    var favicon=byId('developerFavicon');if(favicon)favicon.href=selected==='light'?'../assets/branding/atsrs-favicon-blue-v576.png':'../assets/branding/atsrs-favicon-green-v576.png';
    document.querySelectorAll('.theme-button').forEach(function(button){button.textContent=selected==='light'?'Dark mode':'Light mode';button.setAttribute('aria-label','Switch to '+(selected==='light'?'dark':'light')+' theme')});
  }
  function wireThemeButtons(){document.querySelectorAll('.theme-button').forEach(function(button){if(button.dataset.themeWired)return;button.dataset.themeWired='true';button.onclick=function(){var next=document.documentElement.dataset.theme==='light'?'dark':'light';localStorage.setItem('atsrs_theme',next);applyTheme(next)}})}
  function toast(message,error){var el=byId('toast');el.textContent=message;el.className='toast'+(error?' error':'');clearTimeout(el.__timer);el.__timer=setTimeout(function(){el.classList.add('hidden')},5000)}
  function busy(button,value,label){if(!button)return;if(value){button.dataset.label=button.textContent;button.textContent=label||'Working…';button.disabled=true}else{button.textContent=button.dataset.label||button.textContent;button.disabled=false}}
  async function api(action,payload){
    var current=await client.auth.getSession();session=current.data.session;
    if(!session)throw new Error('Authentication is required.');
    var response=await fetch(ENDPOINT,{method:'POST',headers:{Authorization:'Bearer '+session.access_token,apikey:SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify(Object.assign({action:action},payload||{}))});
    var data=await response.json().catch(function(){return{}});
    if(!response.ok){var error=new Error(data.error||'Request failed.');error.code=data.code;throw error}
    return data;
  }
  async function exchangeCallback(){
    var params=new URLSearchParams(location.search),code=params.get('code');
    if(!code)return;
    var result=await client.auth.exchangeCodeForSession(code);
    if(result.error)throw result.error;
    history.replaceState({},'',location.pathname);
  }
  function showGate(title,message,mode){
    if(byId('workspace'))byId('workspace').classList.add('hidden');byId('accessGate').classList.remove('hidden');byId('gateTitle').textContent=title;byId('gateMessage').textContent=message;
    byId('loginLink').classList.toggle('hidden',mode!=='login');byId('mfaButton').classList.toggle('hidden',mode!=='mfa');
  }
  function showWorkspace(){if(!byId('workspace')){var template=byId('workspaceTemplate');document.body.insertBefore(template.content.cloneNode(true),byId('toast'));wireWorkspace()}byId('accessGate').classList.add('hidden')}
  function renderPolicy(policy){
    var labels=[['LOW RISK',policy.low_risk||[],'low'],['OWNER APPROVAL',policy.owner_approval||[],'owner'],['PROTECTED',policy.protected||[],'']];
    byId('policySummary').innerHTML=labels.map(function(item){return'<div><b class="tag '+item[2]+'">'+item[0]+'</b><ul>'+item[1].map(function(line){return'<li>'+safe(line)+'</li>'}).join('')+'</ul></div>'}).join('');
  }
  function switchPanel(name){
    document.querySelectorAll('.panel').forEach(function(panel){panel.classList.toggle('is-active',panel.id==='panel-'+name)});
    document.querySelectorAll('.nav').forEach(function(button){button.classList.toggle('is-active',button.dataset.panel===name)});
    if(name==='owner'&&status&&status.role==='owner')loadDevelopers();
    if(name==='history')renderHistory();
  }
  function countStatus(names){return changes.filter(function(change){return names.indexOf(change.status)>=0}).length}
  function renderOverview(){byId('statActive').textContent=countStatus(['draft','checking','ready']);byId('statApproval').textContent=countStatus(['approval_requested']);byId('statFailed').textContent=countStatus(['checks_failed']);byId('statDeployed').textContent=countStatus(['deployed','rollback_ready','rolled_back'])}
  function changeHtml(change){
    var risk=change.risk_class==='OWNER_APPROVAL_REQUIRED'?'owner':'low';
    return'<article class="list-item"><div><h3>'+safe(change.title)+'</h3><p>'+safe(change.affected_area)+' · '+safe(change.branch_name)+'</p><div class="meta"><span class="tag '+risk+'">'+safe(change.risk_class)+'</span><span class="tag">'+safe(change.status)+'</span><span class="tag">'+safe((change.modified_files||[]).length)+' files</span></div></div><button class="button secondary select-change" data-id="'+safe(change.id)+'" type="button">Open</button></article>';
  }
  function renderChanges(){var html=changes.length?changes.map(changeHtml).join(''):'<div class="card empty">No changes yet.</div>';byId('changesList').innerHTML=html;byId('historyList').innerHTML=html;document.querySelectorAll('.select-change').forEach(function(button){button.onclick=function(){selectChange(button.dataset.id)}});renderOverview()}
  async function renderHistory(){try{var data=await api('audit_log');auditRows=data.audit||[]}catch(error){toast(error.message,true)}byId('historyList').innerHTML=auditRows.length?auditRows.map(function(row){return'<article class="list-item"><div><h3>'+safe(row.action)+'</h3><p>'+safe(row.result)+' · '+safe(row.created_at)+'</p><div class="meta"><span class="tag">'+safe(row.actor_role)+'</span><span class="tag">'+safe((row.files||[]).join(', ')||'no files')+'</span></div></div></article>'}).join(''):'<div class="card empty">No audit history yet.</div>'}
  async function loadChanges(){
    if(!status.github_ready){changes=[];renderChanges();return}
    try{var data=await api('list_changes');changes=data.changes||[];renderChanges();if(activeChange){activeChange=changes.find(function(change){return change.id===activeChange.id})||activeChange;renderActive()}}
    catch(error){toast(error.message,true)}
  }
  function renderActive(){
    byId('activeChangeLabel').textContent=activeChange?activeChange.title+' · '+activeChange.branch_name:'Select a change first.';
    byId('releaseCard').innerHTML=activeChange?'<h3>'+safe(activeChange.title)+'</h3><p>Status: <b>'+safe(activeChange.status)+'</b></p><p>Risk: <b>'+safe(activeChange.risk_class)+'</b></p><p>Files: '+safe((activeChange.modified_files||[]).join(', ')||'No modifications yet')+'</p>':'Select a change to review its release status.';
    byId('ownerDecisionActions').classList.toggle('hidden',!(status&&status.role==='owner'&&activeChange&&activeChange.status==='approval_requested'));
    if(activeChange&&activeChange.checks&&Object.keys(activeChange.checks).length)renderChecks(activeChange.checks,activeChange.status);
  }
  async function selectChange(id){
    activeChange=changes.find(function(change){return change.id===id})||null;openFile=null;byId('codeEditor').value='';syncEditor();renderActive();
    if(!activeChange)return;
    switchPanel('editor');
    try{var data=await api('list_files',{change_id:activeChange.id});files=data.files||[];renderFiles()}
    catch(error){toast(error.message,true)}
  }
  function renderFiles(){var query=byId('fileSearch').value.toLowerCase();var visible=files.filter(function(file){return !query||file.path.toLowerCase().indexOf(query)>=0});byId('fileList').innerHTML=visible.map(function(file){return'<button type="button" class="file-button'+(openFile&&openFile.path===file.path?' is-active':'')+'" data-path="'+safe(file.path)+'">'+safe(file.path)+'</button>'}).join('');byId('fileList').querySelectorAll('button').forEach(function(button){button.onclick=function(){openPath(button.dataset.path)}})}
  async function openPath(path){
    try{var data=await api('open_file',{change_id:activeChange.id,path:path});openFile=data;byId('openPath').textContent=data.path;byId('riskBadge').textContent=data.risk;byId('riskBadge').className='tag '+(data.risk==='OWNER_APPROVAL_REQUIRED'?'owner':'low');byId('codeEditor').value=data.content;syncEditor();renderFiles()}
    catch(error){toast((error.code?error.code+': ':'')+error.message,true)}
  }
  function highlight(value){
    var text=safe(value);
    text=text.replace(/(\/\*[\s\S]*?\*\/|\/\/[^\n]*)/g,'<span class="tok-com">$1</span>');
    text=text.replace(/(&quot;[^&\n]*?&quot;|&#39;[^&\n]*?&#39;)/g,'<span class="tok-str">$1</span>');
    text=text.replace(/\b(const|let|var|function|return|if|else|async|await|class|new|true|false|null|@media|display|position|color|background)\b/g,'<span class="tok-key">$1</span>');
    text=text.replace(/\b(\d+(?:\.\d+)?(?:px|rem|em|%|s|ms)?)\b/g,'<span class="tok-num">$1</span>');return text+'\n';
  }
  function syncEditor(){var editor=byId('codeEditor'),lines=Math.max(1,editor.value.split('\n').length);byId('lineNumbers').textContent=Array.from({length:lines},function(_,i){return i+1}).join('\n');byId('codeMirror').innerHTML=highlight(editor.value);byId('codeMirror').scrollTop=editor.scrollTop;byId('codeMirror').scrollLeft=editor.scrollLeft;byId('lineNumbers').scrollTop=editor.scrollTop}
  async function saveFile(){if(!activeChange||!openFile)return toast('Open an approved file first.',true);var button=byId('saveButton');busy(button,true,'Saving…');try{var data=await api('save_file',{change_id:activeChange.id,path:openFile.path,content:byId('codeEditor').value});toast('Saved to isolated branch.');await loadChanges();activeChange=changes.find(function(change){return change.id===activeChange.id})||activeChange;renderActive()}catch(error){toast((error.code?error.code+': ':'')+error.message,true)}finally{busy(button,false)}}
  async function syncChange(){if(!activeChange)return toast('Select a change first.',true);var button=byId('syncButton');busy(button,true,'Syncing…');try{var data=await api('sync_change',{change_id:activeChange.id});toast(data.synced?'Change synced with current main.':'Change is already current.');await loadChanges()}catch(error){toast((error.code?error.code+': ':'')+error.message,true)}finally{busy(button,false)}}
  async function showDiff(){if(!activeChange)return toast('Select a change first.',true);try{var data=await api('diff',{change_id:activeChange.id});var view=byId('diffView');view.classList.remove('hidden');view.innerHTML='<h3>Before → After</h3><p>'+safe(data.files.length)+' files · risk '+safe(data.risk)+'</p>'+data.files.map(function(file){return'<div class="diff-file"><h3>'+safe(file.filename)+' · +'+safe(file.additions)+' / -'+safe(file.deletions)+'</h3><pre>'+safe(file.patch||'Binary or patch unavailable')+'</pre></div>'}).join('');view.scrollIntoView({behavior:'smooth',block:'start'})}catch(error){toast(error.message,true)}}
  function renderChecks(checks,state){var url=checks.url?'<a class="button secondary" target="_blank" rel="noopener" href="'+safe(checks.url)+'">Open protected run</a>':'';byId('checksCard').innerHTML='<h3>'+safe(state||checks.status||'checking')+'</h3><p>Head SHA: <code>'+safe(checks.head_sha||'pending')+'</code></p><p>Conclusion: '+safe(checks.conclusion||'pending')+'</p>'+url}
  async function runChecks(){if(!activeChange)return toast('Select a change first.',true);var button=byId('runChecksButton');busy(button,true,'Starting…');try{await api('run_checks',{change_id:activeChange.id});renderChecks({head_sha:activeChange.head_sha},'checking');toast('Protected checks started.')}catch(error){toast(error.message,true)}finally{busy(button,false)}}
  async function checkStatus(){if(!activeChange)return toast('Select a change first.',true);try{var data=await api('checks_status',{change_id:activeChange.id});renderChecks(data.checks||{},data.status);await loadChanges()}catch(error){toast(error.message,true)}}
  async function preview(){if(!activeChange)return toast('Select a change first.',true);try{var data=await api('create_preview',{change_id:activeChange.id,entry_path:byId('previewEntry').value});byId('previewFrame').src=data.preview_url;toast('Short-lived preview created.')}catch(error){toast(error.message,true)}}
  async function release(action){if(!activeChange)return toast('Select a change first.',true);var button=action==='publish'?byId('publishButton'):byId('approvalButton');busy(button,true,action==='publish'?'Publishing…':'Requesting…');try{var data=await api(action,{change_id:activeChange.id});toast(data.deployed?'Published through protected pipeline.':'Owner approval requested.');await loadChanges()}catch(error){toast((error.code?error.code+': ':'')+error.message,true)}finally{busy(button,false)}}
  async function ownerDecision(decision){if(!activeChange)return;var note=decision==='approve'?'':prompt('Optional Owner note:')||'';try{var data=await api('owner_decide',{change_id:activeChange.id,decision:decision,note:note});toast(data.commit_sha?'Approved and published.':'Owner decision recorded.');await loadChanges()}catch(error){toast(error.message,true)}}
  async function rollback(){if(!activeChange)return toast('Select a deployed change first.',true);if(!confirm('Request the protected rollback workflow for this low-risk change?'))return;try{await api('rollback',{change_id:activeChange.id});toast('Protected rollback workflow requested.');await loadChanges()}catch(error){toast(error.message,true)}}
  async function loadDevelopers(){if(!status||status.role!=='owner')return;try{var data=await api('owner_list_developers');var rows=data.developers||[];byId('developerList').innerHTML=rows.length?rows.map(function(item){return'<article class="list-item"><div><h3>'+safe(item.display_name)+'</h3><p>'+safe(item.email)+'</p><div class="meta"><span class="tag">'+safe(item.status)+'</span><span class="tag">Last login '+safe(item.last_login_at||'never')+'</span></div></div><div class="actions"><button class="button secondary dev-state" data-id="'+safe(item.user_id)+'" data-state="active">Enable</button><button class="button secondary dev-state" data-id="'+safe(item.user_id)+'" data-state="disabled">Disable</button><button class="button secondary dev-state" data-id="'+safe(item.user_id)+'" data-state="revoked">Revoke</button></div></article>'}).join(''):'<div class="card empty">No Developer Editor accounts.</div>';byId('developerList').querySelectorAll('.dev-state').forEach(function(button){button.onclick=function(){updateDeveloper(button)}})}catch(error){toast(error.message,true)}}
  async function updateDeveloper(button){var state=button.dataset.state;if(state==='revoked'&&!confirm('Revoke this developer immediately and invalidate active sessions?'))return;busy(button,true,'Updating…');try{await api('owner_update_developer',{user_id:button.dataset.id,status:state});toast('Developer access updated.');await loadDevelopers()}catch(error){toast(error.message,true)}finally{busy(button,false)}}
  async function inviteDeveloper(event){event.preventDefault();var button=event.currentTarget.querySelector('button'),form=new FormData(event.currentTarget);busy(button,true,'Inviting…');try{await api('owner_invite',{email:form.get('email'),display_name:form.get('display_name')});event.currentTarget.reset();toast('Developer invitation sent.');await loadDevelopers()}catch(error){toast(error.message,true)}finally{busy(button,false)}}
  async function verifyMfa(){
    var modal=byId('mfaModal'),content=byId('mfaContent');modal.classList.remove('hidden');content.innerHTML='<p>Preparing authenticator verification…</p>';
    try{var listed=await client.auth.mfa.listFactors();if(listed.error)throw listed.error;var factors=(listed.data.totp||[]).filter(function(item){return item.status==='verified'});if(factors.length){await challengeFactor(factors[0].id);return}
      var enrolled=await client.auth.mfa.enroll({factorType:'totp',friendlyName:'ATSRS Developer Editor'});if(enrolled.error)throw enrolled.error;content.innerHTML='<p>Scan this QR code in your authenticator app, then enter the six-digit code.</p><img alt="Authenticator QR code" src="'+safe(enrolled.data.totp.qr_code)+'"><code>'+safe(enrolled.data.totp.secret)+'</code><input id="mfaCode" inputmode="numeric" maxlength="6" autocomplete="one-time-code"><button id="mfaVerify" class="button" type="button">Enable and verify</button>';byId('mfaVerify').onclick=function(){completeMfa(enrolled.data.id)}
    }catch(error){content.innerHTML='<p class="danger">'+safe(error.message)+'</p>'}
  }
  async function challengeFactor(id){var challenge=await client.auth.mfa.challenge({factorId:id});if(challenge.error)throw challenge.error;byId('mfaContent').innerHTML='<p>Enter the six-digit code from your authenticator app.</p><input id="mfaCode" inputmode="numeric" maxlength="6" autocomplete="one-time-code"><button id="mfaVerify" class="button" type="button">Verify</button>';byId('mfaVerify').onclick=function(){completeMfa(id,challenge.data.id)}}
  async function completeMfa(factorId,challengeId){var code=(byId('mfaCode').value||'').replace(/\D/g,'');if(code.length!==6)return toast('Enter the six-digit code.',true);try{var challenge=challengeId?{data:{id:challengeId}}:await client.auth.mfa.challenge({factorId:factorId});if(challenge.error)throw challenge.error;var result=await client.auth.mfa.verify({factorId:factorId,challengeId:challenge.data.id,code:code});if(result.error)throw result.error;byId('mfaModal').classList.add('hidden');toast('Identity verified.');await initialize()}catch(error){toast(error.message,true)}}
  async function initialize(){
    showGate('Verifying access…','Developer access is checked by the ATSRS server.');
    try{await exchangeCallback()}catch(error){showGate('Sign-in link failed',error.message,'login');return}
    var current=await client.auth.getSession();session=current.data.session;
    if(!session){showGate('Log in required','Use your own ATSRS account. Owner credentials are never shared.','login');return}
    try{status=await api('status')}catch(error){showGate(error.code==='DEVELOPER_ACCESS_DENIED'?'Access denied':'Developer service unavailable',error.message);return}
    if(status.mfa!=='verified'){showGate('Authenticator required','Privileged Developer Editor access requires ATSRS two-factor authentication.','mfa');return}
    showWorkspace();byId('identityName').textContent=status.identity.display_name;byId('identityEmail').textContent=status.identity.email;byId('roleBadge').textContent=status.role==='owner'?'Owner supervision':'Developer Editor';byId('ownerNav').classList.toggle('hidden',status.role!=='owner');renderPolicy(status.policy);
    byId('serviceBanner').classList.toggle('hidden',status.github_ready);if(!status.github_ready)byId('serviceBanner').textContent='Repository actions are safely disabled until Owner installs the restricted ATSRS GitHub App. No personal GitHub token will be used.';
    await loadChanges();if(status.role==='owner')await loadDevelopers();
  }
  function wireWorkspace(){
    wireThemeButtons();applyTheme(document.documentElement.dataset.theme||preferredTheme());
    document.querySelectorAll('.nav').forEach(function(button){button.onclick=function(){switchPanel(button.dataset.panel)}});byId('logoutButton').onclick=async function(){await client.auth.signOut();location.replace('../?view=login')};byId('refreshButton').onclick=loadChanges;byId('changeForm').onsubmit=async function(event){event.preventDefault();var button=event.currentTarget.querySelector('button'),form=new FormData(event.currentTarget);busy(button,true,'Creating…');try{var data=await api('create_change',{title:form.get('title'),affected_area:form.get('affected_area'),bug_summary:form.get('bug_summary'),description:form.get('description')});event.currentTarget.reset();toast('Isolated branch created.');await loadChanges();selectChange(data.change.id)}catch(error){toast(error.message,true)}finally{busy(button,false)}};
    byId('fileSearch').oninput=renderFiles;byId('codeEditor').oninput=syncEditor;byId('codeEditor').onscroll=syncEditor;byId('saveButton').onclick=saveFile;byId('syncButton').onclick=syncChange;byId('diffButton').onclick=showDiff;byId('previewButton').onclick=preview;byId('runChecksButton').onclick=runChecks;byId('checkStatusButton').onclick=checkStatus;byId('approvalButton').onclick=function(){release('request_approval')};byId('publishButton').onclick=function(){release('publish')};byId('rollbackButton').onclick=rollback;byId('ownerApprove').onclick=function(){ownerDecision('approve')};byId('ownerRequestChanges').onclick=function(){ownerDecision('request_changes')};byId('ownerReject').onclick=function(){ownerDecision('reject')};byId('inviteForm').onsubmit=inviteDeveloper;
  }
  function wireGate(){byId('mfaButton').onclick=verifyMfa;byId('mfaCancel').onclick=function(){byId('mfaModal').classList.add('hidden')};wireThemeButtons()}
  document.addEventListener('DOMContentLoaded',function(){applyTheme(preferredTheme());client=supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});wireGate();initialize()});
})();
