const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('js/share-profile.js','utf8');
const copy=source.split('\n').find(line=>line.includes('window.copyShareLink=async function'));
async function check({url='https://atsrs.com/?share=test-token',valid=true,clipboard=true}={}){
  const calls={ids:[],copied:[],messages:[],cleared:[]};
  const context={window:{alert(){},dispatchEvent(){}},URL,CustomEvent:class{},knownShareUrl:'',
    shareLinkById(id){calls.ids.push(id);return url},validateShareToken:async()=>valid,
    copyText:async value=>{calls.copied.push(value);return clipboard},
    ownerMessage:(text,error)=>calls.messages.push({text,error}),
    setOwnerToken:(...args)=>calls.cleared.push(args),setKnownLink(){},byId:()=>null,setTimeout};
  vm.runInNewContext(copy,context);
  calls.result=await context.window.copyShareLink('existing-share-id');return calls;
}
(async()=>{
  let result=await check();assert.equal(result.result,true);assert.deepEqual(result.ids,['existing-share-id']);assert.deepEqual(result.copied,['https://atsrs.com/?share=test-token']);
  result=await check({clipboard:false});assert.equal(result.result,false);assert.ok(result.messages.every(x=>x.text!=='Secure link copied.'));
  result=await check({valid:false});assert.equal(result.result,false);assert.equal(result.copied.length,0);
  result=await check({url:''});assert.equal(result.result,false);assert.equal(result.copied.length,0);
  assert.doesNotMatch(copy,/createShare|createValidatedShare|ownerCall/);
  console.log('Existing-link copy: success, failure, invalid and missing token checks passed');
})().catch(error=>{console.error(error);process.exitCode=1});
