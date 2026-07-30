/* ATSRS V393 read-only canary allowlist.
   Values are SHA-256(user_id::account_type), never raw account identifiers. */
(function(root,factory){
  var config=factory();
  if(typeof module==='object'&&module.exports)module.exports=config;
  if(root)root.__ATSRS_NORMALIZED_READ_CANARY__=config;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  return {
    enabled:true,
    scopeHashes:[
      '8dfd4159e74d7afd43a91b41e9cb848aca41a11cdaef4c1c143917ea7e705195',
      'ac91e2cfdf3d2a28a1747ebe0e502529ae9a79ea6500492631e1daacc963b2b5',
      'cc5fa3b7c00290aa3165b10765c092da70349c7befb9c5ed4a6df3858657a615',
      'd22bef57878170e287dfc71ea50f668e0d09d1b03896289cc4677dbed81c74b4'
    ]
  };
});
