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
 if(!state.shop)return;const version=++state.generation,kind=state.type,[w,h]=sizes[kind],shop=state.shop;
 const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');const [accent,pale]=palettes[state.style];
 x.fillStyle=pale;x.fillRect(0,0,w,h);
 const logo=state.logo?await img(shop.logo_url):null;
 const product=state.products.find(p=>String(p.id)===state.product)||state.products.find(p=>+p.active);
 const photo=kind==='social'?await img(product?.images?.[0]||product?.image_url):null;
 if(version!==state.generation)return;
 const url=location.origin+'/'+encodeURIComponent(shop.slug);
 const qr=qrCanvas(url);
 if(kind==='poster'){
   rect(x,0,0,w,265,0,accent);if(logo){rect(x,50,45,175,175,20,'#ffffff');contain(x,logo,62,57,150,150);}
   text(x,shop.name,logo?620:540,105,logo?690:950,66,'#ffffff',800);
   if(state.tagline&&shop.tagline)text(x,shop.tagline,540,218,950,32,'#ffffff',500);
   rect(x,95,337,890,980,32,'#ffffff');
   text(x,'SCAN & EXPLORE',540,435,800,61,accent,800);
   x.drawImage(qr,255,525,570,570);
   text(x,'Explore our digital showroom',540,1190,840,35,'#334155',600);
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
 const out=$('shareKitPreview');if(out){out.replaceChildren();const picture=document.createElement('img');picture.src=c.toDataURL('image/png');picture.alt='Generated '+kind+' preview';picture.className='share-kit-preview-image';out.append(picture);}
 note('Preview ready. Your QR code opens your live showroom.');
}
function init(shop,products){state.shop=shop;state.products=products||[];state.product=String((products||[]).find(p=>+p.active)?.id||'');
 bind();draw().catch(e=>note(e.message,true));}
function bind(){
 const tabButtons=document.querySelectorAll('[data-share-type]');
 for(const button of tabButtons)button.onclick=()=>{state.type=button.dataset.shareType;if(state.type==='status'){if(typeof window.showShareStatus==='function')window.showShareStatus();return;}refresh();};
 const template=$('shareKitStyle');if(template)template.onchange=()=>{state.style=template.value;draw().catch(e=>note(e.message,true));};
 const product=$('shareKitProduct');if(product)product.onchange=()=>{state.product=product.value;draw().catch(e=>note(e.message,true));};
 for(const [id,key] of [['shareKitLogo','logo'],['shareKitPhone','phone'],['shareKitTagline','tagline']]){const e=$(id);if(e)e.onchange=()=>{state[key]=e.checked;draw().catch(err=>note(err.message,true));};}
 const refreshButton=$('shareKitGenerate');if(refreshButton)refreshButton.onclick=()=>draw().catch(e=>note(e.message,true));
 const png=$('shareKitDownload');if(png)png.onclick=()=>{if(!state.canvas)return note('Generate the design first.',true);state.canvas.toBlob(blob=>{if(!blob)return note('PNG export failed.',true);const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='digital-showroom-'+state.type+'-'+state.shop.slug+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);},'image/png');};
 const pdf=$('shareKitPrint');if(pdf)pdf.onclick=()=>{if(!state.canvas)return note('Generate the design first.',true);const win=window.open('','_blank');if(!win)return note('Allow pop-ups to save as PDF.',true);const url=state.canvas.toDataURL('image/png');win.document.write('<!doctype html><html><head><title>Share Kit - Print or Save PDF</title><style>@page{size:auto;margin:0}body{margin:0;display:grid;place-items:center}img{max-width:100%;max-height:99vh;object-fit:contain}</style></head><body><img src="'+url+'" onload="setTimeout(()=>window.print(),300)"></body></html>');win.document.close();};
}
function refresh(){document.querySelectorAll('[data-share-type]').forEach(b=>b.classList.toggle('active',b.dataset.shareType===state.type));const select=$('shareKitProductWrap');if(select)select.hidden=state.type!=='social';draw().catch(e=>note(e.message,true));}
window.ShareKit={init,select:type=>{state.type=type;refresh();}};
})();
