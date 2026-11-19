
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data=null,category=0,cart={};
const slug=new URLSearchParams(location.search).get('slug')||'';
function count(){const picks=Object.entries(cart).filter(([id,qty])=>qty>0),qty=picks.reduce((n,[,q])=>n+q,0);let total=0,missing=false;picks.forEach(([id,q])=>{const p=data.products.find(x=>x.id==id);if(p){if(p.price===null)missing=true;else total+=Number(p.price)*q;}});$('selectedCount').textContent=qty?qty+' items selected':'No items selected';$('selectedTotal').textContent=qty?(missing?'Price on request for some items':'Estimated total ₹'+total.toFixed(2)):'Select products to enquire';}
function render(){
 document.title=data.shop.name+' | Digital Showroom';
 const s=data.shop;
 $('shopHeader').innerHTML=(s.logo_url?'<img src="'+esc(s.logo_url)+'" alt="" style="width:78px;height:78px;object-fit:cover;border-radius:50%;background:white">':'<div style="font-size:56px">🏬</div>')+'<div><h1>'+esc(s.name)+'</h1><p style="margin:6px 0">'+esc(s.tagline)+'</p><small>'+esc(s.address)+'</small></div>';
 $('filter').innerHTML='<button class="'+(!category?'active':'')+'" data-category="0">All Products</button>'+data.categories.map(c=>'<button class="'+(category==c.id?'active':'')+'" data-category="'+c.id+'">'+esc(c.name)+'</button>').join('');
 const shown=data.products.filter(p=>!category||p.category_id==category);
 $('products').innerHTML=shown.length?shown.map(p=>'<article class="product-card">'+(p.image_url?'<img src="'+esc(p.image_url)+'" alt="'+esc(p.name)+'" loading="lazy">':'<div style="background:#ffe5ed;height:190px;display:grid;place-items:center;font-size:55px">🛍️</div>')+'<div class="details"><h3>'+esc(p.name)+'</h3><p class="muted">'+esc(p.description)+'</p><div class="inline-actions" style="justify-content:space-between"><b>'+(p.price===null?'On request':'₹'+Number(p.price).toFixed(2))+'</b><div class="inline-actions"><button class="btn sm soft" data-dec="'+p.id+'">−</button><b>'+Number(cart[p.id]||0)+'</b><button class="btn sm primary" data-inc="'+p.id+'">+</button></div></div></div></article>').join(''):'<p>No products in this category.</p>';
 document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{category=Number(b.dataset.category);render()});
 document.querySelectorAll('[data-inc]').forEach(b=>b.onclick=()=>{cart[b.dataset.inc]=(cart[b.dataset.inc]||0)+1;render()});
 document.querySelectorAll('[data-dec]').forEach(b=>b.onclick=()=>{cart[b.dataset.dec]=Math.max(0,(cart[b.dataset.dec]||0)-1);render()});
 count();
}
function whatsapp(quote){
 if(!data)return;
 const chosen=data.products.filter(p=>cart[p.id]>0);if(!chosen.length){alert('Please select at least one product.');return}
 const details=chosen.map(p=>'- '+p.name+' × '+cart[p.id]+(p.price!==null?' (₹'+(Number(p.price)*cart[p.id]).toFixed(2)+')':' (price on request)')).join('\n');
 const n=chosen.reduce((sum,p)=>sum+(p.price===null?0:Number(p.price)*cart[p.id]),0);
 const text=(quote?'Hello, I would like a quotation for:':'Hello, I would like to order:')+'\n'+details+'\n'+(chosen.every(p=>p.price!==null)?'Estimated total: ₹'+n.toFixed(2)+'\n':'')+'Shop: '+data.shop.name;
 const phone=String(data.shop.phone||'').replace(/\D/g,'');const number=phone.length===10?'91'+phone:phone;
 window.open('https://wa.me/'+number+'?text='+encodeURIComponent(text),'_blank','noopener');
}
$('orderBtn').onclick=()=>whatsapp(false);$('quoteBtn').onclick=()=>whatsapp(true);
fetch('/api/app.php?action=public&slug='+encodeURIComponent(slug),{credentials:'same-origin'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'Shop unavailable');data=d;render()}).catch(e=>{$('shopHeader').innerHTML='<h1>Shop unavailable</h1>';$('shopError').innerHTML='<p class="notice error">'+esc(e.message)+'</p>'});
