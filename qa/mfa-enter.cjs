const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('js/account-security-live.js','utf8');
const handler=source.slice(source.indexOf('      var codeField='),source.indexOf("      if(event.key!=='Tab')return;"));
function run(field,key,code,extra={}){let clicks=0,prevented=false;const button={disabled:!!extra.disabled,click(){clicks++}};const event={target:{id:field},key,code,preventDefault(){prevented=true},...extra};vm.runInNewContext('(function(){'+handler+'})()',{event,byId:()=>button});return {clicks,prevented}}
for(const field of ['atsrsMfaCode','atsrsMfaLoginCode']){
 assert.equal(run(field,'Enter','Enter').clicks,1);
 assert.equal(run(field,'Enter','NumpadEnter').clicks,1);
 assert.equal(run(field,'Enter','Enter',{repeat:true}).clicks,0);
 assert.equal(run(field,'Enter','Enter',{disabled:true}).clicks,0);
 assert.equal(run(field,'Enter','Enter',{isComposing:true}).clicks,0);
}
assert.equal(run('atsrsDeleteEmail','Enter','Enter').clicks,0);
assert.equal(run('atsrsMfaCode','a','KeyA').clicks,0);
console.log('12 keyboard checks passed: both code fields, both Enter keys, duplicate/composition guards, unrelated fields.');
