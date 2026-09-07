const test=require('node:test');
const assert=require('node:assert/strict');
const safety=require('../js/payment-card-safety.js');

test('bank-card document numbers retain only the last four digits',()=>{
  const result=safety.sanitizeRecord({type:'Bank card',docNo:'5243 7544 4253 2881'});
  assert.equal(result.isPaymentCard,true);
  assert.equal(result.record.docNo,'•••• •••• •••• 2881');
  assert.doesNotMatch(result.record.docNo,/5243|7544|4253/);
});

test('a Luhn-valid PAN is protected even when the document type is mislabeled',()=>{
  const result=safety.sanitizeRecord({type:'Other',docNo:'4111-1111-1111-1111'});
  assert.equal(result.isPaymentCard,true);
  assert.equal(result.record.docNo,'•••• •••• •••• 1111');
});

test('the server detection flag survives an already-masked edge response',()=>{
  const result=safety.sanitizeRecord({type:'Other',docNo:'•••• •••• •••• 1111',paymentCard:true});
  assert.equal(result.isPaymentCard,true);
  assert.equal(result.record.docNo,'•••• •••• •••• 1111');
});

test('ordinary certificate numbers remain unchanged',()=>{
  const result=safety.sanitizeRecord({type:'Training certificate',docNo:'STCW-2026-1042'});
  assert.equal(result.isPaymentCard,false);
  assert.equal(result.record.docNo,'STCW-2026-1042');
});

test('common payment-card labels trigger protection',()=>{
  for(const type of ['Visa card','Visa Debit','Debit Mastercard','Mastercard','Maestro','American Express'])assert.equal(safety.isCardDocument(type),true,type);
});

test('PAN detection accepts common OCR and manual separators',()=>{
  for(const docNo of ['4111  1111  1111  1111','4111.1111.1111.1111','4111–1111–1111–1111']){
    const result=safety.sanitizeRecord({type:'Other',docNo});
    assert.equal(result.isPaymentCard,true,docNo);
    assert.equal(result.record.docNo,'•••• •••• •••• 1111');
  }
});

test('PANs are redacted from AI warnings',()=>{
  assert.equal(safety.redactText('Detected 4111 1111 1111 1111 on card.'),'Detected •••• •••• •••• 1111 on card.');
});

test('misplaced PAN and authentication codes are removed from every metadata field',()=>{
  const result=safety.sanitizeExtractedDocument({document_type:'Other',document_number:'',provider:'Issuer 4111 1111 1111 1111',warnings:['CVV: 123','PIN 1234']});
  assert.equal(result.isPaymentCard,true);
  assert.equal(result.document.provider,'Issuer •••• •••• •••• 1111');
  assert.deepEqual(result.document.warnings,['CVV [removed]','PIN [removed]']);
});
