
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data=null,category=0,cart={},searchTerm='';
// Support both /bca-momo-wala and the original /shop.html?slug=bca-momo-wala.
const params=new URLSearchParams(location.search);
const slug=params.get('slug')||decodeURIComponent(location.pathname.replace(/^\/+|\/+$/g,'')).toLowerCase();
const trackedProductViews=new Set();
function trackShowroomEvent(type,productId){
 if(!data)return;
 const payload={slug:data.shop.slug,type};
 if(type==='product_view')payload.product_id=Number(productId);
 fetch('/api/app.php?action=track-event',{
  method:'POST',credentials:'same-origin',
  headers:{'Content-Type':'application/json','X-CSRF-Token':data.csrf},
  body:JSON.stringify(payload)
 }).catch(()=>{});
}
function observeProductViews(){
 if(!('IntersectionObserver' in window))return;
 const observer=new IntersectionObserver((entries,watcher)=>{
  for(const entry of entries){
   if(!entry.isIntersecting)continue;
   const productId=Number(entry.target.dataset.productView);
   if(productId&&!trackedProductViews.has(productId)){
    trackedProductViews.add(productId);trackShowroomEvent('product_view',productId);
   }
   watcher.unobserve(entry.target);
  }
 },{threshold:0.5});
 document.querySelectorAll('[data-product-view]').forEach(card=>{
  if(!trackedProductViews.has(Number(card.dataset.productView)))observer.observe(card);
 });
}
function count(){const picks=Object.entries(cart).filter(([id,qty])=>qty>0),qty=picks.reduce((n,[,q])=>n+q,0);let total=0,missing=false;picks.forEach(([id,q])=>{const p=data.products.find(x=>x.id==id);if(p){if(p.price===null)missing=true;else total+=Number(p.price)*q;}});$('selectedCount').textContent=qty?qty+' items selected':'No items selected';$('selectedTotal').textContent=qty?(missing?'Price on request for some items':'Estimated total ₹'+total.toFixed(2)):'Select products to enquire';}

function render(){
 document.title=data.shop.name+' | Digital Showroom';
 const shop=data.shop;
 const palette=['#E83F7E','#1D4ED8','#0F766E','#6D28D9','#9A3412','#334155'];
 const colour=String(shop.theme_color||'#E83F7E').toUpperCase();
 document.body.style.setProperty('--shop-accent',palette.includes(colour)?colour:'#E83F7E');
 const logo=shop.logo_url?'<img class="shop-logo" src="'+esc(shop.logo_url)+'" alt="'+esc(shop.name)+' logo">':'<div class="shop-logo-fallback" aria-hidden="true">🏬</div>';
 const address=shop.address?'<span class="shop-contact-line">⌖ '+esc(shop.address)+'</span>':'';
 const phone=String(shop.phone||'').replace(/\D/g,'');
 const wa=phone.length>=10?'<a class="shop-contact-line shop-contact-link" href="https://wa.me/'+(phone.length===10?'91'+phone:phone)+'" target="_blank" rel="noopener noreferrer" aria-label="Chat with '+esc(shop.name)+' on WhatsApp">◉ WhatsApp: '+esc(shop.phone)+'</a>':'';
 $('shopHeader').innerHTML='<div class="shop-header-inner">'+logo+'<div class="shop-identity"><h1>'+esc(shop.name)+'</h1>'+(shop.tagline?'<p>'+esc(shop.tagline)+'</p>':'')+'</div><div class="shop-contact">'+address+wa+'</div></div>';
 $('filter').innerHTML='<button type="button" class="'+(!category?'active':'')+'" data-category="0">All Products</button>'+data.categories.map(c=>'<button type="button" class="'+(category==c.id?'active':'')+'" data-category="'+Number(c.id)+'">'+esc(c.name)+'</button>').join('');
 const shown=data.products.filter(p=>(!category||p.category_id==category)&&(!searchTerm||[p.name,p.description].some(v=>String(v||'').toLocaleLowerCase().includes(searchTerm))));
 const countNode=$('productCount');if(countNode)countNode.textContent=shown.length+' product'+(shown.length===1?'':'s');
 $('products').innerHTML=shown.length?shown.map(p=>{
  const qty=Number(cart[p.id]||0);
  const images=Array.isArray(p.images)&&p.images.length?p.images:(p.image_url?[p.image_url]:[]);
  const picture=images.length?'<img class="product-main-photo" src="'+esc(images[0])+'" alt="'+esc(p.name)+'" loading="lazy">':'<div class="shop-product-placeholder" aria-hidden="true">▧</div>';
  const gallery=images.length>1?'<div class="shop-photo-thumbs">'+images.map((url,i)=>'<button type="button" class="shop-photo-thumb '+(!i?'selected':'')+'" data-image="'+esc(url)+'" aria-label="View photo '+(i+1)+' of '+esc(p.name)+'"><img src="'+esc(url)+'" alt="" loading="lazy"></button>').join('')+'</div>':'';
  const price=p.price===null?'On request':'₹'+Number(p.price).toFixed(2);
  return '<article class="product-card'+(qty?' product-selected':'')+'" data-product-view="'+Number(p.id)+'">'+
   '<div class="product-photo-display">'+picture+(gallery||'')+'</div>'+
   '<div class="details"><h3>'+esc(p.name)+'</h3>'+(p.description?'<p class="product-description">'+esc(p.description)+'</p>':'')+
   '<p class="shop-product-price"><strong>'+price+'</strong><span> / '+esc(p.unit||'Piece')+'</span></p>'+
   '<div class="product-pick-row"><span class="product-qty-label">Quantity</span><div class="product-qty-stepper">'+
   '<button type="button" data-dec="'+Number(p.id)+'" aria-label="Decrease '+esc(p.name)+' quantity">−</button>'+
   '<output aria-label="'+esc(p.name)+' quantity">'+qty+'</output>'+
   '<button type="button" data-inc="'+Number(p.id)+'" aria-label="Increase '+esc(p.name)+' quantity">+</button></div></div></div></article>';
 }).join(''):'<div class="shop-empty-products">No products match your selection.</div>';
 document.querySelectorAll('.shop-photo-thumb').forEach(button=>button.onclick=()=>{
  const frame=button.closest('.product-photo-display'),main=frame?.querySelector('.product-main-photo');
  if(!main)return;
  main.src=button.dataset.image;
  frame.querySelectorAll('.shop-photo-thumb').forEach(t=>t.classList.toggle('selected',t===button));
 });
 document.querySelectorAll('[data-category]').forEach(button=>button.onclick=()=>{category=Number(button.dataset.category);render();});
 document.querySelectorAll('[data-inc]').forEach(button=>button.onclick=()=>{cart[button.dataset.inc]=(cart[button.dataset.inc]||0)+1;render();});
 document.querySelectorAll('[data-dec]').forEach(button=>button.onclick=()=>{cart[button.dataset.dec]=Math.max(0,(cart[button.dataset.dec]||0)-1);render();});
 count();observeProductViews();
}
const searchInput=$('shopSearch');
if(searchInput)searchInput.addEventListener('input',()=>{searchTerm=searchInput.value.trim().toLocaleLowerCase();if(data)render();});
let enquiryPending=false,enquiryQuote=false;
const enquiryDialog=$('enquiryDialog'),enquiryForm=$('enquiryForm');
function openCustomerDetails(quote){
 if(!data||enquiryPending)return;
 const chosen=data.products.filter(p=>Number(cart[p.id]||0)>0);
 if(!chosen.length){alert('Please select at least one product.');return;}
 const phone=String(data.shop.phone||'').replace(/\D/g,'');
 if(phone.length<10){alert('Shop WhatsApp number is unavailable.');return;}
 enquiryQuote=quote;
 trackShowroomEvent('whatsapp_click');
 $('enquiryDialogTitle').textContent=quote?'Customer Details — Quotation':'Customer Details — Order';
 $('enquiryMessage').hidden=true;$('enquiryMessage').textContent='';
 if(typeof enquiryDialog.showModal==='function')enquiryDialog.showModal();
 else enquiryDialog.setAttribute('open','');
 $('customerName').focus();
}
function closeCustomerDetails(){
 if(enquiryPending)return;
 if(typeof enquiryDialog.close==='function')enquiryDialog.close();
 else enquiryDialog.removeAttribute('open');
}
$('enquiryClose').onclick=closeCustomerDetails;
$('enquiryCancel').onclick=closeCustomerDetails;
$('customerMobile').addEventListener('input',event=>{
 const cleaned=event.target.value.replace(/\D/g,'').slice(0,10);
 if(cleaned!==event.target.value)event.target.value=cleaned;
});
enquiryForm.addEventListener('submit',async event=>{
 event.preventDefault();
 if(enquiryPending||!data)return;
 const name=$('customerName').value.trim().replace(/\s+/g,' ');
 const mobile=$('customerMobile').value.trim();
 const error=$('enquiryMessage');
 const showError=msg=>{error.textContent=msg;error.hidden=false;};
 if(!name||name.length>120){showError('Enter a valid customer name.');return;}
 if(!/^[0-9]{10}$/.test(mobile)){showError('Enter a valid 10-digit mobile number.');return;}
 const chosen=data.products.filter(p=>Number(cart[p.id]||0)>0);
 if(!chosen.length){showError('Please select at least one product.');return;}
 const phone=String(data.shop.phone||'').replace(/\D/g,'');
 if(phone.length<10){showError('Shop WhatsApp number is unavailable.');return;}
 const number=phone.length===10?'91'+phone:phone;
 const lines=chosen.map(p=>({id:Number(p.id),quantity:Number(cart[p.id])}));
 const details=chosen.map(p=>'- '+p.name+' × '+cart[p.id]+' '+(p.unit||'Piece')+(p.price!==null?' (₹'+(Number(p.price)*cart[p.id]).toFixed(2)+')':' (price on request)')).join('\n');
 const amount=chosen.reduce((sum,p)=>sum+(p.price===null?0:Number(p.price)*cart[p.id]),0);
 const tab=window.open('about:blank','_blank');
 enquiryPending=true;error.hidden=true;
 const submit=$('enquiryContinue');
 submit.disabled=true;submit.textContent='Saving Enquiry...';
 try{
  const response=await fetch('/api/app.php?action=public-enquiry',{
   method:'POST',credentials:'same-origin',
   headers:{'Content-Type':'application/json','X-CSRF-Token':data.csrf},
   body:JSON.stringify({
    slug:data.shop.slug,kind:enquiryQuote?'quotation':'order',items:lines,
    customer_name:name,customer_mobile:mobile
   })
  });
  const result=await response.json();
  if(!response.ok||!result.ok)throw Error(result.error||'Could not save enquiry.');
  const message=(enquiryQuote?'Hello, I would like a quotation for:':'Hello, I would like to order:')+
   '\n'+details+'\n'+(chosen.every(p=>p.price!==null)?'Estimated total: ₹'+amount.toFixed(2)+'\n':'')+
   'Customer: '+name+'\nMobile: '+mobile+'\nShop: '+data.shop.name+'\nEnquiry Ref: '+result.enquiry_id;
  const url='https://wa.me/'+number+'?text='+encodeURIComponent(message);
  if(typeof enquiryDialog.close==='function')enquiryDialog.close();
  else enquiryDialog.removeAttribute('open');
  if(tab&&!tab.closed)tab.location.href=url;
  else window.location.href=url;
 }catch(e){
  if(tab&&!tab.closed)tab.close();
  showError(e.message||'Could not save enquiry. Please try again.');
 }finally{
  enquiryPending=false;submit.disabled=false;submit.textContent='Continue to WhatsApp';
 }
});
$('orderBtn').onclick=()=>openCustomerDetails(false);
$('quoteBtn').onclick=()=>openCustomerDetails(true);
fetch('/api/app.php?action=public&slug='+encodeURIComponent(slug),{credentials:'same-origin'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'Shop unavailable');data=d;render();trackShowroomEvent('visit')}).catch(e=>{$('shopHeader').innerHTML='<h1>Shop unavailable</h1>';$('shopError').innerHTML='<p class="notice error">'+esc(e.message)+'</p>'});
