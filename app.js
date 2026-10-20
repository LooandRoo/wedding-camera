"use strict";
(() => {
  const cfg = window.WEDDING_CONFIG || {};
  const el = (id) => document.getElementById(id);
  const alerts = el('alerts'), list = el('photoList');
  const data = new Map();
  let db = null, stream = null, facing = 'environment', busy = false, cameraOpening = false;
  let urls = [];
  const configured = /^[a-zA-Z0-9_-]+$/.test(cfg.cloudName || '') && /^[a-zA-Z0-9_-]+$/.test(cfg.unsignedUploadPreset || '') &&
    !String(cfg.cloudName).startsWith('REPLACE_') && !String(cfg.unsignedUploadPreset).startsWith('REPLACE_');

  document.title = `${cfg.couple || 'Our'} Wedding Camera`;
  el('main-title').innerHTML = ''; // Render configurable names without allowing HTML injection.
  const coupleName = cfg.couple || 'Lauren & Casey';
  const parts = coupleName.split(/\s*&\s*/);
  el('main-title').append(document.createTextNode(parts[0] || coupleName));
  if (parts.length > 1) {
    const amp = document.createElement('span'); amp.className='amp'; amp.textContent=' & ';
    el('main-title').append(amp, document.createTextNode(parts.slice(1).join(' & ')));
  }
  el('weddingDate').textContent = (cfg.date || '').toUpperCase();
  document.querySelector('.hero-tag').textContent = cfg.tagLine || '';

  function showNotice(message, tone='') {
    const p=document.createElement('div');p.className=`notice ${tone}`.trim();p.textContent=message;
    alerts.replaceChildren(p);
  }
  if (!configured) {
    showNotice('Setup is not finished yet. The couple needs to add their Cloudinary cloud name and unsigned upload preset to config.js. Pictures can be taken, but cannot upload until then.');
  }

  function openDatabase() {
    return new Promise((resolve,reject) => {
      if(!('indexedDB' in window)) {reject(new Error('No IndexedDB'));return;}
      const request = indexedDB.open('lauren-casey-wedding-camera-v1',1);
      request.onupgradeneeded=() => request.result.createObjectStore('photos',{keyPath:'id'});
      request.onsuccess=() => resolve(request.result);
      request.onerror=() => reject(request.error);
    });
  }
  function storageAction(mode, callback) {
    return new Promise((resolve,reject)=> {
      if(!db){reject(new Error('Browser storage unavailable'));return;}
      const tx=db.transaction('photos',mode), store=tx.objectStore('photos');
      let result;
      try { result=callback(store); } catch(err){reject(err);return;}
      tx.oncomplete=()=>resolve(result?.result);
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error);
    });
  }
  const saveRecord = (record) => storageAction('readwrite', store=>store.put(record));
  const deleteRecord = (id) => storageAction('readwrite', store=>store.delete(id));
  async function loadRecords() {
    try {
      db=await openDatabase();
      const records=await storageAction('readonly', store=>store.getAll());
      for(const rec of records||[]) {if(rec.status==='uploading')rec.status='pending';data.set(rec.id,rec);}
    } catch (err) {
      showNotice('This browser cannot store backup copies here. Please use Save a copy before leaving this page.','error');
    }
    render();
    if(configured) uploadPending();
  }

  function formatBytes(bytes) {return bytes>=1048576?`${(bytes/1048576).toFixed(1)} MB`:`${Math.max(1,Math.round(bytes/1024))} KB`;}
  function uid() {return (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);}
  function render() {
    for(const url of urls)URL.revokeObjectURL(url);
    urls=[];
    const photos=[...data.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    el('photoCount').textContent = `${photos.length} photo${photos.length===1?'':'s'}`;
    el('emptyState').classList.toggle('hidden', photos.length>0);
    list.replaceChildren();
    for(const rec of photos){
      const card=document.createElement('div');card.className='photo-card';
      const img=document.createElement('img');const url=URL.createObjectURL(rec.blob);urls.push(url);img.src=url;img.alt='Your wedding photo';
      const right=document.createElement('div');right.className='photo-right';
      const status=document.createElement('p');status.className='photo-status';
      const messages={pending:'Ready to upload',uploading:'Uploading…',uploaded:'Uploaded ✓',failed:'Not uploaded — retry'};
      status.textContent=messages[rec.status]||'Ready to upload';
      if(rec.status==='uploaded')status.classList.add('uploaded');if(rec.status==='failed')status.classList.add('failed');
      const detail=document.createElement('p');detail.className='photo-details';
      detail.textContent=`${formatBytes(rec.blob.size)} · ${rec.persisted?'Kept in this browser':'Not saved in browser'}${rec.status==='failed'&&rec.error?' · '+rec.error:''}`;
      const buttons=document.createElement('div');buttons.className='photo-buttons';
      const save=document.createElement('button');save.type='button';save.textContent='Save a copy';save.addEventListener('click',()=>saveCopy(rec));buttons.append(save);
      if(rec.status==='pending'||rec.status==='failed') {
        const retry=document.createElement('button');retry.type='button';retry.className='retry';retry.textContent='Upload / retry';
        retry.disabled=!configured;
        retry.addEventListener('click',async()=>{rec.status='pending';rec.error='';await persistBestEffort(rec);render();uploadPending();});buttons.append(retry);
      }
      const remove=document.createElement('button');remove.type='button';remove.className='remove';remove.textContent='Remove';
      remove.addEventListener('click',()=>removePhoto(rec));buttons.append(remove);
      right.append(status,detail,buttons);card.append(img,right);list.append(card);
    }
  }
  async function persistBestEffort(rec) {
    if(!db){rec.persisted=false;return;}
    // Only save a plain, safely clonable record to IndexedDB.
    try{rec.persisted=true;await saveRecord(rec);}
    catch(e){rec.persisted=false;showNotice('Browser backup storage is full or unavailable. Use Save a copy before leaving this page.','error');}
  }
  async function addPhoto(blob) {
    const rec={id:uid(),blob,createdAt:new Date().toISOString(),status:'pending',error:'',persisted:false};
    data.set(rec.id,rec);
    await persistBestEffort(rec);
    render();
    showNotice('Photo captured! Uploading to the wedding album. For a phone backup, tap Save a copy.','success');
    if(configured)uploadPending();
  }
  async function uploadPending() {
    if(busy||!configured||!navigator.onLine)return;
    busy=true;
    try {
      for(const rec of data.values()){
        if(rec.status!=='pending')continue;
        rec.status='uploading';rec.error='';await persistBestEffort(rec);render();
        const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),60000);
        try{
          const form=new FormData();
          form.append('file',rec.blob,`wedding-${rec.id}.jpg`);
          form.append('upload_preset',cfg.unsignedUploadPreset);
          const response=await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cfg.cloudName)}/image/upload`,{method:'POST',body:form,signal:controller.signal});
          const payload=await response.json().catch(()=>({}));
          if(!response.ok||!payload.secure_url) {
            const raw=String(payload?.error?.message||`Upload rejected (${response.status})`);
            throw new Error(raw.slice(0,140));
          }
          rec.status='uploaded';rec.uploadUrl=payload.secure_url;
          rec.error='';
        }catch(error){
          rec.status='failed';
          rec.error=error.name==='AbortError'?'Upload timed out':(error.message||'Connection error').slice(0,140);
          showNotice('An upload did not complete. Your photo is still on this page. Use Retry and Save a copy.','error');
        }finally{clearTimeout(timer);await persistBestEffort(rec);render();}
      }
    }finally{busy=false;}
  }
  async function removePhoto(rec) {
    if(rec.status==='uploading'){showNotice('Please allow this upload to finish before removing this photo.');return;}
    const message=rec.status==='uploaded'?'Remove this picture from this phone? It will remain in the wedding album.':'This photo has NOT been uploaded. Remove its local copy anyway?';
    if(!window.confirm(message))return;
    data.delete(rec.id);if(db)try{await deleteRecord(rec.id)}catch(e){}
    render();
  }
  async function saveCopy(rec) {
    const file=new File([rec.blob],`lauren-casey-${rec.id}.jpg`,{type:'image/jpeg'});
    if(navigator.canShare?.({files:[file]}) && navigator.share){
      try{await navigator.share({files:[file],title:'Wedding photo'});return;}
      catch(e){if(e.name==='AbortError')return;}
    }
    const url=URL.createObjectURL(rec.blob);
    const anchor=document.createElement('a');anchor.href=url;anchor.download=file.name;
    document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    showNotice('Your browser started a download. On iPhone, check Files/Downloads; you may need to use Share → Save Image to add it to Photos.');
  }
  function imageFromFile(file) {
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file);const image=new Image();
      image.onload=()=>{URL.revokeObjectURL(url);resolve(image);};
      image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('This phone could not read that image format.'));};
      image.src=url;
    });
  }
  function canvasToBlob(canvas) {
    return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not save the image.')),'image/jpeg',Number(cfg.jpegQuality)||0.88));
  }
  async function compressImage(file) {
    if(!file.type.startsWith('image/'))throw new Error('Select a photo file.');
    const image=await imageFromFile(file);
    const dimension=Math.max(1000,Math.min(3200,Number(cfg.maxImageDimension)||2200));
    const scale=Math.min(1,dimension/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
    return canvasToBlob(canvas);
  }
  async function filesChosen(event) {
    const files=[...(event.target.files||[])].slice(0,20);event.target.value='';
    for(const file of files){
      try{await addPhoto(await compressImage(file));}
      catch(err){showNotice(`Couldn't add ${file.name}: ${err.message}`,'error');}
    }
  }
  el('libraryInput').addEventListener('change',filesChosen);
  el('nativeCameraInput').addEventListener('change',filesChosen);
  el('libraryButton').addEventListener('click',()=>el('libraryInput').click());
  el('phoneCamButton').addEventListener('click',()=>el('nativeCameraInput').click());

  function stopCamera(){if(stream){for(const track of stream.getTracks())track.stop();stream=null;}el('cameraVideo').srcObject=null;}
  async function startCamera(){
    if(cameraOpening)return;cameraOpening=true;
    el('cameraError').textContent='';
    try{
      stopCamera();
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('The live camera is unavailable in this browser. Close this view and tap Use phone camera instead.');
      const current=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:facing},width:{ideal:1920},height:{ideal:1080}}});
      if(el('cameraOverlay').classList.contains('hidden')){current.getTracks().forEach(track=>track.stop());return;}
      stream=current;el('cameraVideo').srcObject=stream;
      await el('cameraVideo').play();
    }catch(err){el('cameraError').textContent='Camera access failed. Please allow camera permissions, or use the phone camera button instead.';}
    finally{cameraOpening=false;}
  }
  el('liveCamButton').addEventListener('click',()=>{el('cameraOverlay').classList.remove('hidden');document.body.style.overflow='hidden';startCamera();});
  function closeCamera(){el('cameraOverlay').classList.add('hidden');document.body.style.overflow='';stopCamera();}
  el('closeCamera').addEventListener('click',closeCamera);
  el('flipCamera').addEventListener('click',()=>{facing=facing==='environment'?'user':'environment';startCamera();});
  el('shutterButton').addEventListener('click',async()=>{
    const video=el('cameraVideo'),btn=el('shutterButton');
    if(!stream||!video.videoWidth){el('cameraError').textContent='Camera is not ready yet.';return;}
    btn.disabled=true;
    try{
      const limit=Math.max(1000,Math.min(3200,Number(cfg.maxImageDimension)||2200));
      const scale=Math.min(1,limit/Math.max(video.videoWidth,video.videoHeight));
      const canvas=document.createElement('canvas');canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);
      canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
      const blob=await canvasToBlob(canvas);
      closeCamera();await addPhoto(blob);
    }catch(err){el('cameraError').textContent=err.message||'Something went wrong. Try again.';}
    finally{btn.disabled=false;}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&stream)closeCamera();});
  window.addEventListener('online',()=>{
    for(const rec of data.values())if(rec.status==='failed'&&rec.error==='Upload timed out')rec.status='pending';
    uploadPending();
  });
  loadRecords();
})();
