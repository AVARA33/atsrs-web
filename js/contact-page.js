(function(){
  'use strict';

  function value(id){
    var node=document.getElementById(id);
    return node?node.value.trim():'';
  }

  function submitContact(event){
    event.preventDefault();
    var form=event.currentTarget;
    var status=document.getElementById('contactFormStatus');
    if(!form.reportValidity())return;

    var role=value('contactCategory')||'general';
    var contact=window.ATSRS_CONTACT.get(role);
    var subject=contact.subject;
    var body=[
      'Name: '+value('contactName'),
      'Email: '+value('contactEmail'),
      value('contactCompany')?'Company: '+value('contactCompany'):'',
      '',
      value('contactMessage')
    ].filter(function(line,index){return line||index>=3;}).join('\n');

    status.textContent='Your email application will open with this message. ATSRS does not store this form on the website.';
    window.location.href='mailto:'+contact.email+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
  }

  function init(){
    var form=document.getElementById('contactForm');
    if(form)form.addEventListener('submit',submitContact);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
