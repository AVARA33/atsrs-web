const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'js/floating-fields.js'),'utf8');
const helper=source.slice(source.indexOf('  function simpleMatch('),source.indexOf('  function eligible('));
const sandbox={};vm.runInNewContext(helper,sandbox);
function element(tag,attrs={},classes=[]){return {nodeType:1,localName:tag,hasAttribute:k=>Object.hasOwn(attrs,k),getAttribute:k=>attrs[k]??null,classList:{contains:k=>classes.includes(k)}}}
test('field eligibility preserves excluded types and multi-select behaviour',()=>{
 for(const type of ['hidden','checkbox','radio','range','file','button','submit','reset','HIDDEN'])assert.equal(sandbox.isFieldControl(element('input',{type})),false,type);
 for(const type of ['text','email','date','tel','number','password','search',''])assert.equal(sandbox.isFieldControl(element('input',{type})),true,type);
 assert.equal(sandbox.isFieldControl(element('select',{multiple:''})),false);
 assert.equal(sandbox.isFieldControl(element('select')),true);
 assert.equal(sandbox.isFieldControl(element('textarea')),true);
 assert.equal(sandbox.isFieldControl(element('span')),false);
 assert.equal(sandbox.isFieldControl(null),false);
});
test('label, class and tag checks retain intended decoration semantics',()=>{
 assert.equal(sandbox.simpleMatch(element('label',{for:'x'}),'label[for],.field-label'),true);
 assert.equal(sandbox.simpleMatch(element('label'),'label[for],.field-label'),false);
 assert.equal(sandbox.simpleMatch(element('span',{},['field-label']),'label[for],.field-label'),true);
 assert.equal(sandbox.simpleMatch(element('input'),'input,select,textarea,button'),true);
 assert.equal(sandbox.simpleMatch(element('div'),'span,b'),false);
});
test('repeated site decorators no longer enter native Element.matches crash path',()=>{
 for(const name of ['floating-fields','theme','select-standard','date-picker','dashboard','jobs-prototype'])assert.doesNotMatch(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),/\.matches\s*\(/,name);
});
