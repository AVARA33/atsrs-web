/* ATSRS normalized-read cutover preparation.
   This module cannot switch the application read source. It builds equivalent
   domain models and proves whether a normalized result is safe for a canary. */
(function(root,factory){
  var comparator=null;
  if(typeof module==='object'&&module.exports){
    comparator=require('./shadow-read.js');
    module.exports=factory(comparator);
    return;
  }
  comparator=root&&root.atsrsShadowRead;
  if(root)root.atsrsNormalizedReadAdapter=factory(comparator);
})(typeof window!=='undefined'?window:null,function(shadow){
  'use strict';

  var ENTITIES=['personnel','certificates','projects','assignments'];

  function sortedModel(rows){
    return ENTITIES.reduce(function(output,entity){
      output[entity]=(rows[entity]||[]).map(function(item){
        return {id:String(item.id),canonical:item.canonical};
      }).sort(function(left,right){
        return left.id.localeCompare(right.id);
      });
      return output;
    },{});
  }

  function legacyModel(input){
    return sortedModel(shadow.buildSource(
      input.legacy,
      input.workspace,
      input.email||''
    ));
  }

  function normalizedModel(input){
    return sortedModel(shadow.buildTarget(input.normalized));
  }

  function assignOptional(output,key,value){
    if(value!==undefined&&value!==null)output[key]=value;
  }
  function assignBoolean(output,key,value){
    if(value===true||Object.prototype.hasOwnProperty.call(output,key)){
      output[key]=value===true;
    }
  }
  function metadataEnvelope(base,metadata){
    return Object.assign(
      {},
      metadata&&typeof metadata==='object'&&!Array.isArray(metadata)?metadata:{},
      base&&typeof base==='object'&&!Array.isArray(base)?base:{}
    );
  }
  function bySource(rows){
    return new Map((rows||[]).map(function(row){
      return [String(row.source_entity_id||'').toLowerCase(),row];
    }));
  }
  function legacyCompatibleModel(input){
    var legacy=input.legacy||{};
    var normalized=input.normalized||{};
    var personnelRows=normalized.personnel||[];
    var projectRows=normalized.projects||[];
    var personnelBySource=bySource(personnelRows);
    var projectsBySource=bySource(projectRows);
    var personnelById=new Map(personnelRows.map(function(row){return [String(row.id),row];}));
    var projectsById=new Map(projectRows.map(function(row){return [String(row.id),row];}));
    var projectIdsByPersonnel=new Map();
    (normalized.assignments||[]).forEach(function(row){
      var person=personnelById.get(String(row.personnel_id));
      var project=projectsById.get(String(row.project_id));
      if(!person||!project)return;
      var personSource=String(person.source_entity_id||'').toLowerCase();
      var projectSource=String(project.source_entity_id||'').toLowerCase();
      if(!projectIdsByPersonnel.has(personSource))projectIdsByPersonnel.set(personSource,[]);
      projectIdsByPersonnel.get(personSource).push(projectSource);
    });
    projectIdsByPersonnel.forEach(function(ids){
      ids.sort();
    });

    var profile=legacy.profile;
    if(input.workspace.accountType==='personal'){
      var owner=personnelRows.find(function(row){
        return row.source==='workspace_data_personal_profile';
      });
      if(owner){
        profile=metadataEnvelope(legacy.profile,owner.metadata);
        profile.atsrsId=String(owner.source_entity_id).toLowerCase();
        profile.name=owner.first_name;
        assignOptional(profile,'surname',owner.last_name);
        assignOptional(profile,'position',owner.position);
        assignOptional(profile,'company',owner.company_name);
        assignOptional(profile,'phone',owner.phone);
        assignOptional(profile,'whatsapp',owner.whatsapp);
        assignOptional(profile,'country',owner.nationality);
        assignBoolean(profile,'phoneVerified',owner.phone_verified);
        assignBoolean(profile,'whatsappVerified',owner.whatsapp_verified);
      }
    }

    var personnel=(Array.isArray(legacy.personnel)?legacy.personnel:[]).map(function(base){
      var id=String(base&&base.atsrsId||'').toLowerCase();
      var row=personnelBySource.get(id);
      if(!row)return base;
      var output=metadataEnvelope(base,row.metadata);
      output.atsrsId=id;
      output.atsrsProjectIds=(projectIdsByPersonnel.get(id)||[]).slice();
      output.name=row.first_name;
      assignOptional(output,'linkedUserId',row.linked_user_id);
      assignOptional(output,'surname',row.last_name);
      assignOptional(output,'position',row.position);
      assignOptional(output,'company',row.company_name);
      assignOptional(output,'email',row.email);
      assignOptional(output,'phone',row.phone);
      assignOptional(output,'whatsapp',row.whatsapp);
      assignOptional(output,'nationality',row.nationality);
      assignOptional(output,'employeeId',row.employee_id);
      assignOptional(output,'source',row.source);
      assignOptional(output,'accessStatus',row.access_status);
      assignOptional(output,'linkedStatus',row.linked_status);
      assignOptional(output,'trackerStatus',row.tracker_status);
      assignBoolean(output,'phoneVerified',row.phone_verified);
      assignBoolean(output,'whatsappVerified',row.whatsapp_verified);
      return output;
    });
    var personnelNames=new Map();
    personnel.forEach(function(row){
      var name=[row.name,row.surname].map(function(value){return String(value||'').trim();})
        .filter(Boolean).join(' ');
      personnelNames.set(String(row.atsrsId||'').toLowerCase(),name);
    });
    if(profile&&profile.atsrsId){
      personnelNames.set(
        String(profile.atsrsId).toLowerCase(),
        [profile.name,profile.surname].map(function(value){return String(value||'').trim();})
          .filter(Boolean).join(' ')
      );
    }

    var certificatesBySource=bySource(normalized.certificates||[]);
    var certificates=(Array.isArray(legacy.certificates)?legacy.certificates:[]).map(function(base){
      var id=String(base&&base.atsrsId||'').toLowerCase();
      var row=certificatesBySource.get(id);
      if(!row)return base;
      var owner=personnelById.get(String(row.personnel_id));
      var ownerSource=owner?String(owner.source_entity_id||'').toLowerCase():'';
      var output=metadataEnvelope(base,row.metadata);
      output.atsrsId=id;
      output.atsrsPersonnelId=ownerSource;
      output.person=output.person||personnelNames.get(ownerSource)||'';
      output.type=row.certificate_type;
      assignOptional(output,'provider',row.provider_name);
      assignOptional(output,'docNo',row.document_number);
      assignOptional(output,'country',row.issuing_country);
      assignOptional(output,'issue',row.issue_date);
      assignOptional(output,'expiry',row.expiry_date);
      assignOptional(output,'cloudFileId',row.file_id);
      return output;
    });

    var projects=(Array.isArray(legacy.projects)?legacy.projects:[]).map(function(base){
      var id=String(base&&base.atsrsId||'').toLowerCase();
      var row=projectsBySource.get(id);
      if(!row)return base;
      var output=metadataEnvelope(base,row.metadata);
      output.atsrsId=id;
      output.project=row.project_name;
      assignOptional(output,'vessel',row.vessel_name);
      assignOptional(output,'client',row.client_name);
      assignOptional(output,'team',row.team_name);
      return output;
    });
    return {
      profile:profile,
      personnel:personnel,
      certificates:certificates,
      projects:projects
    };
  }

  function enabledCanary(flag){
    return flag===true||flag==='canary';
  }

  async function evaluate(input){
    if(!shadow||typeof shadow.compare!=='function'){
      throw new Error('Normalized read comparator is unavailable');
    }
    var legacy=legacyModel(input);
    var result={
      mode:enabledCanary(input.featureFlag)
        ?(input.primaryRead===true?'primary-canary':'canary')
        :'legacy',
      authoritative_source:'legacy_json',
      selected_source:'legacy_json',
      cutover_enabled:false,
      normalized_candidate:false,
      fallback_reason:null,
      legacy_model:legacy,
      normalized_model:null,
      read_model:null,
      parity:null
    };
    if(!enabledCanary(input.featureFlag)){
      result.fallback_reason='feature_flag_off';
      return result;
    }
    try{
      var parity=await shadow.compare(input);
      result.parity=parity;
      if(parity.status!=='match'||parity.mismatch_count!==0||parity.skipped_count!==0){
        result.fallback_reason='parity_gate_failed';
        return result;
      }
      result.normalized_model=normalizedModel(input);
      result.normalized_candidate=true;
      if(input.primaryRead===true){
        result.read_model=legacyCompatibleModel(input);
        result.selected_source='normalized_overlay';
        result.cutover_enabled=true;
      }
      return result;
    }catch(error){
      result.fallback_reason='normalized_read_unavailable';
      return result;
    }
  }

  return {
    evaluate:evaluate,
    legacyModel:legacyModel,
    normalizedModel:normalizedModel,
    legacyCompatibleModel:legacyCompatibleModel,
    specification:{
      modes:['legacy','canary','primary-canary'],
      default_mode:'legacy',
      authoritative_source:'legacy_json',
      fallback_source:'legacy_json',
      cutover_enabled:false,
      candidate_gate:'exact canonical parity with zero skipped records',
      mutation:false
    }
  };
});
