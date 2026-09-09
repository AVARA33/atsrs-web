(function(){
  'use strict';

  var attentionTimers=new WeakMap();

  function visible(element){
    if(!element||!element.isConnected||element.hidden||element.classList.contains('hidden'))return false;
    var style=getComputedStyle(element);
    return style.display!=='none'&&style.visibility!=='hidden'&&style.pointerEvents!=='none'&&element.getClientRects().length>0;
  }

  function modalSurface(root){
    if(root.tagName==='DIALOG'||root.classList.contains('atsrs-document-folder-rename'))return root;
    var children=Array.prototype.slice.call(root.children||[]);
    var backdrop=children.find(function(child){return /backdrop/i.test(String(child.className||''));});
    if(!backdrop)return root;
    return children.find(function(child){return child!==backdrop&&visible(child);})||root;
  }

  function activeModal(){
    var candidates=Array.prototype.slice.call(document.querySelectorAll('dialog[open],[role="dialog"][aria-modal="true"]')).filter(visible);
    if(!candidates.length)return null;
    candidates.sort(function(a,b){
      var az=parseInt(getComputedStyle(a).zIndex,10)||0,bz=parseInt(getComputedStyle(b).zIndex,10)||0;
      if(az!==bz)return az-bz;
      return a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1;
    });
    return candidates[candidates.length-1];
  }

  function warn(root){
    var surface=modalSurface(root),oldTimer=attentionTimers.get(surface);
    if(oldTimer)clearTimeout(oldTimer);
    surface.classList.remove('atsrs-modal-attention');
    void surface.offsetWidth;
    surface.classList.add('atsrs-modal-attention');
    attentionTimers.set(surface,setTimeout(function(){surface.classList.remove('atsrs-modal-attention');attentionTimers.delete(surface);},700));
  }

  function isInside(root,target){
    var surface=modalSurface(root);
    if(root.tagName==='DIALOG'&&target===root)return false;
    return surface===target||surface.contains(target);
  }

  function guard(event){
    var root=activeModal();
    if(!root||isInside(root,event.target))return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if(event.type==='pointerdown'||event.type==='touchstart')warn(root);
  }

  ['pointerdown','mousedown','touchstart','click'].forEach(function(type){document.addEventListener(type,guard,true);});
})();
