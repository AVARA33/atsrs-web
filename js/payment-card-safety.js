/* Prevent payment-card PANs from entering ATSRS document metadata or storage. */
(function(root){
  'use strict';
  var PAN_PATTERN=/(?:\d[\s.\-–—]*){12,18}\d/g;
  function digits(value){return String(value==null?'':value).replace(/\D/g,'');}
  function luhn(value){
    var number=digits(value);if(number.length<13||number.length>19)return false;
    var sum=0,alternate=false;
    for(var i=number.length-1;i>=0;i--){var digit=Number(number.charAt(i));if(alternate){digit*=2;if(digit>9)digit-=9;}sum+=digit;alternate=!alternate;}
    return sum%10===0;
  }
  function isCardDocument(value){var text=String(value==null?'':value).trim().toLowerCase();if(/^(mastercard|maestro|amex|american express)$/.test(text))return true;var cardWord=/(card|kart)/.test(text);var paymentWord=/(bank|payment|credit|debit|debet|visa|mastercard|maestro|amex|american express|odenis|ödəniş|kredit)/.test(text);return cardWord&&paymentWord||/(visa\s+(debit|credit)|(debit|credit)\s+(visa|mastercard|maestro))/.test(text);}
  function containsPan(value){var matches=String(value==null?'':value).match(PAN_PATTERN)||[];return matches.some(luhn);}
  function lastFour(value){var number=digits(value);return number.length>=4?number.slice(-4):'';}
  function masked(last4){return last4?'•••• •••• •••• '+last4:'';}
  function maskDocumentNumber(value,force){var text=String(value==null?'':value).trim();if(!text)return '';if(!force&&!containsPan(text))return text;return masked(lastFour(text));}
  function redactText(value){return String(value==null?'':value).replace(PAN_PATTERN,function(candidate){return luhn(candidate)?masked(lastFour(candidate)):candidate;}).replace(/\b(CVV2?|CVC2?|CID|PIN)\s*[:#-]?\s*\d{3,6}\b/gi,'$1 [removed]');}
  function redactNode(value){if(Array.isArray(value))return value.map(redactNode);if(value&&typeof value==='object'){var result={};Object.keys(value).forEach(function(key){result[key]=redactNode(value[key]);});return result;}return typeof value==='string'?redactText(value):value;}
  function nodeContainsPan(value){if(Array.isArray(value))return value.some(nodeContainsPan);if(value&&typeof value==='object')return Object.keys(value).some(function(key){return nodeContainsPan(value[key]);});return typeof value==='string'&&containsPan(value);}
  function sanitizeExtractedDocument(documentData){var source=documentData&&typeof documentData==='object'?documentData:{};var card=isCardDocument(source.document_type)||nodeContainsPan(source);var output=redactNode(source);output.document_number=maskDocumentNumber(output.document_number,card);return {document:output,isPaymentCard:card};}
  function sanitizeRecord(record){var source=record||{};var card=source.paymentCard===true||isCardDocument(source.type)||nodeContainsPan(source);var output=redactNode(source);output.docNo=maskDocumentNumber(output.docNo,card);if(card)output.paymentCard=true;return {record:output,isPaymentCard:card};}
  var api={digits:digits,luhn:luhn,isCardDocument:isCardDocument,containsPan:containsPan,lastFour:lastFour,masked:masked,maskDocumentNumber:maskDocumentNumber,redactText:redactText,redactNode:redactNode,nodeContainsPan:nodeContainsPan,sanitizeExtractedDocument:sanitizeExtractedDocument,sanitizeRecord:sanitizeRecord};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.atsrsPaymentCardSafety=api;
})(typeof window!=='undefined'?window:globalThis);
