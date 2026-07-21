/* ATSRS V252: stable in-page image preview with dedicated zoom controls. */
(function(){
  var modal=document.getElementById('atsrsFilePreviewModal');
  var frame=document.getElementById('atsrsFilePreviewFrame');
  var imagePreview=document.getElementById('atsrsImagePreview');
  var imageStage=document.getElementById('atsrsImageStage');
  var imageCanvas=document.getElementById('atsrsImageCanvas');
  var imageContent=document.getElementById('atsrsImageContent');
  var imageZoomOut=document.getElementById('atsrsImageZoomOut');
  var imageZoomIn=document.getElementById('atsrsImageZoomIn');
  var imageFit=document.getElementById('atsrsImageFit');
  var imageZoomLabel=document.getElementById('atsrsImageZoomLabel');
  var title=document.getElementById('atsrsFilePreviewTitle');
  var closeButton=document.getElementById('atsrsFilePreviewClose');
  var downloadButton=document.getElementById('atsrsFilePreviewDownload');
  var activeDownload=null;
  var previousFocus=null;
  var imageScale=1;
  var imageFitScale=1;
  var imageFitted=true;
  var lastWheelZoom=0;

  function isImage(options){
    return /^image\//i.test(options.mimeType||'')||/\.(avif|bmp|gif|heic|heif|jpe?g|png|webp)(?:$|[?#])/i.test(options.title||options.url||'');
  }

  function applyImageScale(scale){
    if(!imageContent||!imageContent.naturalWidth)return;
    imageScale=Math.max(.08,Math.min(6,scale));
    var width=Math.round(imageContent.naturalWidth*imageScale);
    var height=Math.round(imageContent.naturalHeight*imageScale);
    imageContent.style.width=width+'px';
    imageContent.style.height=height+'px';
    if(imageCanvas&&imageStage){
      imageCanvas.style.width=Math.max(imageStage.clientWidth,width)+'px';
      imageCanvas.style.height=Math.max(imageStage.clientHeight,height)+'px';
    }
    if(imageZoomLabel)imageZoomLabel.textContent=Math.round(imageScale*100)+'%';
  }

  function fitImage(){
    if(!imageContent||!imageStage||!imageContent.naturalWidth)return;
    var availableWidth=Math.max(1,imageStage.clientWidth-24);
    var availableHeight=Math.max(1,imageStage.clientHeight-24);
    imageFitScale=Math.min(availableWidth/imageContent.naturalWidth,availableHeight/imageContent.naturalHeight);
    imageFitted=true;
    applyImageScale(imageFitScale);
    imageStage.scrollLeft=0;
    imageStage.scrollTop=0;
  }

  function changeImageZoom(multiplier){
    imageFitted=false;
    applyImageScale(imageScale*multiplier);
  }

  function imagePreviewIsOpen(){
    return !!(modal&&imagePreview&&!modal.classList.contains('hidden')&&!imagePreview.classList.contains('hidden'));
  }

  function handlePreviewWheel(event){
    if(!event.ctrlKey||!imagePreviewIsOpen())return;
    event.preventDefault();
    event.stopPropagation();
    var now=Date.now();
    if(now-lastWheelZoom<45)return;
    lastWheelZoom=now;
    changeImageZoom(event.deltaY<0?1.12:1/1.12);
  }

  function closePreview(){
    if(!modal)return;
    modal.classList.add('hidden');
    document.body.classList.remove('atsrs-preview-open');
    if(frame)frame.src='about:blank';
    if(imageContent){imageContent.removeAttribute('src');imageContent.style.width='';imageContent.style.height='';}
    if(imagePreview)imagePreview.classList.add('hidden');
    if(frame)frame.classList.remove('hidden');
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
    var imageMode=isImage(options);
    frame.classList.toggle('hidden',imageMode);
    if(imagePreview)imagePreview.classList.toggle('hidden',!imageMode);
    if(imageMode&&imageContent){
      frame.src='about:blank';
      imageContent.alt=options.title||'Document preview';
      imageContent.onload=function(){requestAnimationFrame(fitImage);};
      imageContent.src=options.url||'';
    }else{
      frame.src=options.url||'about:blank';
    }
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
  if(imageZoomOut)imageZoomOut.addEventListener('click',function(){changeImageZoom(1/1.2);});
  if(imageZoomIn)imageZoomIn.addEventListener('click',function(){changeImageZoom(1.2);});
  if(imageFit)imageFit.addEventListener('click',fitImage);
  document.addEventListener('wheel',handlePreviewWheel,{capture:true,passive:false});
  window.addEventListener('resize',function(){if(imageFitted&&modal&&!modal.classList.contains('hidden'))fitImage();});
  if(modal)modal.addEventListener('click',function(event){
    if(event.target&&event.target.getAttribute('data-preview-close')==='true')closePreview();
  });
  document.addEventListener('keydown',function(event){
    if(event.key==='Escape'&&modal&&!modal.classList.contains('hidden'))closePreview();
  });
})();
