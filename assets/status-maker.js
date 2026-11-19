/* WhatsApp Status Maker — branded, local PNG generation without external services. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const state={shop:null,products:[],drawn:[],generation:0};
const W=1080,H=1920;
const palette=['#E83F7E','#1D4ED8','#0F766E','#6D28D9','#9A3412','#334155'];
function color(){const c=String(state.shop?.theme_color||'').toUpperCase();return palette.includes(c)?c:'#E83F7E';}
function contrast(hex){const n=parseInt(hex.slice(1),16);const l=0.2126*((n>>16)&255)+0.7152*((n>>8)&255)+0.0722*(n&255);return l>170?'#132238':'#FFFFFF';}
function tell(message,isError=false){
 const node=$('statusGeneratorMessage');if(!node)return;node.textContent=message;node.classList.toggle('status-error',isError);
}
function loadImage(src){
 return new Promise(resolve=>{
  if(!src){resolve(null);return;}
  const img=new Image();img.crossOrigin='anonymous';let completed=false;
  const finish=result=>{if(completed)return;completed=true;clearTimeout(timer);resolve(result);};
  const timer=setTimeout(()=>finish(null),4000);
  img.onload=()=>finish(img);img.onerror=()=>finish(null);img.src=src;
 });
}
function cover(ctx,img,x,y,w,h){
 const iw=img.naturalWidth,ih=img.naturalHeight;if(!iw||!ih)return;
 const ratio=Math.max(w/iw,h/ih),sw=w/ratio,sh=h/ratio;
 ctx.drawImage(img,(iw-sw)/2,(ih-sh)/2,sw,sh,x,y,w,h);
}
function contain(ctx,img,x,y,w,h){
 const iw=img.naturalWidth,ih=img.naturalHeight;if(!iw||!ih)return;
 const r=Math.min(w/iw,h/ih);ctx.drawImage(img,x+(w-iw*r)/2,y+(h-ih*r)/2,iw*r,ih*r);
}
function round(ctx,x,y,w,h,r,fill){
 ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();
}
function font(ctx,size,weight='600',family='Arial'){ctx.font=weight+' '+size+'px '+family;ctx.textBaseline='middle';}
function fit(ctx,text,maxWidth,defaultSize,min=27,weight='700'){
 let size=defaultSize;do{font(ctx,size,weight);if(ctx.measureText(String(text)).width<=maxWidth||size<=min)break;size-=2;}while(size>min);
 return size;
}
function lines(ctx,value,x,y,maxWidth,lineHeight,maxLines,fill,baseSize,align='left',weight='700'){
 const words=String(value||'').trim().split(/\s+/).filter(Boolean),out=[];let line='';
 font(ctx,baseSize,weight);for(const word of words){
  const next=line?line+' '+word:word;
  if(ctx.measureText(next).width>maxWidth&&line){out.push(line);line=word;}else line=next;
 }if(line)out.push(line);
 const actual=out.slice(0,maxLines);
 if(out.length>maxLines&&actual.length){let last=actual[actual.length-1];while(last.length>1&&ctx.measureText(last+'…').width>maxWidth)last=last.slice(0,-1);actual[actual.length-1]=last+'…';}
 ctx.textAlign=align;ctx.fillStyle=fill;actual.forEach((l,i)=>ctx.fillText(l,x,y+i*lineHeight));return actual.length;
}
function badge(ctx,x,y,text,fg,bg){
 const size=31;round(ctx,x,y-25,Math.min(750,text.length*size*.57+46),53,24,bg);
 font(ctx,size,'700');ctx.fillStyle=fg;ctx.textAlign='left';ctx.fillText(text,x+23,y+2);
}
async function renderProduct(product,template,size){
 const c=document.createElement('canvas');c.width=size==='full'?W:360;c.height=size==='full'?H:640;
 const ctx=c.getContext('2d');ctx.scale(c.width/W,c.height/H);
 const accent=color(),ink='#102A46',shop=state.shop||{};
 const photoSrc=product.image_url||(Array.isArray(product.images)?product.images[0]:null);
 const [image,logo]=await Promise.all([loadImage(photoSrc),loadImage(shop.logo_url)]);
 const price=product.price===null||product.price===''||product.price===undefined?'Price on request':'₹'+Number(product.price).toFixed(2);
 // Draw the preview/download from the same deterministic layout and colours.
 if(template==='modern'){
  ctx.fillStyle='#F5F8FE';ctx.fillRect(0,0,W,H);
  round(ctx,38,35,1004,180,38,accent);
  lines(ctx,shop.name||'Our Shop',82,118,920,73,1,contrast(accent),58,'left','700');
  if(shop.tagline)lines(ctx,shop.tagline,83,183,880,42,1,contrast(accent),29,'left','400');
  round(ctx,39,245,1002,1025,42,'#FFFFFF');
  if(image){ctx.save();ctx.beginPath();ctx.roundRect(58,264,964,987,32);ctx.clip();cover(ctx,image,58,264,964,987);ctx.restore();}
  else{round(ctx,76,289,928,910,28,'#E5ECF6');lines(ctx,'PRODUCT PHOTO',540,750,750,60,1,'#72859D',51,'center');}
  round(ctx,38,1308,1004,540,36,'#FFFFFF');
  badge(ctx,82,1374,'FEATURED PRODUCT',accent,'#EEF2FA');
  lines(ctx,product.name,82,1471,904,89,3,ink,72,'left');
  lines(ctx,price,83,1710,890,80,1,accent,62,'left');
  round(ctx,69,1760,940,71,23,accent);
  lines(ctx,'WhatsApp '+(shop.phone||''),540,1797,890,55,1,contrast(accent),38,'center');
 }else if(template==='minimal'){
  ctx.fillStyle='#FFFFFF';ctx.fillRect(0,0,W,H);
  ctx.fillStyle=accent;ctx.fillRect(66,74,948,8);
  lines(ctx,shop.name||'Our Shop',68,145,940,79,2,ink,58,'left');
  if(shop.tagline)lines(ctx,shop.tagline,70,223,925,43,1,'#718198',30,'left','400');
  if(image){contain(ctx,image,75,310,930,1010);}
  else{round(ctx,75,315,930,985,8,'#F2F5F8');lines(ctx,'PRODUCT PHOTO',540,780,680,50,1,'#8091A1',43,'center');}
  ctx.fillStyle='#E5EBF2';ctx.fillRect(70,1395,940,2);
  lines(ctx,product.name,75,1472,930,90,3,ink,73,'left');
  lines(ctx,price,75,1686,930,76,1,accent,60,'left');
  ctx.fillStyle=accent;ctx.fillRect(73,1780,6,85);
  lines(ctx,'WhatsApp: '+(shop.phone||''),102,1824,870,57,1,ink,40,'left');
 }else{
  ctx.fillStyle='#FFF';ctx.fillRect(0,0,W,H);
  ctx.fillStyle=accent;ctx.fillRect(0,0,W,340);
  const white=contrast(accent);
  lines(ctx,shop.name||'Our Shop',66,116,947,86,2,white,70,'left');
  if(shop.tagline)lines(ctx,shop.tagline,69,249,890,53,1,white,34,'left','400');
  round(ctx,44,372,992,1130,28,'#F3F6FB');
  if(image){ctx.save();ctx.beginPath();ctx.roundRect(59,388,962,1100,21);ctx.clip();contain(ctx,image,59,388,962,1100);ctx.restore();}
  else lines(ctx,'PRODUCT PHOTO',540,880,750,50,1,'#8192A6',50,'center');
  lines(ctx,product.name,68,1590,936,90,3,ink,75,'left');
  lines(ctx,price,68,1741,924,74,1,accent,60,'left');
  round(ctx,43,1811,995,79,12,accent);
  lines(ctx,'Order on WhatsApp: '+(shop.phone||''),540,1851,930,62,1,white,36,'center');
 }
 // Small shop logo in a protected corner, never stretched or substituted.
 if(logo){
  round(ctx,886,29,150,144,19,'#FFFFFF');
  contain(ctx,logo,895,35,132,130);
 }
 return c;
}
function makeDownload(canvas,name){
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Image export failed')),'image/png'));
}
function saveBlob(blob,filename){
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),15000);
}
function slug(text){return String(text||'product').toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'')||'product';}
async function downloadProduct(product,template,button){
 button.disabled=true;const text=button.textContent;button.textContent='Preparing...';
 try{
  const c=await renderProduct(product,template,'full');
  const blob=await makeDownload(c);
  saveBlob(blob,'whatsapp-status-'+slug(product.name)+'-'+product.id+'.png');
 }catch(e){tell('Download failed: '+e.message,true);}
 finally{button.disabled=false;button.textContent=text;}
}
async function generate(){
 const ids=[...document.querySelectorAll('.statusPick:checked')].map(input=>Number(input.value));
 if(!ids.length){tell('Select at least one product.',true);return;}
 const template=$('statusTemplate')?.value||'classic';
 const selected=state.products.filter(p=>ids.includes(Number(p.id))&&Number(p.active));
 const target=$('statusOutput'),button=$('statusGenerate');if(!target)return;
 const current=++state.generation;target.replaceChildren();button.disabled=true;tell('Generating previews...');
 for(const p of selected){
  if(current!==state.generation)return;
  try{
   const c=await renderProduct(p,template,'preview');
   if(current!==state.generation)return;
   const card=document.createElement('div');card.className='status-result-card';
   const image=document.createElement('img');image.src=c.toDataURL('image/png');image.alt='WhatsApp Status preview for '+p.name;
   const footer=document.createElement('div');footer.className='status-result-footer';
   const name=document.createElement('strong');name.textContent=p.name;
   const download=document.createElement('button');download.className='btn sm primary';download.type='button';download.textContent='Download PNG';
   download.onclick=()=>downloadProduct(p,template,download);
   footer.append(name,download);card.append(image,footer);target.append(card);
  }catch(e){tell('Unable to preview '+p.name+': '+e.message,true);}
 }
 button.disabled=false;if(current===state.generation)tell(selected.length+' image'+(selected.length===1?'':'s')+' ready to download.');
}
function init(shop,products){
 state.shop=shop;state.products=products;state.generation++;state.drawn=[];
 const all=$('statusSelectAll'),clear=$('statusClearSelection'),generateBtn=$('statusGenerate'),select=$('statusTemplate');
 if(all)all.onclick=()=>document.querySelectorAll('.statusPick').forEach(e=>e.checked=true);
 if(clear)clear.onclick=()=>{document.querySelectorAll('.statusPick').forEach(e=>e.checked=false);const output=$('statusOutput');if(output)output.replaceChildren();tell('');};
 if(generateBtn)generateBtn.onclick=generate;
 if(select)select.onchange=()=>{const output=$('statusOutput');if(output)output.replaceChildren();tell('');};
}
window.StatusMaker={init,generate};
})();