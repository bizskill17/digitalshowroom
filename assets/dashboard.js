
const $=id=>document.getElementById(id);
let csrf='',user=null,data=null,view='dashboard';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const api=async(action,payload)=>{let res=await fetch('/api/app.php?action='+encodeURIComponent(action),{method:payload?'POST':'GET',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:payload?JSON.stringify(payload):undefined,credentials:'same-origin'});let out=await res.json();if(!res.ok)throw Error(out.error||'Request failed');return out;};
function updateSidebarAccount(){if(!user)return;$('userName').textContent=user.name;const initials=user.name.trim().split(/\s+/).slice(0,2).map(w=>w[0]||'').join('').toUpperCase();$('userInitials').textContent=initials||'U';$('userRole').textContent=user.role==='admin'?'Admin':'Seller';}
function flash(message,bad=false){$('flash').innerHTML='<div class="notice '+(bad?'error':'success')+'">'+esc(message)+'</div>';setTimeout(()=>{$('flash').innerHTML='';},6000)}
const button=(name,fn,cls='soft')=>'<button class="btn sm '+cls+'" data-do="'+esc(fn)+'">'+esc(name)+'</button>';
function nav(){const menus=data.role==='admin'?[['dashboard','Dashboard'],['shops','Seller & Shop Management'],['settings','Platform Settings'],['plans','Subscription Plans'],['payments','Payments (Future)']]:[['dashboard','Dashboard'],['profile','Shop Profile'],['categories','Product Categories'],['products','Products'],['catalogues','Catalogues'],['status','WhatsApp Status'],['public','Public Showroom'],['subscription','Subscription']];$('sideNav').innerHTML=menus.map(([id,label])=>'<button class="side-link '+(view===id?'active':'')+'" data-nav="'+id+'">'+label+'</button>').join('');document.querySelectorAll('[data-nav]').forEach(n=>n.onclick=()=>{view=n.dataset.nav;render();});}
function title(t){$('pageTitle').textContent=t;}
function stat(name,value,klass='blue',hint=''){return '<div class="stat '+klass+'"><span>'+esc(name)+'</span><b>'+esc(value)+'</b><small>'+esc(hint)+'</small></div>'}
function tdActions(edit,del){return '<div class="inline-actions">'+button('Edit',edit)+button('Delete',del,'danger')+'</div>'}
function panel(heading,inside,extra=''){return '<section class="panel"><div class="panel-head"><h2>'+heading+'</h2>'+extra+'</div>'+inside+'</section>'}
function wrapTable(head,rows){return '<div class="table-wrap"><table class="data-table"><thead><tr>'+head.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+(rows||'<tr><td colspan="'+head.length+'" class="placeholder">No records yet</td></tr>')+'</tbody></table></div>'}
function shopUrl(){return location.origin+'/shop.html?slug='+encodeURIComponent(data.shop.slug)}
function field(label,id,value='',type='text',extra=''){return '<div class="field"><label for="'+id+'">'+esc(label)+'</label><input id="'+id+'" type="'+type+'" value="'+esc(value)+'" '+extra+'></div>'}
function sellerDashboard(){
 const n=data.products.length,limit=data.free_product_limit;
 return '<div class="welcome"><div><h2>'+esc(data.shop.name)+'</h2><p>Manage your products, create catalogues and share your shop with customers.</p></div><a class="btn primary" target="_blank" rel="noopener" href="'+esc(shopUrl())+'">Public Showroom ↗</a></div>'
 +'<div class="stats">'+stat('Products',n+' / '+limit,'blue','Free product allowance')+stat('Categories',data.categories.length,'green')+stat('Catalogues',data.catalogues.length,'amber')+stat('Subscription','Free','purple','Paid plans coming later')+'</div>'
 +'<div class="columns"><div>'+productsPanel(true)+'</div><div>'+panel('Public Showroom','<div class="preview-link">'+esc(shopUrl())+'</div><p>'+button('Copy Link','copyLink')+' <a class="btn primary sm" target="_blank" href="'+esc(shopUrl())+'">Open Shop ↗</a></p>')
 +panel('Create Status Images','<p>Choose active products and download ready-to-share promotional pictures.</p>'+button('Create Status Image','nav-status','primary'))
 +panel('Product Allowance','<p>Products used: <b>'+n+'</b> of <b>'+limit+'</b></p><p class="hint">Subscription payments are not active yet. Product limits can be changed by an administrator.</p>')+'</div></div>';
}
function productsPanel(short=false){
 const rows=data.products.slice(0,short?8:999).map(p=>'<tr><td>'+esc(p.name)+'</td><td>'+esc(data.categories.find(c=>c.id==p.category_id)?.name||'—')+'</td><td>'+(p.price===null?'On request':'₹'+Number(p.price).toFixed(2))+'</td><td><span class="pill '+(!+p.active?'off':'')+'">'+(+p.active?'Active':'Hidden')+'</span></td><td class="actions">'+tdActions('edit-product-'+p.id,'delete-product-'+p.id)+'</td></tr>').join('');
 return panel('Products',wrapTable(['Product','Category','Price','Status','Actions'],rows),button('＋ Add Product','new-product','primary'));
}
function categoryPanel(){
 const rows=data.categories.map(c=>'<tr><td>'+esc(c.name)+'</td><td>'+data.products.filter(p=>p.category_id==c.id).length+'</td><td>'+tdActions('edit-category-'+c.id,'delete-category-'+c.id)+'</td></tr>').join('');
 return panel('Product Categories',wrapTable(['Category','Products','Actions'],rows),button('＋ Add Category','new-category','primary'));
}
function profilePanel(){
 const s=data.shop;
 return panel('Shop Profile','<form id="shopForm"><div class="form-grid">'+field('Shop Name *','shopName',s.name,'text','required maxlength="150"')+field('WhatsApp Number *','shopPhone',s.phone,'tel','required maxlength="15"')+field('Tagline','shopTag',s.tagline,'text','maxlength="255"')+field('Shop Address','shopAddress',s.address,'text','maxlength="255"')+'</div>'+field('Logo Image URL','shopLogo',s.logo_url||'','url','placeholder="https://example.com/logo.png"')+'<div class="field"><label for="shopLogoFile">Or upload shop logo (JPG, PNG, WebP)</label><input type="file" id="shopLogoFile" accept="image/jpeg,image/png,image/webp"></div><p class="hint">Upload a logo or supply an image URL.</p><p><b>Public shop URL:</b> '+esc(shopUrl())+'</p><button class="btn primary" type="submit">Save Profile</button></form>')+panel('Account Details','<form id="accountForm">'+field('Your Name *','accountName',user?.name||'','text','required maxlength="150"')+'<button type="submit" class="btn primary">Save Name</button></form>');
}
function productForm(id){
 const p=data.products.find(v=>v.id==id)||{name:'',description:'',category_id:'',price:'',image_url:'',active:1};let cats='<option value="">No Category</option>'+data.categories.map(c=>'<option value="'+c.id+'" '+(c.id==p.category_id?'selected':'')+'>'+esc(c.name)+'</option>').join('');
 return panel(id?'Edit Product':'Add Product','<form id="productForm" data-id="'+(id||'')+'"><div class="form-grid">'+field('Product Name *','productName',p.name,'text','required maxlength="180"')+'<div class="field"><label for="productCat">Category</label><select id="productCat">'+cats+'</select></div>'+field('Price (₹) — blank means on request','productPrice',p.price===null?'':p.price,'number','min="0" step="0.01"')+'</div><input type="hidden" id="productImage" value="'+esc(p.image_url||'')+'"><div class="field"><label for="productImageFile">Upload Product Photo (JPG, PNG, WebP)</label><input type="file" id="productImageFile" accept="image/jpeg,image/png,image/webp"></div><div class="field"><label for="productDesc">Description</label><textarea id="productDesc" maxlength="2500">'+esc(p.description)+'</textarea></div><div class="field"><label><input type="checkbox" id="productActive" '+(+p.active?'checked':'')+'> Visible in public showroom</label></div><button type="submit" class="btn primary">Save Product</button> '+button('Cancel','cancel')+'</form>');
}
function categoryForm(id){
 const c=data.categories.find(v=>v.id==id)||{name:''};return panel(id?'Edit Category':'Add Category','<form id="categoryForm" data-id="'+(id||'')+'">'+field('Category Name *','categoryName',c.name,'text','required maxlength="120"')+'<button type="submit" class="btn primary">Save Category</button> '+button('Cancel','cancel')+'</form>');
}
function cataloguesPanel(){
 const rows=data.catalogues.map(c=>'<tr><td>'+esc(c.name)+'</td><td>'+data.catalogue_products.filter(i=>i.catalogue_id==c.id).length+'</td><td>'+tdActions('edit-catalogue-'+c.id,'delete-catalogue-'+c.id)+'</td></tr>').join('');
 return panel('Catalogues',wrapTable(['Catalogue','Products','Actions'],rows),button('＋ Add Catalogue','new-catalogue','primary'));
}
function catalogueForm(id){
 const c=data.catalogues.find(v=>v.id==id)||{name:''};const chosen=data.catalogue_products.filter(v=>v.catalogue_id==id).map(v=>+v.product_id);
 return panel(id?'Edit Catalogue':'Add Catalogue','<form id="catalogueForm" data-id="'+(id||'')+'">'+field('Catalogue Name *','catalogueName',c.name,'text','required maxlength="130"')+'<div class="field"><label>Select Products</label><div class="panel" style="max-height:320px;overflow:auto">'+(data.products.map(p=>'<label style="display:block;margin-bottom:10px"><input type="checkbox" name="catalogueProduct" value="'+p.id+'" '+(chosen.includes(+p.id)?'checked':'')+'> '+esc(p.name)+'</label>').join('')||'Add products first')+'</div></div><button class="btn primary" type="submit">Save Catalogue</button> '+button('Cancel','cancel')+'</form>');
}
function statusPanel(){
 return panel('WhatsApp Status Image Maker','<p class="muted">Select products and generate downloadable images for WhatsApp Status.</p><div class="form-grid">'+data.products.filter(p=>+p.active).map(p=>'<label class="feature"><input type="checkbox" class="statusPick" value="'+p.id+'"> '+esc(p.name)+'</label>').join('')+'</div><p style="margin-top:18px">'+button('Generate Selected Images','generate-status','primary')+'</p><div id="statusOutput"></div>');
}
function adminDashboard(){
 const s=data.stats;return '<div class="stats">'+stat('Registered Sellers',s.sellers,'blue')+stat('Shops',s.shops,'green')+stat('Products',s.products,'amber')+stat('Free Product Limit',s.free_product_limit,'purple','Products per shop')+'</div><div class="columns"><div>'+adminShops()+'</div><div>'+panel('Platform Settings','<p>Free Product Limit: <b>'+s.free_product_limit+'</b></p>'+button('Change Limit','nav-settings','primary'))+panel('Subscriptions','<p class="muted">Paid subscriptions and Razorpay are planned for the next development phase.</p>')+'</div></div>';
}
function adminShops(){
 const rows=data.shops.map(s=>'<tr><td>'+esc(s.owner)+'</td><td>'+esc(s.name)+'</td><td>'+esc(s.products)+'</td><td><span class="pill '+(!+s.active?'off':'')+'">'+(+s.active?'Active':'Disabled')+'</span></td><td>'+button(+s.active?'Disable':'Enable','status-'+s.id+'-'+(+s.active?0:1),'outline')+' <a target="_blank" class="btn sm soft" href="/shop.html?slug='+encodeURIComponent(s.slug)+'">View</a></td></tr>').join('');
 return panel('Seller & Shop Management',wrapTable(['Seller','Shop','Products','Status','Actions'],rows));
}
function adminSettings(){return panel('Platform Settings','<form id="settingsForm">'+field('Free Product Limit','freeLimit',data.stats.free_product_limit,'number','min="0" max="100000" step="1" required')+'<p class="hint">Changing this limit affects the allowed number of products for free sellers. Existing products are not deleted.</p><button type="submit" class="btn primary">Save Settings</button></form>');}
function render(){
 nav();
 let html='',name='Dashboard';
 if(data.role==='admin'){
  if(view==='dashboard')html=adminDashboard();
  else if(view==='shops'){name='Seller & Shop Management';html=adminShops();}
  else if(view==='settings'){name='Platform Settings';html=adminSettings();}
  else if(view==='plans'){name='Subscription Plans';html=panel('Subscriptions','<div class="notice">Free registration is available. Paid subscription setup and Razorpay activation are pending.</div>');}
  else{ name='Payments';html=panel('Razorpay Payments','<p class="muted">Razorpay has not yet been integrated. No payment records are collected.</p>');}
 }else{
  if(view==='dashboard')html=sellerDashboard();
  if(view==='profile'){name='Shop Profile';html=profilePanel();}
  if(view==='products'){name='Products';html=productsPanel();}
  if(view==='categories'){name='Product Categories';html=categoryPanel();}
  if(view==='catalogues'){name='Catalogues';html=cataloguesPanel();}
  if(view==='status'){name='WhatsApp Status';html=statusPanel();}
  if(view==='public'){name='Public Showroom';html=panel('Share Your Shop','<p>Send this link to your customers:</p><div class="preview-link">'+esc(shopUrl())+'</div><p>'+button('Copy Link','copyLink')+' <a class="btn sm primary" href="'+esc(shopUrl())+'" target="_blank">Open Showroom ↗</a></p>');}
  if(view==='subscription'){name='Subscription';html=panel('Your Plan','<div class="stats" style="grid-template-columns:repeat(2,minmax(0,1fr))">'+stat('Current Plan','Free','green')+stat('Products Used',data.products.length+' / '+data.free_product_limit,'blue')+'</div><p>Paid subscription plans and Razorpay integration are planned and are not yet enabled.</p>');}
 }
 title(name);$('content').innerHTML=html;wireForms();
 document.querySelectorAll('[data-do]').forEach(b=>b.onclick=()=>doAction(b.dataset.do));
}
async function refresh(){data=await api('dashboard');if(data.role==='admin'&& !['dashboard','shops','settings','plans','payments'].includes(view))view='dashboard';render();}
async function post(action,payload,success){try{await api(action,payload);flash(success||'Saved successfully');await refresh();}catch(e){flash(e.message,true)}}
async function uploadImage(input,target){if(!input.files||!input.files[0])return;const fd=new FormData();fd.append('image',input.files[0]);input.disabled=true;try{const res=await fetch('/api/upload.php',{method:'POST',headers:{'X-CSRF-Token':csrf},body:fd,credentials:'same-origin'});const out=await res.json();if(!res.ok)throw Error(out.error||'Upload failed');target.value=out.url;flash('Image uploaded successfully');}catch(e){flash(e.message,true)}finally{input.disabled=false;}}
function wireForms(){
 {const f=$('accountForm');if(f)f.onsubmit=async e=>{e.preventDefault();const name=$('accountName').value.trim();const btn=f.querySelector('[type="submit"]');btn.disabled=true;try{const result=await api('account-name',{name});user.name=result.name;updateSidebarAccount();render();flash('Name updated successfully');}catch(err){flash(err.message,true)}finally{btn.disabled=false;}};}
 let uploader=$('shopLogoFile');if(uploader)uploader.onchange=()=>uploadImage(uploader,$('shopLogo'));
 uploader=$('productImageFile');if(uploader)uploader.onchange=()=>uploadImage(uploader,$('productImage'));
 {const f=$('shopForm');if(f)f.onsubmit=e=>{e.preventDefault();post('shop',{name:$('shopName').value,phone:$('shopPhone').value,tagline:$('shopTag').value,address:$('shopAddress').value,logo_url:$('shopLogo').value});};}
 {const f=$('productForm');if(f)f.onsubmit=e=>{e.preventDefault();post('product-save',{id:f.dataset.id?+f.dataset.id:0,name:$('productName').value,category_id:$('productCat').value,description:$('productDesc').value,price:$('productPrice').value,image_url:$('productImage').value,active:$('productActive').checked},'Product saved');};}
 {const f=$('categoryForm');if(f)f.onsubmit=async e=>{
  e.preventDefault();
  const name=$('categoryName').value.trim();
  const id=f.dataset.id?+f.dataset.id:0;
  let notice=$('categorySaveMessage');
  if(!notice){notice=document.createElement('div');notice.id='categorySaveMessage';notice.setAttribute('role','alert');f.prepend(notice);}
  if(!name){notice.className='notice error';notice.textContent='Enter category name.';return;}
  const saveButton=f.querySelector('button[type="submit"]');
  saveButton.disabled=true;saveButton.textContent='Saving...';
  notice.className='notice';notice.textContent='Saving category...';
  try{
   const response=await api('category-save',{id,name});
   if(!response.ok||!response.category?.id)throw Error('Server did not confirm category save.');
   const updated=await api('dashboard');
   if(!updated.categories?.some(c=>Number(c.id)===Number(response.category.id)))throw Error('Saved category not returned by database. Refresh and check before saving again.');
   data=updated;render();flash('Category saved successfully: '+response.category.name);
  }catch(error){
   notice.className='notice error';notice.textContent=error.message;
   saveButton.disabled=false;saveButton.textContent='Save Category';
  }
 };}
 {const f=$('catalogueForm');if(f)f.onsubmit=e=>{e.preventDefault();post('catalogue-save',{id:f.dataset.id?+f.dataset.id:0,name:$('catalogueName').value,product_ids:[...document.querySelectorAll('[name="catalogueProduct"]:checked')].map(x=>+x.value)});};}
 {const f=$('settingsForm');if(f)f.onsubmit=e=>{e.preventDefault();post('settings',{free_product_limit:Number($('freeLimit').value)});};}
}
async function doAction(action){
 if(action==='copyLink'){try{await navigator.clipboard.writeText(shopUrl());flash('Shop link copied');}catch(e){flash('Copy unavailable in this browser',true)}return;}
 if(action==='nav-status'){view='status';render();return;}
 if(action==='nav-settings'){view='settings';render();return;}
 if(action==='cancel'){render();return;}
 let id;
 if(action==='new-product'||action.startsWith('edit-product-')){$('content').innerHTML=productForm(action==='new-product'?0:+action.split('-').pop());wireForms();return;}
 if(action==='new-category'||action.startsWith('edit-category-')){$('content').innerHTML=categoryForm(action==='new-category'?0:+action.split('-').pop());wireForms();return;}
 if(action==='new-catalogue'||action.startsWith('edit-catalogue-')){$('content').innerHTML=catalogueForm(action==='new-catalogue'?0:+action.split('-').pop());wireForms();return;}
 const m=action.match(/^delete-(product|category|catalogue)-(\d+)$/);
 if(m){if(!confirm('Delete this '+m[1]+'? This action cannot be undone.'))return;await post(m[1]+'-delete',{id:+m[2]},'Deleted');return;}
 const st=action.match(/^status-(\d+)-(0|1)$/);
 if(st){await post('shop-status',{id:+st[1],active:st[2]==='1'},'Shop status updated');return;}
 if(action==='generate-status'){generateStatus();return;}
}
function generateStatus(){
 const ids=[...document.querySelectorAll('.statusPick:checked')].map(e=>+e.value);
 if(!ids.length){flash('Select at least one product',true);return;}
 const selected=data.products.filter(p=>ids.includes(+p.id));const out=$('statusOutput');out.replaceChildren();
 selected.forEach(p=>{
  const canvas=document.createElement('canvas');canvas.width=800;canvas.height=1000;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#fff5f8';ctx.fillRect(0,0,800,1000);ctx.fillStyle='#e83f7e';ctx.fillRect(0,0,800,165);
  ctx.fillStyle='#fff';ctx.font='bold 48px Arial';ctx.fillText(data.shop.name.slice(0,24),45,100);
  const finish=()=>{ctx.fillStyle='#3a1830';ctx.font='bold 46px Arial';ctx.fillText(p.name.slice(0,26),42,800);ctx.font='bold 37px Arial';ctx.fillText(p.price===null?'Price on request':'₹'+Number(p.price).toFixed(2),42,855);ctx.font='25px Arial';ctx.fillText('Order on WhatsApp: '+data.shop.phone,42,925);const a=document.createElement('a');a.className='btn primary';a.textContent='Download '+p.name;a.download='status-'+p.id+'.png';a.href=canvas.toDataURL('image/png');out.appendChild(a);};
  if(p.image_url){const img=new Image();img.crossOrigin='anonymous';img.onload=()=>{try{ctx.drawImage(img,50,200,700,530)}catch(e){}try{finish()}catch(e){flash('This image host prevents download. Use an image from a CORS-enabled host.',true)}};img.onerror=finish;img.src=p.image_url;}else finish();
 });
}
$('logout').onclick=async()=>{try{await api('logout',{});}finally{location.href='/login.html';}};
async function initializeDashboard(){
 try{
  const d=await api('me');
  if(!d.user){location.href='/login.html';return;}
  csrf=d.csrf;user=d.user;updateSidebarAccount();
  await refresh();
 }catch(error){
  const content=$('content');
  if(content)content.innerHTML='<div class="notice error"><b>Dashboard could not load.</b><p id="dashboardLoadError"></p><button type="button" class="btn primary" id="retryDashboard">Retry</button></div>';
  const message=$('dashboardLoadError');if(message)message.textContent=error?.message||'Unable to load account data.';
  const retry=$('retryDashboard');if(retry)retry.onclick=initializeDashboard;
  console.error('Dashboard initialization failed',error);
 }
}
initializeDashboard();
