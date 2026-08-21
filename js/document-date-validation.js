(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.atsrsDocumentDateValidation=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function pad(value){return String(value).padStart(2,'0');}
  function iso(year,month,day){return String(year).padStart(4,'0')+'-'+pad(month)+'-'+pad(day);}
  function validDate(year,month,day){
    var date=new Date(Date.UTC(year,month-1,day));
    return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;
  }
  function normalizeIso(value){
    var match=String(value||'').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!match)return '';
    var year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
    return validDate(year,month,day)?iso(year,month,day):'';
  }
  function parseRawDate(value){
    var raw=String(value||'').trim();
    var normalized=normalizeIso(raw);
    if(normalized)return {raw:raw,normalized:normalized,ambiguous:false,candidates:[normalized]};
    var match=raw.match(/(?:^|\D)(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})(?:\D|$)/);
    if(!match)return {raw:raw,normalized:'',ambiguous:false,candidates:[]};
    var first=Number(match[1]),second=Number(match[2]),year=Number(match[3]),candidates=[];
    if(validDate(year,second,first))candidates.push(iso(year,second,first));
    if(validDate(year,first,second)){
      var monthFirst=iso(year,first,second);
      if(candidates.indexOf(monthFirst)<0)candidates.push(monthFirst);
    }
    return {raw:raw,normalized:candidates.length===1?candidates[0]:'',ambiguous:candidates.length>1,candidates:candidates};
  }
  function addDuration(issue,value,unit){
    var normalized=normalizeIso(issue),amount=Number(value),kind=String(unit||'').toLowerCase();
    if(!normalized||!Number.isInteger(amount)||amount<0||!['days','months','years'].includes(kind))return '';
    var parts=normalized.split('-').map(Number),date;
    if(kind==='days'){
      date=new Date(Date.UTC(parts[0],parts[1]-1,parts[2]+amount));
      return iso(date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate());
    }
    var months=kind==='years'?amount*12:amount;
    var absolute=parts[0]*12+(parts[1]-1)+months,targetYear=Math.floor(absolute/12),targetMonth=absolute%12;
    var lastDay=new Date(Date.UTC(targetYear,targetMonth+1,0)).getUTCDate();
    return iso(targetYear,targetMonth+1,Math.min(parts[2],lastDay));
  }
  function copyEvidence(value){
    return Array.isArray(value)?value.filter(function(item){return item&&typeof item==='object';}).map(function(item){
      return {field:String(item.field||''),source_label:String(item.source_label||''),raw_text:String(item.raw_text||''),normalized_value:String(item.normalized_value||''),model_normalized_value:String(item.model_normalized_value||'')};
    }):[];
  }
  function validate(documentData){
    var source=documentData&&typeof documentData==='object'?documentData:{};
    var output=Object.assign({},source),warnings=Array.isArray(source.warnings)?source.warnings.filter(Boolean).map(String):[];
    var evidence=copyEvidence(source.date_evidence),issues=[],conflicts=[],blocked=[];
    var priorValidation=source.date_validation&&typeof source.date_validation==='object'?source.date_validation:null;
    var priorBlocked=priorValidation&&Array.isArray(priorValidation.blocked_fields)?priorValidation.blocked_fields.map(String):[];
    if(priorValidation&&Array.isArray(priorValidation.issues))issues=issues.concat(priorValidation.issues);
    if(priorValidation&&Array.isArray(priorValidation.conflicts))conflicts=conflicts.concat(priorValidation.conflicts);
    output.issue_date=normalizeIso(source.issue_date);
    output.expiry_date=normalizeIso(source.expiry_date);
    ['issue_date','expiry_date'].forEach(function(field){
      if(source[field]&&!output[field])issues.push({field:field,code:'invalid_date',message:'The '+field.replace('_',' ')+' is not a valid ISO calendar date.'});
    });
    evidence.forEach(function(item){
      if(item.field!=='issue_date'&&item.field!=='expiry_date')return;
      var parsed=parseRawDate(item.raw_text),claimed=normalizeIso(item.model_normalized_value||item.normalized_value);
      item.model_normalized_value=claimed;
      item.normalized_value=parsed.normalized;
      if(parsed.ambiguous){
        issues.push({field:item.field,code:'ambiguous_numeric_date',raw_text:item.raw_text,candidates:parsed.candidates,message:'Numeric date evidence can be read as either DD.MM.YYYY or MM.DD.YYYY.'});
      }
      if(claimed&&parsed.candidates.length&&parsed.candidates.indexOf(claimed)<0){
        conflicts.push({field:item.field,code:'evidence_normalization_conflict',model_value:claimed,raw_text:item.raw_text,candidates:parsed.candidates});
      }
    });
    ['issue_date','expiry_date'].forEach(function(field){
      var values=Array.from(new Set(evidence.filter(function(item){return item.field===field&&item.normalized_value;}).map(function(item){return item.normalized_value;})));
      if(values.length>1){
        conflicts.push({field:field,code:'conflicting_'+field+'_evidence',model_value:output[field],evidence_values:values});
      }else if(values.length===1&&output[field]&&output[field]!==values[0]){
        conflicts.push({field:field,code:'explicit_evidence_conflict',model_value:output[field],evidence_value:values[0]});
      }else if(values.length===1&&!output[field]){
        output[field]=values[0];
      }
    });
    var duration=source.validity_duration&&typeof source.validity_duration==='object'?{
      value:Number(source.validity_duration.value),unit:String(source.validity_duration.unit||'').toLowerCase(),raw_text:String(source.validity_duration.raw_text||'')
    }:null;
    var derived=duration?addDuration(output.issue_date,duration.value,duration.unit):'';
    if(derived&&priorBlocked.indexOf('expiry_date')<0){
      if(output.expiry_date&&output.expiry_date!==derived){
        conflicts.push({field:'expiry_date',code:'duration_conflict',model_value:output.expiry_date,expected_value:derived,raw_text:duration.raw_text});
      }else if(!output.expiry_date){
        output.expiry_date=derived;
      }
    }
    if(issues.some(function(item){return item.field==='expiry_date'&&item.code==='ambiguous_numeric_date';})&&!derived){
      blocked.push('expiry_date');
    }
    priorBlocked.forEach(function(field){if(blocked.indexOf(field)<0)blocked.push(field);});
    conflicts.forEach(function(item){if(blocked.indexOf(item.field)<0)blocked.push(item.field);});
    if(blocked.indexOf('expiry_date')>=0){
      output.expiry_date='';
      output.expiry_not_applicable=false;
    }
    if(blocked.indexOf('issue_date')>=0)output.issue_date='';
    if(issues.length||conflicts.length){
      warnings.push('Date evidence needs manual review. Conflicting or ambiguous dates were not autofilled.');
    }
    output.warnings=Array.from(new Set(warnings));
    output.date_evidence=evidence;
    output.date_validation={status:blocked.length?'review_required':issues.length?'review_recommended':'accepted',blocked_fields:blocked,issues:issues,conflicts:conflicts,derived_expiry_date:derived,original_values:{issue_date:String(source.issue_date||''),expiry_date:String(source.expiry_date||'')}};
    return output;
  }
  return {normalizeIso:normalizeIso,parseRawDate:parseRawDate,addDuration:addDuration,validate:validate};
});
