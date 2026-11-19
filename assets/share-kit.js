/* Digital Showroom Share Kit — local QRCodeJS + browser Canvas, no network QR service. */
(function(){
 'use strict';
 const state={shop:null,url:'',generation:0,qr:null};
 const $=id=>document.getElementById(id);
 const colors=['#E83F7E','#1D4ED8','#0F766E','#6D28D9','#9A3412','#334155'];
 const accent=()=>colors.includes(String(state.shop?.theme_color||'').toUpperCase())?state.shop.theme_color:'#E83F7E';
 const esc=x=>String(x||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
 function rect(ctx,x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
 function txt(ctx,text,x,y,max,font,color){
  ctx.fillStyle=color;ctx.font=font;ctx.textBaseline='middle';
  const words=String(text||'').split(/\s+/);let line='';
  for(const word of words){
   const next=line?line+' '+word:word;
   if(ctx.measureText(next).width>max&&line){ctx.fillText(line,x,y);y+=parseInt(font.match(/\d+/)?.[0]||'20')*1.25;line=word;}
   else line=next;
  }
  if(line)ctx.fillText(line,x,y);
 }
 function imageLoad(url){
  return new Promise(resolve=>{
   if(!url){resolve(null);return;}
   const image=new Image();image.crossOrigin='anonymous';let done=false;
   const complete=picture=>{if(done)return;done=true;clearTimeout(timer);resolve(picture);};
   const timer=setTimeout(()=>complete(null),2500);
   image.onload=()=>complete(image);image.onerror=()=>complete(null);image.src=url;
  });
 }
 function logo(ctx,img,x,y,size){
  if(!img)return;
  const width=img.naturalWidth||img.width,height=img.naturalHeight||img.height;
  if(!width||!height)return;
  const scale=Math.min(size/width,size/height);
  ctx.drawImage(img,x+(size-width*scale)/2,y+(size-height*scale)/2,width*scale,height*scale);
 }
 function drawQr(ctx,source,x,y,size){
  // Keep a full white quiet zone of at least 4 modules for reliable scanning.
  const pad=Math.round(size*0.075);
  rect(ctx,x,y,size,size,'#FFFFFF');
  ctx.drawImage(source,x+pad,y+pad,size-pad*2,size-pad*2);
 }
 function createQr(){
  return new Promise((resolve,reject)=>{
   if(typeof QRCode==='undefined'){reject(Error('QR library could not load.'));return;}
   const host=document.createElement('div');
   host.style.cssText='position:fixed;left:-10000px;top:-10000px;opacity:0;pointer-events:none';
   document.body.appendChild(host);
   try{
    new QRCode(host,{text:state.url,width:600,height:600,colorDark:'#101D32',colorLight:'#FFFFFF',correctLevel:QRCode.CorrectLevel.M});
    const source=host.querySelector('canvas');
    if(source){const copy=canvas(600,600);copy.getContext('2d').drawImage(source,0,0);host.remove();resolve(copy);}
    else{
     const img=host.querySelector('img');
     if(!img){host.remove();reject(Error('QR code was not generated.'));return;}
     const finish=()=>{const copy=canvas(600,600);copy.getContext('2d').drawImage(img,0,0,600,600);host.remove();resolve(copy);};
     if(img.complete&&img.naturalWidth)finish();else{img.onload=finish;img.onerror=()=>{host.remove();reject(Error('QR code could not be drawn.'));};}
    }
   }catch(e){host.remove();reject(e);}
  });
 }
 function qrCanvas(size,qr){const c=canvas(size,size),ctx=c.getContext('2d');drawQr(ctx,qr,0,0,size);return c;}
 async function posterCanvas(width,height,qr){
  const c=canvas(width,height),ctx=c.getContext('2d');const k=width/1000;ctx.scale(k,k);
  const h=height/k;
  rect(ctx,0,0,1000,h,'#FFFFFF');
  rect(ctx,0,0,1000,405,accent());
  const img=await imageLoad(state.shop.logo_url);
  if(img){rect(ctx,435,65,130,130,'#FFFFFF');try{logo(ctx,img,445,75,110);}catch(e){}}
  ctx.textAlign='center';
  txt(ctx,state.shop.name,500,260,850,'bold 66px Arial','#FFFFFF');
  if(state.shop.tagline)txt(ctx,state.shop.tagline,500,350,810,'30px Arial','#FFFFFF');
  drawQr(ctx,qr,150,550,700);
  ctx.fillStyle='#152E4B';ctx.font='bold 54px Arial';ctx.fillText('Scan to Explore Our Shop',500,1410);
  ctx.fillStyle='#48627D';ctx.font='32px Arial';ctx.fillText('View products and enquire on WhatsApp',500,1490);
  ctx.fillStyle=accent();ctx.font='bold 35px Arial';ctx.fillText(state.shop.phone||'',500,1600);
  ctx.fillStyle='#294661';ctx.font='24px Arial';ctx.fillText(state.url,500,h-140);
  if(state.shop.address)txt(ctx,state.shop.address,500,h-80,850,'24px Arial','#294661');
  return c;
 }
 async function cardCanvas(width,height,qr){
  const c=canvas(width,height),ctx=c.getContext('2d');const k=width/1200;ctx.scale(k,k);
  rect(ctx,0,0,1200,675,'#FFFFFF');rect(ctx,0,0,34,675,accent());
  rect(ctx,34,0,1166,125,accent());
  const img=await imageLoad(state.shop.logo_url);
  if(img){rect(ctx,77,159,126,126,'#FFFFFF');try{logo(ctx,img,85,167,110);}catch(e){}}
  txt(ctx,state.shop.name,80,71,1010,'bold 51px Arial','#FFFFFF');
  txt(ctx,state.shop.tagline||'Visit Our Digital Showroom',80,335,690,'30px Arial','#304D6A');
  txt(ctx,'WhatsApp: '+(state.shop.phone||''),80,413,690,'bold 32px Arial','#0A3359');
  if(state.shop.address)txt(ctx,state.shop.address,80,477,700,'25px Arial','#47627E');
  const urlLabel=state.url.length>53?state.url.slice(0,50)+'…':state.url;
  txt(ctx,urlLabel,80,598,790,'25px Arial',accent());
  drawQr(ctx,qr,842,180,290);
  ctx.font='bold 24px Arial';ctx.fillStyle='#233F5A';ctx.textAlign='center';ctx.fillText('Scan to Shop',987,506);
  return c;
 }
 function preview(target,c){
  const holder=$(target);if(!holder)return;
  holder.replaceChildren();const img=document.createElement('img');img.alt=target==='shareQrPreview'?'Your shop QR code':'Preview of your shop promotion';img.src=c.toDataURL('image/png');holder.appendChild(img);
 }
 function download(blob,name){
  const link=document.createElement('a'),url=URL.createObjectURL(blob);
  link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),15000);
 }
 function blobFor(c,type='image/png',quality=0.95){return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('Could not create image')),type,quality));}
 function jpegPdf(jpeg,width,height){
  // One-page A4 PDF using a JPEG XObject; no external PDF service or script.
  const encoder=new TextEncoder(),enc=s=>encoder.encode(s);
  const chunks=[],offsets=[0];let size=0;
  const add=x=>{chunks.push(x);size+=x.length;};
  const obj=(n,data)=>{offsets[n]=size;add(enc(n+' 0 obj\n'+data+'\nendobj\n'));};
  add(enc('%PDF-1.4\n'));
  obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
  obj(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>');
  offsets[4]=size;
  add(enc('4 0 obj\n<< /Type /XObject /Subtype /Image /Width '+width+' /Height '+height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.length+' >>\nstream\n'));
  add(jpeg);add(enc('\nendstream\nendobj\n'));
  const stream='q\n595 0 0 842 0 0 cm\n/Im1 Do\nQ\n';
  obj(5,'<< /Length '+enc(stream).length+' >>\nstream\n'+stream+'endstream');
  const xref=size;add(enc('xref\n0 6\n0000000000 65535 f \n'));
  for(let i=1;i<=5;i++)add(enc(String(offsets[i]).padStart(10,'0')+' 00000 n \n'));
  add(enc('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF'));
  return new Blob(chunks,{type:'application/pdf'});
 }
 async function render(){
  const current=++state.generation;
  const error=$('shareKitError');if(error){error.hidden=true;error.textContent='';}
  try{
   const qr=await createQr();if(current!==state.generation)return;
   state.qr=qr;preview('shareQrPreview',qrCanvas(320,qr));
   preview('sharePosterPreview',await posterCanvas(600,848,qr));
   preview('shareCardPreview',await cardCanvas(600,338,qr));
   if(current!==state.generation)return;
   document.querySelectorAll('[data-share-download]').forEach(b=>b.disabled=false);
  }catch(e){if(error){error.textContent=e.message||'Could not generate Share Kit.';error.hidden=false;}}
 }
 async function generate(kind,button){
  if(!state.qr||!state.shop)return;
  button.disabled=true;const previous=button.textContent;button.textContent='Preparing...';
  try{
   const filename=String(state.shop.slug||'shop').replace(/[^a-z0-9-]/g,'-');
   if(kind==='qr')download(await blobFor(qrCanvas(1000,state.qr)),filename+'-qr.png');
   else if(kind==='poster'||kind==='poster-pdf'){
    const c=await posterCanvas(2480,3508,state.qr);
    if(kind==='poster-pdf'){const blob=await blobFor(c,'image/jpeg',0.94);download(jpegPdf(new Uint8Array(await blob.arrayBuffer()),2480,3508),filename+'-poster.pdf');}
    else download(await blobFor(c),filename+'-poster.png');
   }else if(kind==='card')download(await blobFor(await cardCanvas(1200,675,state.qr)),filename+'-business-card.png');
  }catch(e){const error=$('shareKitError');if(error){error.textContent=e.message||'Download failed';error.hidden=false;}}
  finally{button.disabled=false;button.textContent=previous;}
 }
 window.ShareKit={
  init(shop,url){
   if(!shop||!url)return;
   state.shop=shop;state.url=url;state.qr=null;
   document.querySelectorAll('[data-share-download]').forEach(button=>{button.disabled=true;button.onclick=()=>generate(button.dataset.shareDownload,button);});
   const copy=$('shareCopyLink');if(copy)copy.onclick=async()=>{try{await navigator.clipboard.writeText(url);copy.textContent='Copied';setTimeout(()=>{if(copy.isConnected)copy.textContent='Copy Shop Link';},1700);}catch(e){const error=$('shareKitError');if(error){error.hidden=false;error.textContent='Copy is unavailable in this browser.';}}};
   const label=$('shareKitShopUrl');if(label)label.textContent=url;
   render();
  }
 };
})();
