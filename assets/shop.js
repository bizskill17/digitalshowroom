
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data=null,category=0,cart={};
const slug=new URLSearchParams(location.search).get('slug')||'';
function count(){const picks=Object.entries(cart).filter(([id,qty])=>qty>0),qty=picks.reduce((n,[,q])=>n+q,0);let total=0,missing=false;picks.forEach(([id,q])=>{const p=data.products.find(x=>x.id==id);if(p){if(p.price===null)missing=true;else total+=Number(p.price)*q;}});$('selectedCount').textContent=qty?qty+' items selected':'No items selected';$('selectedTotal').textContent=qty?(missing?'Price on request for some items':'Estimated total ₹'+total.toFixed(2)):'Select products to enquire';}
function render(){
 document.title=data.shop.name+' | Digital Showroom';
 const s=data.shop;
 const palette=['#E83F7E','#1D4ED8','#0F766E','#6D28D9','#9A3412','#334155'];
 const colour=String(s.theme_color||'#E83F7E').toUpperCase();
 document.body.style.setProperty('--shop-accent',palette.includes(colour)?colour:'#E83F7E');
 $('shopHeader').innerHTML=(s.logo_url?'<img src="'+esc(s.logo_url)+'" alt="" style="width:78px;height:78px;object-fit:cover;border-radius:50%;background:white">':'<div style="font-size:56px">🏬</div>')+'<div><h1>'+esc(s.name)+'</h1><p style="margin:6px 0">'+esc(s.tagline)+'</p><small>'+esc(s.address)+'</small></div>';
 $('filter').innerHTML='<button class="'+(!category?'active':'')+'" data-category="0">All Products</button>'+data.categories.map(c=>'<button class="'+(category==c.id?'active':'')+'" data-category="'+c.id+'">'+esc(c.name)+'</button>').join('');
 const shown=data.products.filter(p=>!category||p.category_id==category);
 $('products').innerHTML=shown.length?shown.map(p=>'<article class="product-card">'+(p.image_url?'<div class="product-photo-display"><img class="product-main-photo" src="'+esc(p.image_url)+'" alt="'+esc(p.name)+'" loading="lazy">'+((p.images||[]).length>1?'<div class="shop-photo-thumbs">'+p.images.map((url,i)=>'<button type="button" class="shop-photo-thumb '+(!i?'selected':'')+'" data-image="'+esc(url)+'" aria-label="View photo '+(i+1)+' of '+esc(p.name)+'"><img src="'+esc(url)+'" alt="" loading="lazy"></button>').join('')+'</div>':'')+'</div>':'<div style="background:#ffe5ed;height:190px;display:grid;place-items:center;font-size:55px">🛍️</div>')+'<div class="details"><h3>'+esc(p.name)+'</h3><p class="muted">'+esc(p.description)+'</p><div class="inline-actions" style="justify-content:space-between"><b>'+(p.price===null?'On request':'₹'+Number(p.price).toFixed(2))+' / '+esc(p.unit||'Piece')+'</b><div class="inline-actions"><button class="btn sm soft" data-dec="'+p.id+'">−</button><b>'+Number(cart[p.id]||0)+'</b><button class="btn sm primary" data-inc="'+p.id+'">+</button></div></div></div></article>').join(''):'<p>No products in this category.</p>';
 document.querySelectorAll('.shop-photo-thumb').forEach(button=>button.onclick=()=>{
  const frame=button.closest('.product-photo-display'),main=frame?.querySelector('.product-main-photo');
  if(!main)return;
  main.src=button.dataset.image;
  frame.querySelectorAll('.shop-photo-thumb').forEach(thumb=>thumb.classList.toggle('selected',thumb===button));
 });
 document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{category=Number(b.dataset.category);render()});
 document.querySelectorAll('[data-inc]').forEach(b=>b.onclick=()=>{cart[b.dataset.inc]=(cart[b.dataset.inc]||0)+1;render()});
 document.querySelectorAll('[data-dec]').forEach(b=>b.onclick=()=>{cart[b.dataset.dec]=Math.max(0,(cart[b.dataset.dec]||0)-1);render()});
 count();
}
function whatsapp(quote){
 if(!data)return;
 const chosen=data.products.filter(p=>cart[p.id]>0);if(!chosen.length){alert('Please select at least one product.');return}
 const details=chosen.map(p=>'- '+p.name+' × '+cart[p.id]+' '+(p.unit||'Piece')+(p.price!==null?' (₹'+(Number(p.price)*cart[p.id]).toFixed(2)+')':' (price on request)')).join('\n');
 const n=chosen.reduce((sum,p)=>sum+(p.price===null?0:Number(p.price)*cart[p.id]),0);
 const text=(quote?'Hello, I would like a quotation for:':'Hello, I would like to order:')+'\n'+details+'\n'+(chosen.every(p=>p.price!==null)?'Estimated total: ₹'+n.toFixed(2)+'\n':'')+'Shop: '+data.shop.name;
 const phone=String(data.shop.phone||'').replace(/\D/g,'');const number=phone.length===10?'91'+phone:phone;
 window.open('https://wa.me/'+number+'?text='+encodeURIComponent(text),'_blank','noopener');
}
$('orderBtn').onclick=()=>whatsapp(false);$('quoteBtn').onclick=()=>whatsapp(true);
fetch('/api/app.php?action=public&slug='+encodeURIComponent(slug),{credentials:'same-origin'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'Shop unavailable');data=d;render()}).catch(e=>{$('shopHeader').innerHTML='<h1>Shop unavailable</h1>';$('shopError').innerHTML='<p class="notice error">'+esc(e.message)+'</p>'});
