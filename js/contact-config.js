(function(root){
  'use strict';

  var roles=Object.freeze({
    general:Object.freeze({email:'contact@atsrs.com',subject:'ATSRS General Enquiry'}),
    support:Object.freeze({email:'support@atsrs.com',subject:'ATSRS Account Support'}),
    privacy:Object.freeze({email:'privacy@atsrs.com',subject:'ATSRS Privacy Request'}),
    security:Object.freeze({email:'security@atsrs.com',subject:'ATSRS Security Report'}),
    billing:Object.freeze({email:'billing@atsrs.com',subject:'ATSRS Billing Enquiry'}),
    legal:Object.freeze({email:'legal@atsrs.com',subject:'ATSRS Legal Enquiry'})
  });
  var primaryMailbox=roles.general.email;

  function contactFor(role){
    return roles[role]||roles.general;
  }

  function mailto(role,subject){
    var contact=contactFor(role);
    return 'mailto:'+contact.email+'?subject='+encodeURIComponent(subject||contact.subject);
  }

  function apply(scope){
    (scope||document).querySelectorAll('[data-atsrs-contact-role]').forEach(function(node){
      var role=node.getAttribute('data-atsrs-contact-role')||'general';
      var contact=contactFor(role);
      var subject=node.getAttribute('data-atsrs-contact-subject')||contact.subject;
      if(node.tagName==='A')node.href=mailto(role,subject);
      if(!node.hasAttribute('data-atsrs-contact-label'))node.textContent=contact.email;
    });
  }

  root.ATSRS_CONTACT=Object.freeze({
    primary:primaryMailbox,
    roles:roles,
    get:contactFor,
    mailto:mailto,
    apply:apply
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){apply(document);});
  else apply(document);
})(window);
