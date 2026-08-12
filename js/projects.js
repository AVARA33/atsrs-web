(function(){
  'use strict';

  var state={editingProjectId:'',assignmentPersonId:'',membersProjectId:'',projectView:'cards'};
  var projectViewExplicit=false;
  try{
    state.projectView=localStorage.getItem('atsrs_project_view')||'cards';
    projectViewExplicit=localStorage.getItem('atsrs_project_view_explicit')==='true';
    if(window.matchMedia&&window.matchMedia('(max-width: 720px)').matches&&!projectViewExplicit)state.projectView='cards';
  }catch(ignore){}

  function el(id){return document.getElementById(id)}
  function safe(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function now(){return new Date().toISOString()}
  function today(){return new Date().toISOString().slice(0,10)}
  function createId(){
    if(window.atsrsStableIds&&typeof window.atsrsStableIds.create==='function')return window.atsrsStableIds.create();
    if(window.crypto&&typeof window.crypto.randomUUID==='function')return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(character){
      var random=Math.random()*16|0;var value=character==='x'?random:(random&3|8);return value.toString(16);
    });
  }
  function projects(){try{return typeof window.getProjects==='function'?window.getProjects():[]}catch(ignore){return []}}
  function personnel(){try{return typeof window.getData==='function'?window.getData('personnel'):[]}catch(ignore){return []}}
  function projectName(project){return String(project&&project.project||project&&project.name||'Untitled project').trim()||'Untitled project'}
  function projectId(project){return String(project&&project.atsrsId||project&&project.id||'')}
  function personId(person){return String(person&&person.linkedUserId||person&&person.user_id||person&&person.profile_user_id||person&&person.atsrsId||'')}
  function personName(person){return [person&&person.name,person&&person.surname].filter(Boolean).join(' ').trim()||person&&person.email||'Personnel member'}
  function assignmentId(assignment){return String(assignment&&assignment.atsrsId||assignment&&assignment.id||'')}
  function dateIsPast(value){return !!value&&String(value)<today()}
  function isAssignmentActive(assignment){return String(assignment&&assignment.status||'active')!=='ended'&&!dateIsPast(assignment&&assignment.endDate)}
  function normalizedAssignments(person){
    var explicit=Array.isArray(person&&person.atsrsProjectAssignments)?person.atsrsProjectAssignments.map(function(item){
      return Object.assign({},item,{atsrsId:assignmentId(item)||createId(),projectId:String(item&&item.projectId||'')});
    }).filter(function(item){return item.projectId}):[];
    var known={};explicit.forEach(function(item){known[item.projectId]=true});
    (Array.isArray(person&&person.atsrsProjectIds)?person.atsrsProjectIds:[]).forEach(function(id){
      id=String(id||'');if(id&&!known[id])explicit.push({atsrsId:createId(),projectId:id,role:'',startDate:'',endDate:'',status:'active',primary:false,assignedAt:'',updatedAt:''});
    });
    return explicit;
  }
  function statusLabel(value){return {draft:'Draft',active:'Active',on_hold:'On hold',completed:'Completed',archived:'Archived',ended:'Ended'}[value]||'Draft'}
  function projectStatus(project){return project&&project.archived?'archived':String(project&&project.status||'draft')}
  function dateRange(project){
    var start=String(project&&project.startDate||'');var end=String(project&&project.endDate||'');
    if(start&&end)return start+' - '+end;if(start)return 'From '+start;if(end)return 'Until '+end;return 'Dates not set';
  }
  function assignmentProjectMap(){var map={};projects().forEach(function(project){map[projectId(project)]=project});return map}
  function findPerson(identifier,list){
    identifier=String(identifier||'');list=list||personnel();
    return list.find(function(person){return personId(person)===identifier||String(person.atsrsId||'')===identifier||String(person.linkedUserId||'')===identifier})||null;
  }
  function findProject(identifier,list){identifier=String(identifier||'');list=list||projects();return list.find(function(project){return projectId(project)===identifier})||null}
  function notify(message,type){
    if(typeof window.showToast==='function'){window.showToast(message,type||'success');return}
    var region=el('projectsFeedback');
    if(region){region.textContent=message;region.classList.toggle('is-error',type==='error')}
  }
  function flush(){
    if(window.atsrsCloudData&&typeof window.atsrsCloudData.flush==='function')return window.atsrsCloudData.flush().then(function(synced){return synced!==false}).catch(function(error){console.warn('ATSRS project sync failed',error);return false});
    return Promise.resolve(true);
  }
  function projectWriteFailed(){
    if(!window.atsrsCloudData||typeof window.atsrsCloudData.pendingState!=='function')return false;
    try{
      var pending=window.atsrsCloudData.pendingState();
      return (pending&&Array.isArray(pending.failedOperations)?pending.failedOperations:[]).some(function(operation){return /_projects$/.test(String(operation&&operation.dataKey||''))});
    }catch(ignore){return false}
  }
  function placeProject(record,identifier,list){
    list=Array.isArray(list)?list.slice():[];
    var existing=findProject(identifier||projectId(record),list);
    if(existing)list[list.indexOf(existing)]=Object.assign({},existing,record);else list.push(record);
    return list;
  }
  async function persistProject(record,identifier){
    var accepted=window.saveProjects(placeProject(record,identifier,projects()));
    if(accepted===false)return false;
    var synced=await flush();
    if(synced||!projectWriteFailed())return true;
    if(!window.atsrsCloudData||typeof window.atsrsCloudData.refresh!=='function')return false;
    try{
      await window.atsrsCloudData.refresh();
      accepted=window.saveProjects(placeProject(record,identifier,projects()));
      if(accepted===false)return false;
      synced=await flush();
      return synced||!projectWriteFailed();
    }catch(error){console.warn('ATSRS project retry failed',error);return false}
  }
  function changed(){window.dispatchEvent(new CustomEvent('atsrs:project-data-changed'));render()}

  function summaryForPersonnel(person){
    if(!person)return '';
    var map=assignmentProjectMap();
    var active=normalizedAssignments(person).filter(isAssignmentActive).map(function(assignment){
      var project=map[assignment.projectId];return project&&!project.archived?projectName(project):'';
    }).filter(Boolean);
    if(active.length)return active.join(', ');
    return String(person.project||person.vessel||'').trim();
  }

  function memberCount(id,people){
    return people.reduce(function(total,person){return total+(normalizedAssignments(person).some(function(assignment){return assignment.projectId===id&&isAssignmentActive(assignment)})?1:0)},0);
  }
  function updateProjectViewSwitch(){
    document.querySelectorAll('[data-project-view]').forEach(function(button){
      var selected=button.dataset.projectView===state.projectView;
      button.classList.toggle('active',selected);
      button.setAttribute('aria-pressed',selected?'true':'false');
    });
  }
  function updateProjectCount(visible,total){
    var count=el('projectsWorkspaceCount');if(!count)return;
    count.textContent=visible===total?total+' '+(total===1?'project':'projects'):visible+' of '+total+' projects';
  }
  function projectActions(project){
    var id=projectId(project);
    return '<div class="project-card-actions"><button type="button" data-project-members="'+safe(id)+'">Manage personnel</button><button type="button" class="secondary" data-project-edit="'+safe(id)+'">Edit</button><button type="button" class="secondary" data-project-archive="'+safe(id)+'">'+(project.archived?'Restore':'Archive')+'</button></div>';
  }
  function projectCard(project,people){
    var id=projectId(project);var status=projectStatus(project);var count=memberCount(id,people);var details=[];
    if(project.code)details.push('<div><span>Code</span><b>'+safe(project.code)+'</b></div>');
    if(project.client)details.push('<div><span>Client</span><b>'+safe(project.client)+'</b></div>');
    if(project.location)details.push('<div><span>Location</span><b>'+safe(project.location)+'</b></div>');
    if(project.owner)details.push('<div><span>Owner</span><b>'+safe(project.owner)+'</b></div>');
    return '<article class="project-workspace-card" data-project-card="'+safe(id)+'"><div class="project-card-head"><div><span class="project-status is-'+safe(status)+'">'+safe(statusLabel(status))+'</span><h4>'+safe(projectName(project))+'</h4></div><span class="project-member-count">'+count+' '+(count===1?'person':'people')+'</span></div><div class="project-meta">'+(details.join('')||'<div><span>Details</span><b>Not added yet</b></div>')+'<div><span>Schedule</span><b>'+safe(dateRange(project))+'</b></div></div>'+projectActions(project)+'</article>';
  }
  function projectList(visible,people){
    var rows=visible.map(function(project){
      var id=projectId(project);var status=projectStatus(project);var count=memberCount(id,people);
      var secondary=[project.code,project.owner].filter(Boolean).join(' · ')||'No code or owner';
      var client=[project.client,project.location].filter(Boolean).join(' · ')||'Not added yet';
      return '<div class="projects-list-row" role="row" data-project-row="'+safe(id)+'"><div class="projects-list-primary" role="cell" data-label="Project"><b>'+safe(projectName(project))+'</b><small>'+safe(secondary)+'</small></div><div role="cell" data-label="Client / location">'+safe(client)+'</div><div role="cell" data-label="Status"><span class="project-status is-'+safe(status)+'">'+safe(statusLabel(status))+'</span></div><div role="cell" data-label="Schedule">'+safe(dateRange(project))+'</div><div role="cell" data-label="Personnel">'+count+' '+(count===1?'person':'people')+'</div><div class="projects-list-actions" role="cell" data-label="Actions">'+projectActions(project)+'</div></div>';
    }).join('');
    return '<div class="projects-list-table" role="table" aria-label="Projects"><div class="projects-list-header" role="row"><span role="columnheader">Project</span><span role="columnheader">Client / location</span><span role="columnheader">Status</span><span role="columnheader">Schedule</span><span role="columnheader">Personnel</span><span role="columnheader">Actions</span></div>'+rows+'</div>';
  }
  function render(){
    var list=el('projectsWorkspaceList');if(!list)return;
    var all=projects();var people=personnel();
    var search=String(el('projectSearch')&&el('projectSearch').value||'').trim().toLowerCase();
    var filter=String(el('projectStatusFilter')&&el('projectStatusFilter').value||'');
    var visible=all.filter(function(project){
      var haystack=[projectName(project),project.code,project.client,project.location,project.owner].join(' ').toLowerCase();
      return (!search||haystack.indexOf(search)!==-1)&&(!filter||projectStatus(project)===filter);
    });
    updateProjectViewSwitch();updateProjectCount(visible.length,all.length);
    list.classList.toggle('is-list',state.projectView==='list');
    if(!visible.length){
      list.innerHTML='<div class="projects-empty"><b>'+(all.length?'No projects match these filters.':'No projects yet.')+'</b><span>'+(all.length?'Change the search or status filter.':'Create the first project, then assign people from Personnel or from the project itself.')+'</span>'+(all.length?'':'<button type="button" data-project-create>New project</button>')+'</div>';
      var emptyCreate=list.querySelector('[data-project-create]');if(emptyCreate)emptyCreate.onclick=openProjectEditor;
      return;
    }
    list.innerHTML=state.projectView==='list'?projectList(visible,people):visible.map(function(project){return projectCard(project,people)}).join('');
    list.querySelectorAll('[data-project-members]').forEach(function(button){button.onclick=function(){openProjectMembers(button.dataset.projectMembers)}});
    list.querySelectorAll('[data-project-edit]').forEach(function(button){button.onclick=function(){openProjectEditor(button.dataset.projectEdit)}});
    list.querySelectorAll('[data-project-archive]').forEach(function(button){button.onclick=function(){toggleProjectArchive(button.dataset.projectArchive)}});
  }

  function showDialog(dialog){if(dialog&&typeof dialog.showModal==='function')dialog.showModal()}
  function closeDialog(dialog){if(dialog&&dialog.open)dialog.close()}
  function setValue(id,value){var node=el(id);if(node)node.value=value==null?'':value}
  function openProjectEditor(identifier){
    var project=identifier?findProject(identifier):null;state.editingProjectId=project?projectId(project):'';
    el('projectEditorTitle').textContent=project?'Edit project':'New project';
    setValue('projectEditorId',state.editingProjectId);setValue('projectEditorName',project&&projectName(project));setValue('projectEditorCode',project&&project.code);setValue('projectEditorClient',project&&project.client);setValue('projectEditorLocation',project&&project.location);setValue('projectEditorOwner',project&&project.owner);setValue('projectEditorStatus',project&&project.status||'draft');setValue('projectEditorStart',project&&project.startDate);setValue('projectEditorEnd',project&&project.endDate);
    showDialog(el('projectEditorDialog'));setTimeout(function(){el('projectEditorName').focus()},30);
  }
  async function saveProject(event){
    event.preventDefault();var all=projects();var id=String(el('projectEditorId').value||'');var existing=findProject(id,all);var stamp=now();var submit=event.submitter||event.currentTarget.querySelector('button[type="submit"]');
    var startDate=String(el('projectEditorStart').value||'');var endDate=String(el('projectEditorEnd').value||'');
    if(startDate&&endDate&&endDate<startDate){notify('Project end date cannot be earlier than its start date.','error');el('projectEditorEnd').focus();return}
    var record=Object.assign({},existing||{},{$schemaVersion:1,atsrsId:id||createId(),project:String(el('projectEditorName').value||'').trim(),code:String(el('projectEditorCode').value||'').trim(),client:String(el('projectEditorClient').value||'').trim(),location:String(el('projectEditorLocation').value||'').trim(),owner:String(el('projectEditorOwner').value||'').trim(),status:String(el('projectEditorStatus').value||'draft'),startDate:startDate,endDate:endDate,updatedAt:stamp});
    if(!record.createdAt)record.createdAt=stamp;
    if(submit){submit.disabled=true;submit.dataset.originalLabel=submit.textContent;submit.textContent='Saving...'}
    try{
      var saved=await persistProject(record,id||record.atsrsId);
      if(!saved){notify('Project could not be saved. Your details are still open; please try again.','error');return}
      closeDialog(el('projectEditorDialog'));changed();notify(existing?'Project updated.':'Project created.');
    }catch(error){
      console.warn('ATSRS project save failed',error);
      notify('Project could not be saved. Your details are still open; please try again.','error');
    }finally{
      if(submit){submit.disabled=false;submit.textContent=submit.dataset.originalLabel||'Save project';delete submit.dataset.originalLabel}
    }
  }
  function toggleProjectArchive(identifier){
    var all=projects();var project=findProject(identifier,all);if(!project)return;
    if(!project.archived&&!window.confirm('Archive this project? Existing personnel history will be retained.'))return;
    project.archived=!project.archived;project.archivedAt=project.archived?now():'';project.updatedAt=now();
    window.saveProjects(all);changed();flush();notify(project.archived?'Project archived.':'Project restored.');
  }

  function projectOptions(selected){
    var available=projects().filter(function(project){return !project.archived||projectId(project)===selected});
    return '<option value="">Select project</option>'+available.map(function(project){var id=projectId(project);return '<option value="'+safe(id)+'" '+(id===selected?'selected':'')+'>'+safe(projectName(project))+'</option>'}).join('');
  }
  function assignmentRow(assignment,isNew){
    assignment=assignment||{};var id=assignmentId(assignment)||createId();
    return '<div class="assignment-editor-row" data-assignment-row="'+safe(id)+'" data-existing="'+(isNew?'false':'true')+'"><label><span>Project</span><select data-assignment-project required>'+projectOptions(String(assignment.projectId||''))+'</select></label><label><span>Role</span><input data-assignment-role maxlength="100" value="'+safe(assignment.role||'')+'" placeholder="Role in project"></label><label><span>Start</span><input data-assignment-start type="date" value="'+safe(assignment.startDate||'')+'"></label><label><span>End</span><input data-assignment-end type="date" value="'+safe(assignment.endDate||'')+'"></label><label><span>Status</span><select data-assignment-status><option value="active" '+(String(assignment.status||'active')==='active'?'selected':'')+'>Active</option><option value="ended" '+(String(assignment.status||'')==='ended'?'selected':'')+'>Ended</option></select></label><label class="assignment-primary"><input data-assignment-primary type="checkbox" '+(assignment.primary?'checked':'')+'><span>Primary</span></label><button type="button" class="secondary assignment-row-remove">'+(isNew?'Remove':'End')+'</button><input data-assignment-assigned-at type="hidden" value="'+safe(assignment.assignedAt||'')+'"><input data-assignment-ended-at type="hidden" value="'+safe(assignment.endedAt||'')+'"></div>';
  }
  function bindAssignmentRow(row){
    var button=row.querySelector('.assignment-row-remove');if(!button)return;
    button.onclick=function(){
      if(row.dataset.existing==='true'){
        row.querySelector('[data-assignment-status]').value='ended';if(!row.querySelector('[data-assignment-end]').value)row.querySelector('[data-assignment-end]').value=today();row.classList.add('is-ended');button.disabled=true;
      }else row.remove();
    };
  }
  function addAssignmentRow(assignment,isNew){var holder=el('personnelAssignmentRows');holder.insertAdjacentHTML('beforeend',assignmentRow(assignment,isNew));bindAssignmentRow(holder.lastElementChild)}
  function openPersonnelAssignments(identifier){
    var people=personnel();var person=findPerson(identifier,people);if(!person)return;
    state.assignmentPersonId=personId(person)||String(person.atsrsId||'');setValue('personnelAssignmentUserId',state.assignmentPersonId);el('personnelAssignmentTitle').textContent=personName(person)+' - projects';
    var holder=el('personnelAssignmentRows');holder.innerHTML='';var assignments=normalizedAssignments(person);assignments.forEach(function(assignment){addAssignmentRow(assignment,false)});if(!assignments.length)addAssignmentRow(null,true);
    showDialog(el('personnelAssignmentDialog'));
  }
  function readAssignmentRows(){
    var activeProjects={};var primarySeen=false;var invalidRow=null;
    var result=Array.from(el('personnelAssignmentRows').querySelectorAll('[data-assignment-row]')).map(function(row){
      var project=String(row.querySelector('[data-assignment-project]').value||'');if(!project)return null;
      var status=String(row.querySelector('[data-assignment-status]').value||'active');if(status!=='ended'&&activeProjects[project])return null;if(status!=='ended')activeProjects[project]=true;
      var primary=!!row.querySelector('[data-assignment-primary]').checked&&status!=='ended'&&!primarySeen;if(primary)primarySeen=true;
      var previousEndedAt=String(row.querySelector('[data-assignment-ended-at]').value||'');
      var startDate=String(row.querySelector('[data-assignment-start]').value||'');var endDate=String(row.querySelector('[data-assignment-end]').value||'');
      if(startDate&&endDate&&endDate<startDate){invalidRow=row;return null}
      return {atsrsId:String(row.dataset.assignmentRow||createId()),projectId:project,role:String(row.querySelector('[data-assignment-role]').value||'').trim(),startDate:startDate,endDate:endDate,status:status,primary:primary,assignedAt:String(row.querySelector('[data-assignment-assigned-at]').value||'')||now(),endedAt:status==='ended'?(previousEndedAt||now()):'',updatedAt:now()};
    }).filter(Boolean);
    if(invalidRow){notify('Assignment end date cannot be earlier than its start date.','error');invalidRow.querySelector('[data-assignment-end]').focus();return null}
    return result;
  }
  function savePersonnelAssignments(event){
    event.preventDefault();var people=personnel();var person=findPerson(el('personnelAssignmentUserId').value,people);if(!person)return;
    var assignments=readAssignmentRows();if(!assignments)return;person.atsrsProjectAssignments=assignments;person.atsrsProjectIds=Array.from(new Set(assignments.filter(isAssignmentActive).map(function(item){return item.projectId})));person.updatedAt=now();
    window.saveData('personnel',people);closeDialog(el('personnelAssignmentDialog'));changed();flush();notify('Personnel assignments updated.');
  }

  function memberRow(person,project){
    var pid=personId(person)||String(person.atsrsId||'');var assignments=normalizedAssignments(person);var assignment=assignments.find(function(item){return item.projectId===projectId(project)&&isAssignmentActive(item)})||{};var checked=!!assignment.projectId;
    return '<div class="project-member-row" data-member-row="'+safe(pid)+'"><label class="project-member-select"><input type="checkbox" data-member-selected '+(checked?'checked':'')+'><span><b>'+safe(personName(person))+'</b><small>'+safe(person.position||person.country||'Personnel member')+'</small></span></label><label><span>Role</span><input data-member-role maxlength="100" value="'+safe(assignment.role||'')+'" '+(checked?'':'disabled')+'></label><label><span>Start</span><input data-member-start type="date" value="'+safe(assignment.startDate||'')+'" '+(checked?'':'disabled')+'></label><label><span>End</span><input data-member-end type="date" value="'+safe(assignment.endDate||'')+'" '+(checked?'':'disabled')+'></label></div>';
  }
  function openProjectMembers(identifier){
    var project=findProject(identifier);if(!project)return;state.membersProjectId=projectId(project);setValue('projectMembersProjectId',state.membersProjectId);el('projectMembersTitle').textContent=projectName(project)+' - personnel';
    var holder=el('projectMembersRows');var people=personnel();holder.innerHTML=people.length?people.map(function(person){return memberRow(person,project)}).join(''):'<div class="projects-empty"><b>No company personnel yet.</b><span>Add a candidate to Personnel before assigning them to a project.</span></div>';
    holder.querySelectorAll('[data-member-selected]').forEach(function(check){check.onchange=function(){var row=check.closest('[data-member-row]');row.querySelectorAll('input:not([data-member-selected])').forEach(function(input){input.disabled=!check.checked})}});
    showDialog(el('projectMembersDialog'));
  }
  function saveProjectMembers(event){
    event.preventDefault();var id=String(el('projectMembersProjectId').value||'');var people=personnel();var invalidRow=null;
    el('projectMembersRows').querySelectorAll('[data-member-row]').forEach(function(row){
      if(!row.querySelector('[data-member-selected]').checked)return;var start=String(row.querySelector('[data-member-start]').value||'');var end=String(row.querySelector('[data-member-end]').value||'');if(start&&end&&end<start)invalidRow=invalidRow||row;
    });
    if(invalidRow){notify('Assignment end date cannot be earlier than its start date.','error');invalidRow.querySelector('[data-member-end]').focus();return}
    el('projectMembersRows').querySelectorAll('[data-member-row]').forEach(function(row){
      var person=findPerson(row.dataset.memberRow,people);if(!person)return;var assignments=normalizedAssignments(person);var active=assignments.find(function(item){return item.projectId===id&&isAssignmentActive(item)});var selected=row.querySelector('[data-member-selected]').checked;
      if(selected){
        if(!active){active={atsrsId:createId(),projectId:id,assignedAt:now()};assignments.push(active)}
        active.role=String(row.querySelector('[data-member-role]').value||'').trim();active.startDate=String(row.querySelector('[data-member-start]').value||'');active.endDate=String(row.querySelector('[data-member-end]').value||'');active.status='active';active.endedAt='';active.updatedAt=now();
      }else if(active){active.status='ended';active.endDate=active.endDate||today();active.endedAt=now();active.updatedAt=now();active.primary=false}
      person.atsrsProjectAssignments=assignments;person.atsrsProjectIds=Array.from(new Set(assignments.filter(isAssignmentActive).map(function(item){return item.projectId})));person.updatedAt=now();
    });
    window.saveData('personnel',people);closeDialog(el('projectMembersDialog'));changed();flush();notify('Project personnel updated.');
  }

  function bind(){
    var create=el('newProjectBtn');if(!create)return;
    create.addEventListener('click',function(){openProjectEditor()});
    document.querySelectorAll('[data-project-view]').forEach(function(button){
      button.addEventListener('click',function(){
        state.projectView=button.dataset.projectView||'cards';projectViewExplicit=true;
        try{localStorage.setItem('atsrs_project_view',state.projectView);localStorage.setItem('atsrs_project_view_explicit','true')}catch(ignore){}
        render();
      });
    });
    ['projectSearch','projectStatusFilter'].forEach(function(id){var node=el(id);if(node)node.addEventListener(id==='projectSearch'?'input':'change',render)});
    el('projectEditorForm').addEventListener('submit',saveProject);el('personnelAssignmentForm').addEventListener('submit',savePersonnelAssignments);el('projectMembersForm').addEventListener('submit',saveProjectMembers);
    el('addPersonnelAssignmentRow').addEventListener('click',function(){addAssignmentRow(null,true)});
    document.querySelectorAll('[data-close-project-editor]').forEach(function(button){button.addEventListener('click',function(){closeDialog(el('projectEditorDialog'))})});
    document.querySelectorAll('[data-close-personnel-assignments]').forEach(function(button){button.addEventListener('click',function(){closeDialog(el('personnelAssignmentDialog'))})});
    document.querySelectorAll('[data-close-project-members]').forEach(function(button){button.addEventListener('click',function(){closeDialog(el('projectMembersDialog'))})});
    render();
  }

  window.atsrsProjects={render:render,summaryForPersonnel:summaryForPersonnel,openPersonnelAssignments:openPersonnelAssignments,openProjectMembers:openProjectMembers};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
