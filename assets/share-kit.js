/* Share Kit: seller-side promotional graphics. Reuses existing WhatsApp Status Maker. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const state={shop:null,products:[],type:'poster',style:'classic',product:'',logo:true,phone:true,tagline:true,generation:0,canvas:null};
const sizes={poster:[1080,1520],card:[1200,675],social:[1080,1080]};
const palettes={classic:['#0B438B','#E8F2FF'],modern:['#0F766E','#E6F8F1'],minimal:['#111827','#F8FAFC']};
function note(s,error=false){const e=$('shareKitMessage');if(e){e.textContent=s;e.classList.toggle('status-error',error);}}
function img(src){return new Promise(resolve=>{if(!src)return resolve(null);const im=new Image();im.crossOrigin='anonymous';const timer=setTimeout(()=>resolve(null),5000);im.onload=()=>{clearTimeout(timer);resolve(im)};im.onerror=()=>{clearTimeout(timer);resolve(null)};im.src=src;});}
function text(ctx,s,x,y,width,size,color='#111827',weight=700,align='center',maxLines=2){
 ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.font=weight+' '+size+'px Arial, sans-serif';
 const words=String(s||'').split(/\s+/).filter(Boolean),rows=[];let line='';
 for(const w of words){let next=line?line+' '+w:w;if(ctx.measureText(next).width>width&&line){rows.push(line);line=w;}else line=next;}if(line)rows.push(line);
 for(const [i,row] of rows.slice(0,maxLines).entries()){let r=row;while(ctx.measureText(r).width>width&&r.length>1)r=r.slice(0,-1);ctx.fillText(r,x,y+i*size*1.18);}
}
function rect(ctx,x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function contain(ctx,image,x,y,w,h){if(!image)return;const scale=Math.min(w/image.naturalWidth,h/image.naturalHeight);ctx.drawImage(image,x+(w-image.naturalWidth*scale)/2,y+(h-image.naturalHeight*scale)/2,image.naturalWidth*scale,image.naturalHeight*scale);}
function crop(ctx,image,x,y,w,h){if(!image)return;const scale=Math.max(w/image.naturalWidth,h/image.naturalHeight),sw=w/scale,sh=h/scale;ctx.drawImage(image,(image.naturalWidth-sw)/2,(image.naturalHeight-sh)/2,sw,sh,x,y,w,h);}
function qrCanvas(url){
 if(typeof QRCode!=='function')throw Error('QR generator unavailable. Please refresh.');
 const el=document.createElement('div');el.style.cssText='position:fixed;left:-9999px;top:0;';document.body.append(el);
 try{new QRCode(el,{text:url,width:450,height:450,colorDark:'#111827',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.H});
 const canvas=el.querySelector('canvas');if(!canvas)throw Error('Could not generate QR code');const copy=document.createElement('canvas');copy.width=450;copy.height=450;copy.getContext('2d').drawImage(canvas,0,0);return copy;}
 finally{el.remove();}
}
async function draw(){
 const out=$('shareKitPreview');
 if(!state.shop||!out)return;
 state.canvas=null;
 const actions=['shareKitDownload','shareKitPrint','shareKitEnlarge'].map($);
 actions.forEach(button=>{button.disabled=true;});
 note('Generating preview…');
const version=++state.generation,kind=state.type,[w,h]=sizes[kind],shop=state.shop;
 const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');const [accent,pale]=palettes[state.style];
 x.fillStyle=pale;x.fillRect(0,0,w,h);
 const logo=state.logo?await img(shop.logo_url):null;
 const product=state.products.find(p=>String(p.id)===state.product)||state.products.find(p=>+p.active);
 const photo=kind==='social'?await img(product?.images?.[0]||product?.image_url):null;
 if(version!==state.generation||out!==$('shareKitPreview'))return;
 const url=location.origin+'/'+encodeURIComponent(shop.slug);
 const qr=qrCanvas(url);
 if(kind==='poster'){
   rect(x,0,0,w,212,0,accent);
   if(logo){rect(x,55,38,130,130,18,'#ffffff');contain(x,logo,65,48,110,110);}
   text(x,shop.name,logo?605:540,75,logo?770:950,58,'#ffffff',800);
   if(state.tagline&&shop.tagline)text(x,shop.tagline,logo?605:540,172,logo?770:940,29,'#ffffff',500,'center',1);
   rect(x,75,280,930,980,32,'#ffffff');
   x.imageSmoothingEnabled=false;
   x.drawImage(qr,240,415,600,600);
   x.imageSmoothingEnabled=true;
   text(x,'Scan to view our showroom',540,1125,850,49,accent,800);
   if(state.phone&&shop.phone)text(x,'WhatsApp: '+shop.phone,540,1335,940,36,accent,700);
   text(x,url,540,1415,980,27,'#334155',500);
 }else if(kind==='card'){
   rect(x,0,0,1200,675,0,pale);rect(x,0,0,735,675,0,accent);
   if(logo){rect(x,65,60,135,135,24,'#ffffff');contain(x,logo,76,71,115,115);}
   text(x,shop.name,370,258,610,56,'#ffffff',800);
   if(state.tagline&&shop.tagline)text(x,shop.tagline,365,352,590,30,'#ffffff',500);
   if(state.phone&&shop.phone)text(x,'WhatsApp: '+shop.phone,365,475,600,36,'#ffffff',700);
   rect(x,785,135,335,335,20,'#ffffff');x.drawImage(qr,815,165,275,275);
   text(x,'SCAN TO SHOP',950,510,320,29,accent,800);
   text(x,shop.slug,950,570,330,22,'#334155',500);
 }else{
   rect(x,0,0,w,175,0,accent);
   text(x,shop.name,540,86,970,60,'#ffffff',800);
   if(photo){rect(x,80,220,920,575,24,'#ffffff');x.save();x.beginPath();x.roundRect(98,238,884,539,18);x.clip();crop(x,photo,98,238,884,539);x.restore();}
   else{rect(x,80,220,920,575,24,'#ffffff');text(x,'Explore our products',540,495,820,60,accent,800);}
   text(x,product?.name||'Explore our showroom',380,852,660,44,accent,800);
   if(product){const price=product.price===null?'Price on request':'₹'+Number(product.price).toFixed(2);text(x,price,380,930,660,36,'#334155',700);}
   rect(x,775,818,240,240,16,'#ffffff');x.drawImage(qr,791,835,208,208);
   if(state.phone&&shop.phone)text(x,'WhatsApp: '+shop.phone,355,1010,650,30,accent,700);
 }
 const branding='Made with Digital Showroom';
 if(kind==='poster'){rect(x,0,1464,w,56,0,accent);text(x,branding,540,1492,900,25,'#ffffff',600);}
 else if(kind==='card'){text(x,branding,954,642,415,18,accent,600);}
 else{text(x,branding,365,1060,680,20,'#64748b',600);}
 state.canvas=c;
 const picture=document.createElement('img');
 picture.src=c.toDataURL('image/png');
 picture.alt='Generated '+kind+' preview';
 picture.className='share-kit-preview-image';
 out.replaceChildren(picture);
 actions.forEach(button=>{button.disabled=false;});
 note('');
}
function init(type,shop,products){
 Object.assign(state,{type,shop,products:products||[],product:'',canvas:null});
 bind();
 draw().catch(e=>note(e.message,true));
}
function bind(){
 for(const input of document.querySelectorAll('[name="shareKitStyle"]')){
  input.checked=input.value===state.style;
  input.onchange=()=>{state.style=input.value;draw().catch(e=>note(e.message,true));};
 }
 $('shareKitEnlarge').onclick=()=>{
  $('shareKitLargeImage').src=$('shareKitPreview').firstElementChild.src;
  $('shareKitDialog').showModal();
 };
 const product=$('shareKitProduct');if(product)product.onchange=()=>{state.product=product.value;draw().catch(e=>note(e.message,true));};
 for(const [id,key] of [['shareKitLogo','logo'],['shareKitPhone','phone'],['shareKitTagline','tagline']]){const e=$(id);if(e){e.checked=state[key];e.onchange=()=>{state[key]=e.checked;draw().catch(err=>note(err.message,true));};}}
 const png=$('shareKitDownload');if(png)png.onclick=()=>{if(!state.canvas)return note('Generate the design first.',true);const filename='digital-showroom-'+state.type+'-'+state.shop.slug+'.png';state.canvas.toBlob(blob=>{if(!blob)return note('PNG export failed.',true);const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);},'image/png');};
 const pdf=$('shareKitPrint');if(pdf)pdf.onclick=()=>{if(!state.canvas)return note('Generate the design first.',true);const win=window.open('','_blank');if(!win)return note('Allow pop-ups to save as PDF.',true);const url=state.canvas.toDataURL('image/png');win.document.write('<!doctype html><html><head><title>Share Kit - Print or Save PDF</title><style>@page{size:auto;margin:0}body{margin:0;display:grid;place-items:center}img{max-width:100%;max-height:99vh;object-fit:contain}</style></head><body><img src="'+url+'" onload="setTimeout(()=>window.print(),300)"></body></html>');win.document.close();};
}
window.ShareKit={init};
})();
