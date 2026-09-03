const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness(outcomes = []) {
  function node(text = '') {
    const classes = new Set(['hidden']);
    return {textContent:text, value:'', dataset:{}, disabled:false, focus(){}, remove(){}, setAttribute(){},
      classList:{contains:k=>classes.has(k),add:k=>classes.add(k),remove:k=>classes.delete(k),toggle(k,on){on?classes.add(k):classes.delete(k)}}};
  }
  const nodes = Object.fromEntries(['atsrsSecurityModal','atsrsSecurityContent','atsrsSecurityMessage','atsrsMfaLoginCode','atsrsVerifyMfaLogin'].map(id=>[id,node()]));
  nodes.atsrsVerifyMfaLogin.textContent='Verify';
  const decoration=node();
  nodes.atsrsSecurityModal.querySelector=()=>decoration;
  nodes.atsrsSecurityContent.querySelector=()=>decoration;
  const calls=[];
  let sequence=0;
  const mfa={
    async getAuthenticatorAssuranceLevel(){return {data:{currentLevel:'aal1',nextLevel:'aal2'}}},
    async listFactors(){return {data:{totp:[{id:'test-factor',status:'verified'}]}}},
    async challenge(args){calls.push({kind:'challenge',...args});return {data:{id:'challenge-'+(++sequence)}}},
    async verify(args){calls.push({kind:'verify',...args});const result=outcomes.shift();if(result instanceof Error)throw result;return result||{data:{}}}
  };
  const window={supabaseClient:{auth:{mfa}}};
  const source=fs.readFileSync('js/account-security-live.js','utf8').replace("  if(document.readyState==='loading')", "  window.testEnforceMfa=enforceMfa;\n  if(document.readyState==='loading')");
  vm.runInNewContext(source,{window,document:{readyState:'loading',activeElement:null,addEventListener(){},getElementById:id=>nodes[id]||null,createElement:()=>node(),body:{appendChild(){}}},setTimeout(){return 1},clearTimeout(){},console});
  return {nodes,calls,mfa,open:window.testEnforceMfa,submit:()=>nodes.atsrsVerifyMfaLogin.onclick()};
}

test('login creates a fresh challenge only on submission and recovers from an IP mismatch',async()=>{
  const h=harness([{error:{code:'mfa_ip_address_mismatch'}},{data:{}}]);
  await h.open();
  assert.equal(h.calls.length,0,'An idle login dialog must not hold an aging challenge');
  h.nodes.atsrsMfaLoginCode.value='123456';
  await h.submit();
  assert.match(h.nodes.atsrsSecurityMessage.textContent,/network address changed/);
  assert.equal(h.nodes.atsrsSecurityModal.classList.contains('hidden'),false,'Failed verification must keep MFA required');
  assert.equal(h.nodes.atsrsVerifyMfaLogin.disabled,false);
  await h.open();
  h.nodes.atsrsMfaLoginCode.value='234567';
  await h.submit();
  assert.deepEqual(h.calls.map(c=>c.kind),['challenge','verify','challenge','verify']);
  assert.deepEqual(h.calls.filter(c=>c.kind==='verify').map(c=>c.challengeId),['challenge-1','challenge-2']);
  assert.equal(h.nodes.atsrsSecurityModal.classList.contains('hidden'),true);
});

test('network failures unlock retry without dismissing MFA',async()=>{
  const h=harness([new Error('network unavailable')]);await h.open();h.nodes.atsrsMfaLoginCode.value='123456';await h.submit();
  assert.equal(h.nodes.atsrsVerifyMfaLogin.disabled,false);
  assert.equal(h.nodes.atsrsSecurityModal.classList.contains('hidden'),false);
  assert.match(h.nodes.atsrsSecurityMessage.textContent,/connection/);
});

test('invalid code length never reaches the auth server',async()=>{
  const h=harness();await h.open();h.nodes.atsrsMfaLoginCode.value='12345';await h.submit();assert.equal(h.calls.length,0);
});

test('challenge failure prevents verification and keeps protection active',async()=>{
  const h=harness();h.mfa.challenge=async()=>({error:{status:429}});await h.open();h.nodes.atsrsMfaLoginCode.value='123456';await h.submit();
  assert.equal(h.calls.length,0);assert.match(h.nodes.atsrsSecurityMessage.textContent,/Too many/);assert.equal(h.nodes.atsrsSecurityModal.classList.contains('hidden'),false);assert.equal(h.nodes.atsrsVerifyMfaLogin.disabled,false);
});
