const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const runtime = fs.readFileSync(path.join(__dirname, '..', 'js', 'cv-generator.js'), 'utf8');

function classes(initial = []) { const set = new Set(initial); return {add(...v){v.forEach(x=>set.add(x));},remove(...v){v.forEach(x=>set.delete(x));},contains(v){return set.has(v);},toggle(v,on){if(on===undefined)on=!set.has(v);on?set.add(v):set.delete(v);return on;}}; }
function el(id) { const listeners={}; return {id,value:'',checked:false,disabled:false,textContent:'',innerHTML:'',className:'',classList:classes(id==='cvGeneratorModal'?['hidden']:[]),addEventListener(t,f){listeners[t]=f;},dispatch(t,e={}){return listeners[t]&&listeners[t](Object.assign({target:this},e));},click(){return this.dispatch('click');},querySelector(){return null;}}; }

function harness() {
  const ids=['aiCvUploadInput','aiCvSourceStatus','cvEnhancementConsent','cvEnhancementConsentWrap','cvEnhancementStatus','cvGeneratorStatus','cvBetaBadge','cvBetaTitle','cvBetaText','uploadCvFromGeneratorBtn','generateCVBtn','resetCvGeneratorBtn','generatedCvActions','previewGeneratedCvBtn','downloadGeneratedCvBtn','printGeneratedCvBtn','regenerateCvBtn','savePdfCvBtn','closeCvGeneratorBtn','cvGeneratorModal','cvGeneratorPreview','cvGeneratorPreviewDocument','cvStatusBadge','cvFileInfo'];
  const elements=Object.fromEntries(ids.map(id=>[id,el(id)]));
  elements.cvStatusBadge.classList.add('badge-ready');
  elements.cvFileInfo.querySelector=()=>({textContent:'CV-A.pdf',getAttribute:()=> 'CV-A.pdf'});
  const documentListeners={},requests=[],saved=[],temporary=[];
  const context={console:{error(){}},alert(){},localStorage:{getItem(k){return k==='atsrs_use_mode'?'personal':null;}},File,Blob,URL,AbortController,AbortSignal,Date,JSON,Object,Array,String,Promise,
    setTimeout(fn){fn();return 1;},clearTimeout(){},
    CustomEvent:class{constructor(type,options={}){this.type=type;this.detail=options.detail;}},
    document:{readyState:'complete',body:{style:{},classList:classes(),appendChild(){}},getElementById(id){return elements[id]||null;},createElement(){return {click(){},remove(){}};},addEventListener(t,f){documentListeners[t]=f;}},
    window:{useMode:'personal',localKey(){return'profile';},print(){},supabaseClient:{auth:{async getSession(){return{data:{session:{access_token:'token'}}};}},functions:{async invoke(_name,options){requests.push(options.body);return{data:{cv:{full_name:'Generated',headline:'Role',contact:{},professional_summary:'Fresh',core_skills:[],experience:[],education:[],certifications:[]},ownership_verification:'verified',variation_index:requests.length-1},error:null};}}},atsrsCloudData:{isManagedKey(){return false;},async uploadAiCvSource(file){temporary.push(['upload',file.name]);return'user/personal/ai-cv-source/source.pdf';},async deleteAiCvSource(path){temporary.push(['delete',path]);},async saveGeneratedCv(file,options){saved.push({name:file.name,...options});},async renderFiles(){}}}
  };
  context.window.window=context.window;context.window.document=context.document;context.window.localStorage=context.localStorage;
  vm.runInNewContext(runtime,context,{filename:'cv-generator.js'});
  return {elements,requests,saved,temporary,api:context.window.atsrsCvGenerator};
}

(async()=>{
  const t=harness();
  assert.deepEqual({...t.api.state()},{status:'EMPTY',source:'',generated:false,profileMain:'CV-A.pdf'});
  const b=new File(['b'],'CV-B.pdf',{type:'application/pdf'});
  await t.elements.aiCvUploadInput.dispatch('change',{target:{files:[b],value:'CV-B.pdf'}});
  assert.equal(t.api.state().source,'CV-B.pdf');
  assert.equal(t.api.state().profileMain,'CV-A.pdf');
  assert.equal(t.saved.length,0,'AI source selection must not mutate Profile');
  t.elements.cvEnhancementConsent.checked=true;
  await t.elements.generateCVBtn.dispatch('click');
  assert.equal(t.requests.length,1);
  assert.match(t.requests[0].ai_source_path,/ai-cv-source/);
  assert.equal(t.saved.length,1,'generation must save one additional CV version');
  assert.equal(t.saved[0].replaceMain,false,'generation must never promote the result to Main CV');
  assert.equal(t.saved[0].sourceName,'CV-B.pdf');
  assert.equal(t.saved[0].ownershipVerification,'verified');
  assert.deepEqual(t.temporary.map(x=>x[0]),['upload','delete']);
  t.elements.resetCvGeneratorBtn.dispatch('click');
  assert.equal(t.api.state().status,'EMPTY');
  assert.equal(t.api.state().profileMain,'CV-A.pdf');
  const c=new File(['c'],'CV-C.pdf',{type:'application/pdf'});
  await t.elements.aiCvUploadInput.dispatch('change',{target:{files:[c],value:'CV-C.pdf'}});
  t.elements.cvEnhancementConsent.checked=true;
  await t.elements.generateCVBtn.dispatch('click');
  assert.equal(t.saved.length,2,'repeated generation must create another additional version');
  assert.equal(t.saved.at(-1).replaceMain,false);
  assert.equal(t.api.state().profileMain,'CV-A.pdf','AI workspace must not mutate Main CV state directly');
  console.log('CV Generator state machine A-G/J contracts passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
