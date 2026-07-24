/* ATSRS V268: stable in-page image preview with dedicated zoom controls. */
(function(){
  var modal=document.getElementById('atsrsFilePreviewModal');
  var frame=document.getElementById('atsrsFilePreviewFrame');
  var pdfPreview=document.getElementById('atsrsPdfPreview');
  var pdfStage=document.getElementById('atsrsPdfStage');
  var pdfPages=document.getElementById('atsrsPdfPages');
  var pdfZoomOut=document.getElementById('atsrsPdfZoomOut');
  var pdfZoomIn=document.getElementById('atsrsPdfZoomIn');
  var pdfFit=document.getElementById('atsrsPdfFit');
  var pdfZoomLabel=document.getElementById('atsrsPdfZoomLabel');
  var pdfStatus=document.getElementById('atsrsPdfStatus');
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
  var pdfDocument=null;
  var pdfLoadingTask=null;
  var pdfScale=1;
  var pdfFitScale=1;
  var pdfFitted=true;
  var pdfRenderVersion=0;
  var pdfOpenVersion=0;
  var lastWheelZoom=0;

  function isImage(options){
    return /^image\//i.test(options.mimeType||'')||/\.(avif|bmp|gif|heic|heif|jpe?g|png|webp)(?:$|[?#])/i.test(options.title||options.url||'');
  }

  function isPdf(options){
    return /^application\/pdf/i.test(options.mimeType||'')||/\.pdf(?:$|[?#])/i.test(options.title||options.url||'');
  }

  function previewIsOpen(){
    return !!(modal&&!modal.classList.contains('hidden'));
  }

  function pdfPreviewIsOpen(){
    return !!(previewIsOpen()&&pdfPreview&&!pdfPreview.classList.contains('hidden'));
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

  async function pdfLibrary(){
    if(window.atsrsPdfJs)return window.atsrsPdfJs;
    var moduleUrl=new URL('vendor/pdfjs/pdf.min.mjs?v=335',document.baseURI).href;
    var library=await import(moduleUrl);
    library.GlobalWorkerOptions.workerSrc=new URL('vendor/pdfjs/pdf.worker.min.mjs?v=335',document.baseURI).href;
    window.atsrsPdfJs=library;
    return library;
  }

  async function renderPdf(){
    if(!pdfDocument||!pdfPages||!pdfStage)return;
    var version=++pdfRenderVersion;
    var scrollRatio=pdfStage.scrollHeight>pdfStage.clientHeight?pdfStage.scrollTop/(pdfStage.scrollHeight-pdfStage.clientHeight):0;
    pdfPages.innerHTML='';
    if(pdfStatus)pdfStatus.textContent='Rendering '+pdfDocument.numPages+' page'+(pdfDocument.numPages===1?'':'s')+'...';
    var outputScale=Math.min(window.devicePixelRatio||1,1.5);
    try{
      for(var pageNumber=1;pageNumber<=pdfDocument.numPages;pageNumber+=1){
        if(version!==pdfRenderVersion)return;
        var page=await pdfDocument.getPage(pageNumber);
        var viewport=page.getViewport({scale:pdfScale});
        var canvas=document.createElement('canvas');
        var context=canvas.getContext('2d',{alpha:false});
        canvas.className='file-preview-pdf-page';
        canvas.width=Math.max(1,Math.floor(viewport.width*outputScale));
        canvas.height=Math.max(1,Math.floor(viewport.height*outputScale));
        canvas.style.width=Math.floor(viewport.width)+'px';
        canvas.style.height=Math.floor(viewport.height)+'px';
        pdfPages.appendChild(canvas);
        var renderOptions={canvasContext:context,viewport:viewport};
        if(outputScale!==1)renderOptions.transform=[outputScale,0,0,outputScale,0,0];
        await page.render(renderOptions).promise;
      }
      if(version!==pdfRenderVersion)return;
      if(pdfZoomLabel)pdfZoomLabel.textContent=Math.round(pdfScale*100)+'%';
      if(pdfStatus)pdfStatus.textContent=pdfDocument.numPages+' page'+(pdfDocument.numPages===1?'':'s');
      requestAnimationFrame(function(){
        if(pdfStage.scrollHeight>pdfStage.clientHeight)pdfStage.scrollTop=scrollRatio*(pdfStage.scrollHeight-pdfStage.clientHeight);
      });
    }catch(error){
      if(version!==pdfRenderVersion)return;
      console.error('ATSRS PDF render failed',error);
      if(pdfStatus)pdfStatus.textContent='Preview could not be rendered.';
    }
  }

  async function fitPdf(){
    if(!pdfDocument||!pdfStage)return;
    var firstPage=await pdfDocument.getPage(1);
    var naturalViewport=firstPage.getViewport({scale:1});
    pdfFitScale=Math.max(.2,Math.min(3,(pdfStage.clientWidth-42)/naturalViewport.width));
    pdfScale=pdfFitScale;
    pdfFitted=true;
    await renderPdf();
  }

  function changePdfZoom(multiplier){
    if(!pdfDocument)return;
    pdfFitted=false;
    pdfScale=Math.max(.2,Math.min(4,pdfScale*multiplier));
    renderPdf();
  }

  async function openPdf(options){
    if(!pdfPreview||!pdfPages)return;
    var openVersion=++pdfOpenVersion;
    pdfPreview.classList.remove('hidden');
    if(pdfStatus)pdfStatus.textContent='Loading document...';
    pdfPages.innerHTML='';
    pdfScale=1;
    pdfFitted=true;
    var library=await pdfLibrary();
    var response=await fetch(options.url||'',{credentials:'omit'});
    if(!response.ok)throw new Error('Document download failed ('+response.status+').');
    var bytes=await response.arrayBuffer();
    if(openVersion!==pdfOpenVersion||!pdfPreviewIsOpen())return;
    pdfLoadingTask=library.getDocument({data:new Uint8Array(bytes)});
    pdfDocument=await pdfLoadingTask.promise;
    if(openVersion!==pdfOpenVersion||!pdfPreviewIsOpen()){pdfDocument.destroy();pdfDocument=null;return;}
    await fitPdf();
  }

  function handlePreviewWheel(event){
    if(!event.ctrlKey||(!imagePreviewIsOpen()&&!pdfPreviewIsOpen()))return;
    event.preventDefault();
    event.stopPropagation();
    var now=Date.now();
    if(now-lastWheelZoom<45)return;
    lastWheelZoom=now;
    if(pdfPreviewIsOpen())changePdfZoom(event.deltaY<0?1.12:1/1.12);
    else changeImageZoom(event.deltaY<0?1.12:1/1.12);
  }

  function closePreview(){
    if(!modal)return;
    modal.classList.add('hidden');
    document.body.classList.remove('atsrs-preview-open');
    if(frame)frame.src='about:blank';
    pdfRenderVersion+=1;
    pdfOpenVersion+=1;
    if(pdfLoadingTask&&typeof pdfLoadingTask.destroy==='function')pdfLoadingTask.destroy().catch(function(){});
    else if(pdfDocument&&typeof pdfDocument.destroy==='function')pdfDocument.destroy().catch(function(){});
    pdfLoadingTask=null;
    pdfDocument=null;
    if(pdfPages)pdfPages.innerHTML='';
    if(pdfPreview)pdfPreview.classList.add('hidden');
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
    var pdfMode=isPdf(options);
    frame.classList.toggle('hidden',imageMode||pdfMode);
    if(pdfPreview)pdfPreview.classList.add('hidden');
    if(imagePreview)imagePreview.classList.toggle('hidden',!imageMode);
    if(imageMode&&imageContent){
      frame.src='about:blank';
      imageContent.alt=options.title||'Document preview';
      imageContent.onload=function(){requestAnimationFrame(fitImage);};
      imageContent.src=options.url||'';
    }else if(pdfMode){
      frame.src='about:blank';
      if(imagePreview)imagePreview.classList.add('hidden');
    }else{
      frame.src=options.url||'about:blank';
    }
    modal.classList.remove('hidden');
    document.body.classList.add('atsrs-preview-open');
    if(closeButton)closeButton.focus();
    if(pdfMode)openPdf(options).catch(function(error){
      console.error('ATSRS PDF preview failed',error);
      if(pdfStatus)pdfStatus.textContent='Preview could not be loaded. Please close and try again.';
    });
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
  if(pdfZoomOut)pdfZoomOut.addEventListener('click',function(){changePdfZoom(1/1.2);});
  if(pdfZoomIn)pdfZoomIn.addEventListener('click',function(){changePdfZoom(1.2);});
  if(pdfFit)pdfFit.addEventListener('click',fitPdf);
  document.addEventListener('wheel',handlePreviewWheel,{capture:true,passive:false});
  window.addEventListener('resize',function(){
    if(imageFitted&&imagePreviewIsOpen())fitImage();
    if(pdfFitted&&pdfPreviewIsOpen())fitPdf();
  });
  if(modal)modal.addEventListener('click',function(event){
    if(event.target&&event.target.getAttribute('data-preview-close')==='true')closePreview();
  });
  document.addEventListener('keydown',function(event){
    if(event.key==='Escape'&&modal&&!modal.classList.contains('hidden'))closePreview();
  });
})();
