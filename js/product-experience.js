/* ATSRS V242: shared, in-page document preview. */
(function(){
  var modal=document.getElementById('atsrsFilePreviewModal');
  var frame=document.getElementById('atsrsFilePreviewFrame');
  var title=document.getElementById('atsrsFilePreviewTitle');
  var closeButton=document.getElementById('atsrsFilePreviewClose');
  var downloadButton=document.getElementById('atsrsFilePreviewDownload');
  var activeDownload=null;
  var previousFocus=null;

  function closePreview(){
    if(!modal)return;
    modal.classList.add('hidden');
    document.body.classList.remove('atsrs-preview-open');
    if(frame)frame.src='about:blank';
    activeDownload=null;
    if(previousFocus&&typeof previousFocus.focus==='function')previousFocus.focus();
  }

  window.atsrsOpenFilePreview=function(options){
    options=typeof options==='string'?{url:options}:options||{};
    if(!modal||!frame)return false;
    previousFocus=document.activeElement;
    if(title)title.textContent=options.title||'ATSRS document';
    activeDownload=typeof options.onDownload==='function'?options.onDownload:null;
    if(downloadButton)downloadButton.classList.toggle('hidden',!activeDownload&&!options.downloadUrl);
    if(downloadButton&&options.downloadUrl){
      activeDownload=function(){
        var link=document.createElement('a');
        link.href=options.downloadUrl;
        link.download=options.title||'ATSRS-document';
        document.body.appendChild(link);
        link.click();
        link.remove();
      };
    }
    frame.src=options.url||'about:blank';
    modal.classList.remove('hidden');
    document.body.classList.add('atsrs-preview-open');
    if(closeButton)closeButton.focus();
    return true;
  };

  window.atsrsCloseFilePreview=closePreview;
  if(closeButton)closeButton.addEventListener('click',closePreview);
  if(downloadButton)downloadButton.addEventListener('click',function(){
    if(activeDownload)Promise.resolve(activeDownload()).catch(function(error){console.error(error);});
  });
  if(modal)modal.addEventListener('click',function(event){
    if(event.target&&event.target.getAttribute('data-preview-close')==='true')closePreview();
  });
  document.addEventListener('keydown',function(event){
    if(event.key==='Escape'&&modal&&!modal.classList.contains('hidden'))closePreview();
  });
})();
