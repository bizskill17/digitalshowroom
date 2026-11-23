
const $=id=>document.getElementById(id);
let csrf='',user=null,data=null,view='dashboard',shareMode='poster';
const sellerViews=['dashboard','profile','categories','products','catalogues','enquiries','analytics','share','public','subscription'];
const adminViews=['dashboard','shops','plans','payments'];
function closeMobileNav(){
 const sidebar=$('dashboardSidebar'),toggle=$('mobileNavToggle'),backdrop=$('mobileNavBackdrop');
 if(!sidebar)return;
 sidebar.classList.remove('mobile-nav-open');
 if(toggle){toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open navigation menu');}
 if(backdrop)backdrop.hidden=true;
 document.body.classList.remove('mobile-nav-lock');
}
function openMobileNav(){
 const sidebar=$('dashboardSidebar'),toggle=$('mobileNavToggle'),backdrop=$('mobileNavBackdrop');
 if(!sidebar||!toggle||!backdrop)return;
 sidebar.classList.add('mobile-nav-open');
 toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Close navigation menu');
 backdrop.hidden=false;
 document.body.classList.add('mobile-nav-lock');
 sidebar.querySelector('.side-link.active,.side-link')?.focus({preventScroll:true});
}
function setupMobileNav(){
 const toggle=$('mobileNavToggle'),backdrop=$('mobileNavBackdrop');
 if(!toggle||!backdrop)return;
 toggle.addEventListener('click',()=>document.getElementById('dashboardSidebar')?.classList.contains('mobile-nav-open')?closeMobileNav():openMobileNav());
 backdrop.addEventListener('click',closeMobileNav);
 $('mobileNavClose')?.addEventListener('click',()=>{closeMobileNav();toggle.focus()});
 window.addEventListener('keydown',e=>{if(e.key==='Escape')closeMobileNav()});
 let resizeTimer=0;
 const pauseAnim=()=>{document.body.classList.add('nav-no-anim');clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>document.body.classList.remove('nav-no-anim'),300);};
 pauseAnim();
 window.addEventListener('resize',()=>{pauseAnim();if(window.innerWidth>800)closeMobileNav()});
}
setupMobileNav();
function getViewFromUrl(){const key=decodeURIComponent(location.hash.slice(1));if(key==='status'&&user?.role==='seller'){shareMode='status';return 'share';}return (user?.role==='admin'?adminViews:sellerViews).includes(key)?key:'dashboard';}
function navigateTo(next){closeMobileNav();view=next;if(location.hash!=='#'+next)history.pushState(null,'','#'+next);render();}
window.addEventListener('popstate',()=>{if(!data)return;view=getViewFromUrl();render();});
window.addEventListener('hashchange',()=>{if(!data)return;const next=getViewFromUrl();if(next!==view){view=next;render();}});
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const api=async(action,payload)=>{let res=await fetch('/api/app.php?action='+encodeURIComponent(action),{method:payload?'POST':'GET',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:payload?JSON.stringify(payload):undefined,credentials:'same-origin'});let out=await res.json();if(!res.ok)throw Error(out.error||'Request failed');return out;};
function updateSidebarAccount(){if(!user)return;$('userName').textContent=user.name;const initials=user.name.trim().split(/\s+/).slice(0,2).map(w=>w[0]||'').join('').toUpperCase();$('userInitials').textContent=initials||'U';$('userRole').textContent=user.role==='admin'?'Admin':'Seller';}
function flash(message,bad=false){$('flash').innerHTML='<div class="notice '+(bad?'error':'success')+'">'+esc(message)+'</div>';setTimeout(()=>{$('flash').innerHTML='';},6000)}
const button=(name,fn,cls='soft')=>'<button class="btn sm '+cls+'" data-do="'+esc(fn)+'">'+esc(name)+'</button>';
function sidebarIcon(id){
 const paths={
  dashboard:'<path d="m3 10 9-7 9 7"/><path d="M5 9v12h14V9"/><path d="M9 21v-7h6v7"/>',
  profile:'<path d="M3 10h18l-2-6H5l-2 6Z"/><path d="M5 10v11h14V10"/><path d="M9 21v-7h6v7"/>',
  categories:'<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
  products:'<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="M3 7v10l9 5 9-5V7"/><path d="M12 12v10"/>',
  catalogues:'<path d="M12 7c-3-3-6-3-10-2v15c4-1 7-1 10 2 3-3 6-3 10-2V5c-4-1-7-1-10 2Z"/><path d="M12 7v15"/>',
  enquiries:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 7 9-7"/>',
  analytics:'<path d="M3 21h18"/><rect x="5" y="12" width="4" height="9"/><rect x="11" y="4" width="4" height="17"/><rect x="17" y="9" width="4" height="12"/>',
  share:'<circle cx="6" cy="12" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/>',
  status:'<path d="M20 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.1-4.4A8.5 8.5 0 1 1 20 11.5Z"/><path d="M9 9c.3 2 2 4 4.5 5l1.5-1"/>',
  public:'<path d="M13 4h7v7"/><path d="m20 4-9 9"/><path d="M20 13v7H4V4h7"/>',
  subscription:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/>',
  shops:'<path d="M3 10h18l-2-6H5l-2 6Z"/><path d="M5 10v11h14V10"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/>',
  plans:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 9h8M8 14h8"/>',
  payments:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>'
 };
 return '<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[id]||paths.dashboard)+'</svg>';
}
function nav(){
 const isSeller=data.role==='seller';
 $('dashboardSidebar').classList.toggle('seller-sidebar',isSeller);
 $('dashboardSidebar').classList.toggle('admin-sidebar',!isSeller);
 const menus=data.role==='admin'
 ?[['dashboard','Dashboard'],['shops','Seller & Shop Management'],['plans','Subscription Plans'],['payments','Payments']]
 :[['dashboard','Dashboard'],['profile','Shop Profile'],['products','Products'],['categories','Categories'],['catalogues','Catalogues'],['enquiries','Enquiry Inbox'],['analytics','Analytics'],['share','Share Kit'],['subscription','Subscription']];
 $('sideNav').innerHTML=menus.map(([id,label])=>'<button class="side-link '+(view===id?'active':'')+'" data-nav="'+id+'" '+(view===id?'aria-current="page"':'')+'>'+sidebarIcon(id)+'<span>'+label+'</span></button>').join('');
 document.querySelectorAll('[data-nav]').forEach(n=>n.onclick=()=>navigateTo(n.dataset.nav));
}

function title(t){$('pageTitle').textContent=t;}
function stat(name,value,klass='blue',hint=''){return '<div class="stat '+klass+'"><span>'+esc(name)+'</span><b>'+esc(value)+'</b><small>'+esc(hint)+'</small></div>'}
function statLink(name,value,klass,hint,target){return '<a class="stat-link stat '+klass+'" href="#'+target+'" aria-label="Open '+esc(name)+'">'+
 '<span>'+esc(name)+'</span><b>'+esc(value)+'</b><small>'+esc(hint)+'</small></a>';}
function tdActions(edit,del){return '<div class="inline-actions">'+button('Edit',edit)+button('Delete',del,'danger')+'</div>'}
function panel(heading,inside,extra=''){return '<section class="panel"><div class="panel-head"><h2>'+heading+'</h2>'+extra+'</div>'+inside+'</section>'}
function sellerPanel(inside,extra=''){return '<section class="panel seller-panel">'+(extra?'<div class="seller-panel-actions">'+extra+'</div>':'')+inside+'</section>'}
function wrapTable(head,rows){return '<div class="table-wrap"><table class="data-table"><thead><tr>'+head.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+(rows||'<tr><td colspan="'+head.length+'" class="placeholder">No records yet</td></tr>')+'</tbody></table></div>'}
function shopUrl(){return location.origin+'/'+encodeURIComponent(data.shop.slug)}
function field(label,id,value='',type='text',extra=''){return '<div class="field"><label for="'+id+'">'+esc(label)+'</label><input id="'+id+'" type="'+type+'" value="'+esc(value)+'" '+extra+'></div>'}
let enquiryRecords=[],enquiryLoaded=false,enquiryLoading=false,enquiryError='';
const enquiryFilters={search:'',from:'',to:'',type:''};
function formatEnquiryDate(value){
 const match=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}:\d{2}))?/);
 return match?match[3]+'/'+match[2]+'/'+match[1]+(match[4]?' '+match[4]:''):String(value||'');
}
function enquiryDateKey(value){return String(value||'').slice(0,10);}
function enquiryMatches(e){
 const date=enquiryDateKey(e.created_at),filter=enquiryFilters;
 if(filter.from&&date<filter.from)return false;
 if(filter.to&&date>filter.to)return false;
 if(filter.type&&e.kind!==filter.type)return false;
 const q=filter.search.trim().toLocaleLowerCase();
 if(!q)return true;
 const searchable=[
  'ENQ-'+String(e.id).padStart(5,'0'),e.customer_name,e.customer_mobile,
  ...(e.items||[]).map(p=>p.product_name)
 ].join(' ').toLocaleLowerCase();
 return searchable.includes(q);
}
function enquiryTableRows(){
 const filtered=enquiryRecords.filter(enquiryMatches);

 const tbody=$('enquiryTableBody');
 if(!tbody)return;
 if(!filtered.length){tbody.innerHTML='<tr><td colspan="6" class="placeholder">No matching enquiries.</td></tr>';return;}
 tbody.innerHTML=filtered.map(e=>{
  const ref='ENQ-'+String(e.id).padStart(5,'0');
  const customer=String(e.customer_name||'').trim(),mobile=String(e.customer_mobile||'').replace(/[^0-9]/g,'');
  const wa=mobile.length===10?'91'+mobile:mobile;
  const contact='<div class="enquiry-customer">'+(customer?'<b>'+esc(customer)+'</b>':'')+
   (mobile?'<a href="https://wa.me/'+encodeURIComponent(wa)+'" target="_blank" rel="noopener noreferrer">'+esc(mobile)+'</a>':'<span>Contact not provided</span>')+'</div>';
  const n=(e.items||[]).length;
  const details='<button type="button" class="enquiry-detail-link" data-enquiry-view="'+Number(e.id)+'">View '+n+' item'+(n===1?'':'s')+'</button>';
  const total=e.estimated_total===null?'On request':'₹'+Number(e.estimated_total).toFixed(2);
  return '<tr><td class="enquiry-ref">'+ref+'</td><td class="enquiry-date">'+esc(formatEnquiryDate(e.created_at))+'</td><td>'+(e.kind==='quotation'?'Quotation':'Order')+'</td><td>'+details+'</td><td class="enquiry-amount">'+total+'</td><td>'+contact+'</td></tr>';
 }).join('');
 tbody.querySelectorAll('[data-enquiry-view]').forEach(button=>button.onclick=()=>showEnquiryDetails(Number(button.dataset.enquiryView)));
}
function showEnquiryDetails(id){
 const e=enquiryRecords.find(item=>Number(item.id)===id);
 const dialog=$('enquiryDetailsDialog');if(!e||!dialog)return;
 const ref='ENQ-'+String(e.id).padStart(5,'0');
 $('enquiryDetailsTitle').textContent=ref+' — '+(e.kind==='quotation'?'Quotation':'Order');
 $('enquiryDetailsMeta').textContent=formatEnquiryDate(e.created_at)+' | '+(e.customer_name||'Customer not provided')+(e.customer_mobile?' | '+e.customer_mobile:'');
 const table=$('enquiryDetailsItems');table.replaceChildren();
 let calculated=0,hasUnknown=false;
 for(const p of e.items||[]){
  const tr=document.createElement('tr');
  const price=p.unit_price===null?null:Number(p.unit_price);
  const qty=Number(p.quantity);
  const cells=[p.product_name,qty+' '+(p.unit||'Piece'),price===null?'On request':'₹'+price.toFixed(2),price===null?'On request':'₹'+(price*qty).toFixed(2)];
  if(price===null)hasUnknown=true;else calculated+=price*qty;
  for(const value of cells){const td=document.createElement('td');td.textContent=String(value);tr.append(td);}
  table.append(tr);
 }
 $('enquiryDetailsTotal').textContent='Estimated total: '+(e.estimated_total===null||hasUnknown?'On request':'₹'+Number(e.estimated_total).toFixed(2));
 if(typeof dialog.showModal==='function')dialog.showModal();
 else dialog.setAttribute('open','');
}
function enquiryPanel(){
 if(enquiryError)return '<section class="panel"><div class="notice error">'+esc(enquiryError)+'</div>'+button('Retry','retry-enquiries')+'</section>';
 if(!enquiryLoaded)return '<section class="panel"><p class="muted">Loading enquiries...</p></section>';
 const controls='<div class="enquiry-filter-bar">'+
  '<div class="field"><label for="enquirySearch">Search</label><input id="enquirySearch" type="search" placeholder="Reference, customer or product" value="'+esc(enquiryFilters.search)+'"></div>'+
  '<div class="field"><label for="enquiryFrom">From Date</label><input id="enquiryFrom" type="date" value="'+esc(enquiryFilters.from)+'"></div>'+
  '<div class="field"><label for="enquiryTo">To Date</label><input id="enquiryTo" type="date" value="'+esc(enquiryFilters.to)+'"></div>'+
  '<div class="field"><label for="enquiryType">Type</label><select id="enquiryType"><option value="">All Types</option><option value="order" '+(enquiryFilters.type==='order'?'selected':'')+'>Order</option><option value="quotation" '+(enquiryFilters.type==='quotation'?'selected':'')+'>Quotation</option></select></div>'+

  '<button type="button" class="btn soft enquiry-clear" id="enquiryClearFilters">Clear</button>'+
 '</div>';
 const table='<div class="table-wrap"><table class="data-table enquiry-table"><thead><tr><th>Reference</th><th>Date</th><th>Type</th><th>Products</th><th>Amount</th><th>Customer</th></tr></thead><tbody id="enquiryTableBody"></tbody></table></div>';
 const dialog='<dialog class="enquiry-details-dialog" id="enquiryDetailsDialog" aria-labelledby="enquiryDetailsTitle"><div class="enquiry-details-head"><h3 id="enquiryDetailsTitle"></h3><button type="button" class="enquiry-close" id="enquiryDetailsClose" aria-label="Close">×</button></div><p id="enquiryDetailsMeta" class="muted"></p><div class="table-wrap"><table class="data-table"><thead><tr><th>Product</th><th>Quantity</th><th>Rate</th><th>Amount</th></tr></thead><tbody id="enquiryDetailsItems"></tbody></table></div><div class="enquiry-details-bottom"><strong id="enquiryDetailsTotal"></strong><button type="button" class="btn soft" id="enquiryDetailsDone">Close</button></div></dialog>';
 return '<section class="panel enquiry-inbox-panel">'+controls+table+dialog+'</section>';
}
function wireEnquiryFilters(){
 const pairs=[['enquirySearch','search'],['enquiryFrom','from'],['enquiryTo','to'],['enquiryType','type']];
 for(const [id,key] of pairs){
  const el=$(id);if(!el)continue;
  el.addEventListener(key==='search'?'input':'change',()=>{
   enquiryFilters[key]=el.value;enquiryTableRows();
  });
 }
 const clear=$('enquiryClearFilters');
 if(clear)clear.onclick=()=>{
  for(const key of Object.keys(enquiryFilters))enquiryFilters[key]='';
  for(const [id,key] of pairs)if($(id))$(id).value=enquiryFilters[key];
  enquiryTableRows();
 };
 const dialog=$('enquiryDetailsDialog');
 if(dialog){
  const close=()=>{if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');};
  $('enquiryDetailsClose').onclick=close;
  $('enquiryDetailsDone').onclick=close;
 }
 enquiryTableRows();
}
async function loadEnquiries(){
 if(enquiryLoading)return;
 enquiryLoading=true;enquiryError='';
 try{
  const result=await api('enquiries');enquiryRecords=result.enquiries||[];enquiryLoaded=true;
 }catch(error){enquiryError=error.message;enquiryLoaded=false;}
 finally{enquiryLoading=false;if(view==='enquiries')render();}
}
async function updateEnquiryStatus(select){
 const id=Number(select.dataset.enquiryStatus),status=select.value;
 select.disabled=true;
 try{
  await api('enquiry-status',{id,status});
  const entry=enquiryRecords.find(item=>Number(item.id)===id);if(entry)entry.status=status;
  flash('Enquiry status updated');
 }catch(error){
  flash(error.message,true);
  const entry=enquiryRecords.find(item=>Number(item.id)===id);
  if(entry)select.value=entry.status;
 }finally{select.disabled=false;}
}
let analyticsLoading=false,analyticsResult=null,analyticsError='',analyticsFromDate='',analyticsToDate='',analyticsRequestId=0;
function analyticsToday(){
 const now=new Date();
 return now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
}
function analyticsDates(){
 return {from:analyticsFromDate,to:analyticsToDate};
}
function analyticsPanel(){
 const dates=analyticsDates();
 const filter='<div class="analytics-filter-bar">'+
 '<div class="field"><label for="analyticsFrom">From Date</label><input type="date" id="analyticsFrom" value="'+esc(dates.from)+'"></div>'+
 '<div class="field"><label for="analyticsTo">To Date</label><input type="date" id="analyticsTo" value="'+esc(dates.to)+'"></div>'+
 '<button class="btn soft analytics-clear" type="button" id="analyticsClear">Clear</button></div>';
 let body='';
 if(analyticsLoading)body='<p>Loading analytics...</p>';
 else if(analyticsError)body='<p class="notice error">'+esc(analyticsError)+'</p>';
 else if(!analyticsResult)body='<p>No analytics available yet.</p>';
 else{
  const a=analyticsResult,st=a.stats||{};
  body='<div class="analytics-metrics">'+[
   ['Showroom Views',st.visit||0],['WhatsApp Clicks',st.whatsapp_click||0],['Product Views',st.product_view||0],['Enquiries',st.enquiries||0]
  ].map(([name,count])=>'<div class="analytics-metric"><span>'+name+'</span><strong>'+Number(count)+'</strong></div>').join('')+'</div>';
  const views=(a.top_views||[]).map((p,i)=>'<tr><td>'+String(i+1)+'</td><td>'+esc(p.product_name)+'</td><td>'+Number(p.views)+'</td></tr>').join('');
  const enquiries=(a.top_enquiries||[]).map((p,i)=>'<tr><td>'+String(i+1)+'</td><td>'+esc(p.product_name)+'</td><td>'+Number(p.enquiries)+'</td></tr>').join('');
  body+='<div class="analytics-tables"><div><h3>Most-Viewed Products</h3>'+wrapTable(['SL No.','Product','Views'],views)+'</div><div><h3>Most-Enquired Products</h3>'+wrapTable(['SL No.','Product','Enquiries'],enquiries)+'</div></div>';
  const series=a.trend||[];
  if(series.length)body+='<div class="analytics-trend"><h3>Daily Showroom Views</h3>'+wrapTable(['Date','Views','WhatsApp Clicks'],series.map(p=>'<tr><td>'+esc(formatEnquiryDate(p.date))+'</td><td>'+Number(p.visit||0)+'</td><td>'+Number(p.whatsapp_click||0)+'</td></tr>').join(''))+'</div>';
 }
 return '<section class="panel seller-panel analytics-panel">'+filter+body+'</section>';
}
async function fetchAnalytics(){
 const dates=analyticsDates();
 for(const date of [dates.from,dates.to]){
  if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date)){
   analyticsError='Enter a valid date.';analyticsResult=null;render();return;
  }
 }
 if(dates.from&&dates.to&&dates.from>dates.to){
  analyticsError='From Date must not be after To Date.';analyticsResult=null;render();return;
 }
 const requestId=++analyticsRequestId;
 analyticsLoading=true;analyticsError='';render();
 try{
  const query=new URLSearchParams({action:'analytics'});
  if(dates.from)query.set('from',dates.from);
  if(dates.to)query.set('to',dates.to);
  const r=await fetch('/api/app.php?'+query.toString(),{credentials:'same-origin'});
  const result=await r.json();if(!r.ok)throw Error(result.error||'Analytics unavailable');
  if(requestId===analyticsRequestId)analyticsResult=result;
 }catch(e){if(requestId===analyticsRequestId){analyticsError=e.message;analyticsResult=null;}}
 finally{if(requestId===analyticsRequestId){analyticsLoading=false;if(view==='analytics')render();}}
}
function wireAnalytics(){
 const updateDates=()=>{
  analyticsFromDate=$('analyticsFrom').value;
  analyticsToDate=$('analyticsTo').value;
  analyticsResult=null;
  fetchAnalytics();
 };
 for(const id of ['analyticsFrom','analyticsTo']){
  const field=$(id);if(field)field.onchange=updateDates;
 }
 const clear=$('analyticsClear');
 if(clear)clear.onclick=()=>{
  analyticsFromDate='';analyticsToDate='';
  analyticsResult=null;
  fetchAnalytics();
 };
}
function sellerDashboard(){
 const n=data.products.length,limit=data.free_product_limit;
 return ''
 +'<div class="stats">'+statLink('Products',n+' / '+limit,'blue','','products')+statLink('Categories',data.categories.length,'green','','categories')+statLink('Catalogues',data.catalogues.length,'amber','','catalogues')+statLink('Subscription','Free','purple','','subscription')+'</div>'
 +'<div class="columns"><div>'+productsPanel(true)+'</div><div>'+panel('Public Showroom','<div class="preview-link">'+esc(shopUrl())+'</div><p>'+button('Copy Link','copyLink')+' <a class="btn primary sm" target="_blank" href="'+esc(shopUrl())+'">Open Shop ↗</a></p>')
 +'</div></div>';
}
function productsPanel(short=false){
 const rows=data.products.slice(0,short?8:999).map(p=>'<tr><td>'+esc(p.name)+'</td><td>'+esc(data.categories.find(c=>c.id==p.category_id)?.name||'—')+'</td><td>'+(p.price===null?'On request':'₹'+Number(p.price).toFixed(2))+'</td><td>'+esc(p.unit||'Piece')+'</td><td>'+esc(p.display_order??0)+'</td><td class="actions">'+tdActions('edit-product-'+p.id,'delete-product-'+p.id)+'</td></tr>').join('');
 const actions='<div class="inline-actions">'+button('Import Products','import-products')+button('From Gallery','gallery-products')+button('＋ Add Product','new-product','primary')+'</div>';
 const table=wrapTable(['Product','Category','Price','Unit','Order','Actions'],rows);
 return short?panel('Products',table,button('＋ Add Product','new-product','primary')):sellerPanel(table,actions);
}
function categoryPanel(){
 const rows=data.categories.map(c=>'<tr><td>'+esc(c.name)+'</td><td>'+data.products.filter(p=>p.category_id==c.id).length+'</td><td>'+tdActions('edit-category-'+c.id,'delete-category-'+c.id)+'</td></tr>').join('');
 return sellerPanel(wrapTable(['Category','Products','Actions'],rows),button('＋ Add Category','new-category','primary'));
}
function profilePanel(){
 const s=data.shop;
 const colourOptions=[['#E83F7E','Pink'],['#1D4ED8','Blue'],['#0F766E','Teal'],['#6D28D9','Purple'],['#9A3412','Terracotta'],['#334155','Slate']];
 return sellerPanel('<form id="shopForm"><div class="form-grid">'+field('Your Name *','accountName',user?.name||'','text','required maxlength="150"')+field('Shop Name *','shopName',s.name,'text','required maxlength="150"')+field('WhatsApp Number *','shopPhone',s.phone,'tel','required maxlength="15"')+field('Tagline','shopTag',s.tagline,'text','maxlength="255"')+field('Shop Address','shopAddress',s.address,'text','maxlength="255"')+
 '<div class="field"><label for="shopThemeColor">Shop Colour</label><select id="shopThemeColor">'+colourOptions.map(([value,label])=>'<option value="'+value+'" '+((s.theme_color||'#E83F7E').toUpperCase()===value?'selected':'')+'>'+label+'</option>').join('')+'</select></div></div>'+
 '<input type="hidden" id="shopLogo" value="'+esc(s.logo_url||'')+'"><div class="field"><label for="shopLogoFile">Upload Shop Logo (JPG, PNG, WebP)</label><input type="file" id="shopLogoFile" accept="image/jpeg,image/png,image/webp"></div><button class="btn primary" type="submit">Save Profile</button></form>');
}
const productImportColumns=['Product Name','Category','Price','Unit','Description','Display Order','Visible'];
let productImportRows=[];
function csvCell(value){
 const text=String(value??'');
 return /[",\r\n]/.test(text)?'"'+text.replace(/"/g,'""')+'"':text;
}
function downloadProductTemplate(){
 const rows=[productImportColumns,['Sample Product','', '120.00','Piece','Product description','0','Yes']];
 const csv='\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='digital-showroom-products-template.csv';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function parseProductCsv(text){
 const rows=[],row=[];let current='',quoted=false;
 text=String(text||'').replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){
   if(c==='"'&&text[i+1]==='"'){current+='"';i++;}
   else if(c==='"')quoted=false;
   else current+=c;
  }else if(c==='"'){if(current!=='')throw Error('Invalid quotation marks in CSV.');quoted=true;}
  else if(c===','){row.push(current);current='';}
  else if(c==='\n'||c==='\r'){
   row.push(current);if(row.some(x=>x.trim()!==''))rows.push([...row]);
   row.length=0;current='';if(c==='\r'&&text[i+1]==='\n')i++;
  }else current+=c;
 }
 if(quoted)throw Error('Unclosed quotation marks in CSV.');
 row.push(current);if(row.some(x=>x.trim()!==''))rows.push([...row]);
 return rows;
}
function productImportPanel(){
 return '<section class="panel product-import-panel">'+
  '<div class="product-import-heading"><h2>Import Products</h2>'+button('Download Template','import-template')+'</div>'+
  '<div class="field product-import-field"><label for="importCsvFile">Choose Excel CSV File</label>'+
  '<div class="product-import-picker"><input type="file" id="importCsvFile" accept=".csv,text/csv" aria-describedby="importFileName">'+
  '<span class="product-import-picker-label" aria-hidden="true">Choose File</span>'+
  '<span id="importFileName" class="product-import-filename">No file selected</span></div></div>'+
  '<div id="productImportNotice" class="product-import-notice" role="status" aria-live="polite" hidden></div>'+
  '<div id="productImportPreview"></div><div class="inline-actions product-import-actions">'+
  '<button type="button" id="importSave" class="btn primary" disabled>Import Products</button> '+
  button('Cancel','cancel')+'</div></section>';
}
function previewProductImport(){
 const target=$('productImportPreview');if(!target)return;
 if(!productImportRows.length){target.replaceChildren();$('importSave').disabled=true;return;}
 const head=['Product','Category','Price','Unit','Order','Visible'];
 const tbody=productImportRows.map(p=>'<tr><td>'+esc(p.name)+'</td><td>'+esc(p.category||'—')+'</td><td>'+esc(p.price||'On request')+'</td><td>'+esc(p.unit)+'</td><td>'+esc(p.display_order)+'</td><td>'+esc(p.visible)+'</td></tr>').join('');
 target.innerHTML='<p><b>'+productImportRows.length+' products ready for review</b></p>'+wrapTable(head,tbody);
 $('importSave').disabled=false;
}
async function loadProductImport(file){
 productImportRows=[];previewProductImport();
 const notice=$('productImportNotice');
 notice.hidden=true;notice.textContent='';notice.classList.remove('error');
 if(!file)return;
 try{
  if(file.size>1024*1024)throw Error('The CSV must be below 1 MB.');
  const table=parseProductCsv(await file.text());
  if(!table.length)throw Error('CSV is empty.');
  const header=table.shift().map(v=>v.trim().toLowerCase());
  if(header.length!==productImportColumns.length||header.some((col,i)=>col!==productImportColumns[i].toLowerCase()))
   throw Error('CSV headings do not match the template. Download and use the template.');
  if(!table.length||table.length>100)throw Error('Enter between 1 and 100 products.');
  const categories=new Set((data.categories||[]).map(c=>c.name.trim().toLowerCase()));
  const existing=new Set((data.products||[]).map(p=>p.name.trim().toLowerCase()));
  const seen=new Set();
  productImportRows=table.map((cells,i)=>{
   const line=i+2;
   if(cells.length!==7)throw Error('Incorrect number of columns on row '+line);
   const [name,category,price,unit,description,display_order,visible]=cells.map(v=>v.trim());
   if(!name||name.length>180)throw Error('Invalid product name on row '+line);
   if(seen.has(name.toLowerCase())||existing.has(name.toLowerCase()))throw Error('Duplicate product on row '+line+': '+name);
   seen.add(name.toLowerCase());
   if(category&&!categories.has(category.toLowerCase()))throw Error('Create category "'+category+'" first (row '+line+').');
   if(price&&!/^(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,2})?$/.test(price)&&price.toLowerCase()!=='on request')throw Error('Invalid price on row '+line);
   if(!(unit||'Piece')||unit.length>30)throw Error('Invalid unit on row '+line);
   if(description.length>2500)throw Error('Description too long on row '+line);
   if(!/^\d{1,6}$/.test(display_order||'0')||Number(display_order||0)>999999)throw Error('Invalid order on row '+line);
   if(!['yes','no'].includes((visible||'yes').toLowerCase()))throw Error('Visible must be Yes or No on row '+line);
   return {name,category,price,unit:unit||'Piece',description,display_order:display_order||'0',visible:visible||'Yes'};
  });
  if(data.products.length+productImportRows.length>data.free_product_limit)throw Error('Product limit exceeded. You have '+data.products.length+' products, and your limit is '+data.free_product_limit+'.');
  previewProductImport();
 }catch(error){productImportRows=[];previewProductImport();notice.hidden=false;notice.classList.add('error');notice.textContent=error.message;}
}
async function submitProductImport(){
 const button=$('importSave'),notice=$('productImportNotice');
 if(!button||!productImportRows.length)return;
 button.disabled=true;button.textContent='Importing...';
 try{
  const result=await api('product-import',{rows:productImportRows});
  if(!result.ok)throw Error('Import not confirmed.');
  productImportRows=[];view='products';await refresh();
  flash(result.created+' products imported successfully.');
 }catch(error){notice.hidden=false;notice.classList.add('error');notice.textContent=error.message;button.disabled=false;button.textContent='Import Products';}
}

let galleryDrafts=[];
let galleryBusy=false;
function galleryImportPanel(){
 const available=Math.max(0,Number(data.free_product_limit)-data.products.length);
 return panel('Add Products from Gallery',
 '<div class="field"><label>Select Product Photos</label><div class="gallery-file-picker"><label class="btn soft gallery-file-button" for="galleryBulkFile">Choose Photos</label><input id="galleryBulkFile" class="gallery-file-input" type="file" multiple accept="image/jpeg,image/png,image/webp"><span id="galleryFileCount" aria-live="polite">No photos selected</span></div></div>'+
 '<div id="galleryBulkMessage" role="status" aria-live="polite" class="gallery-bulk-notice" hidden></div>'+
 '<div id="galleryBulkRows" class="gallery-bulk-rows"></div>'+
 '<div class="inline-actions" style="margin-top:12px"><button id="galleryBulkSave" type="button" class="btn primary" disabled>Save Products</button> '+
 button('Cancel','cancel')+'</div>');
}
function galleryDraftName(filename){
 const base=filename.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();
 return base.slice(0,180)||'New Product';
}
function addGalleryDrafts(files){
 const message=$('galleryBulkMessage');
 const available=Math.max(0,Number(data.free_product_limit)-data.products.length);
 if(files.length+galleryDrafts.length>Math.min(30,available)){message.hidden=false;message.textContent='Select up to '+Math.min(30,available)+' products within your product allowance.';return;}
 for(const file of files){
  if(!/^image\/(jpeg|png|webp)$/.test(file.type)){message.hidden=false;message.textContent='Only JPG, PNG and WebP photos are supported.';return;}
 }
 for(const file of files)galleryDrafts.push({file,preview:URL.createObjectURL(file),name:galleryDraftName(file.name),category_id:'',price:'',unit:'Piece',url:null});
 renderGalleryDrafts();
 message.textContent='';message.hidden=true;
}
function clearGalleryDrafts(){
 for(const draft of galleryDrafts)URL.revokeObjectURL(draft.preview);
 galleryDrafts=[];galleryBusy=false;
}
function renderGalleryDrafts(){
 const counter=$('galleryFileCount');
 if(counter)counter.textContent=galleryDrafts.length?(galleryDrafts.length===1?'1 photo selected':galleryDrafts.length+' photos selected'):'No photos selected';
 const picker=$('galleryBulkFile');
 const pickerLabel=document.querySelector('.gallery-file-button');
 if(pickerLabel)pickerLabel.textContent=galleryDrafts.length?'Add More Photos':'Choose Photos';

 const holder=$('galleryBulkRows');if(!holder)return;holder.replaceChildren();
 const categoryChoices='<option value="">No Category</option>'+data.categories.map(c=>'<option value="'+c.id+'">'+esc(c.name)+'</option>').join('');
 galleryDrafts.forEach((draft,index)=>{
  const card=document.createElement('div');card.className='gallery-bulk-card';
  const photo=document.createElement('img');photo.src=draft.preview;photo.alt='Photo for product '+(index+1);card.append(photo);
  const fields=document.createElement('div');fields.className='gallery-bulk-fields';
  fields.innerHTML='<div class="field"><label>Product Name *</label><input class="gallery-name" required maxlength="180"></div>'+
  '<div class="gallery-bulk-line"><div class="field"><label>Category</label><select class="gallery-category">'+categoryChoices+'</select></div>'+
  '<div class="field"><label>Price (₹)</label><input class="gallery-price" type="text" inputmode="decimal" placeholder="On request"></div>'+
  '<div class="field"><label>Unit</label><input class="gallery-unit" type="text" maxlength="30"></div></div>';
  fields.querySelector('.gallery-name').value=draft.name;
  fields.querySelector('.gallery-category').value=draft.category_id;
  fields.querySelector('.gallery-price').value=draft.price;
  fields.querySelector('.gallery-unit').value=draft.unit;
  for(const [selector,key] of [['.gallery-name','name'],['.gallery-category','category_id'],['.gallery-price','price'],['.gallery-unit','unit']]){
   fields.querySelector(selector).addEventListener('input',e=>{draft[key]=e.target.value;});
  }
  const remove=document.createElement('button');remove.className='btn sm soft gallery-remove';remove.type='button';remove.textContent='Remove';
  remove.disabled=galleryBusy;remove.onclick=()=>{URL.revokeObjectURL(draft.preview);galleryDrafts.splice(index,1);renderGalleryDrafts();};
  fields.append(remove);card.append(fields);holder.append(card);
 });
 const button=$('galleryBulkSave');if(button)button.disabled=galleryBusy||!galleryDrafts.length;
}
async function saveGalleryDrafts(){
 if(galleryBusy||!galleryDrafts.length)return;
 const message=$('galleryBulkMessage'),button=$('galleryBulkSave');
 const available=Math.max(0,Number(data.free_product_limit)-data.products.length);
 if(galleryDrafts.length>available){message.hidden=false;message.textContent='Product limit reached; no products created.';return;}
 const names=new Set((data.products||[]).map(p=>p.name.trim().toLowerCase()));
 for(let i=0;i<galleryDrafts.length;i++){
  const d=galleryDrafts[i],name=d.name.trim(),price=d.price.trim(),unit=d.unit.trim();
  if(!name||name.length>180){message.hidden=false;message.textContent='Enter a product name for photo '+(i+1);return;}
  if(names.has(name.toLowerCase())){message.hidden=false;message.textContent='Duplicate product name: '+name;return;}
  names.add(name.toLowerCase());
  if(price&&!/^(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,2})?$/.test(price)&&price.toLowerCase()!=='on request'){
   message.hidden=false;message.textContent='Invalid price for '+name;return;
  }
  if(!unit||unit.length>30){message.hidden=false;message.textContent='Enter a valid unit for '+name;return;}
 }
 galleryBusy=true;button.disabled=true;button.textContent='Saving...';
 const input=$('galleryBulkFile');if(input)input.disabled=true;
 try{
  for(let i=0;i<galleryDrafts.length;i++){
   const draft=galleryDrafts[i];
   if(draft.url)continue;
   message.hidden=false;message.textContent='Uploading photo '+(i+1)+' of '+galleryDrafts.length+'...';
   const blob=await prepareProductImage(draft.file);
   const fd=new FormData();fd.append('image',blob);
   const response=await fetch('/api/upload.php',{method:'POST',headers:{'X-CSRF-Token':csrf},body:fd,credentials:'same-origin'});
   const result=await response.json();
   if(!response.ok||!result.url)throw Error(result.error||'Photo upload failed.');
   draft.url=result.url;
  }
  message.hidden=false;message.textContent='Saving '+galleryDrafts.length+' products...';
  const rows=galleryDrafts.map(d=>({name:d.name.trim(),category_id:d.category_id,price:d.price.trim(),unit:d.unit.trim(),image_url:d.url}));
  const result=await api('gallery-product-import',{rows});
  if(!result.ok)throw Error('The server did not confirm the products.');
  const count=result.created;clearGalleryDrafts();await refresh();
  flash(count+' products created from gallery photos.');
 }catch(error){
  message.hidden=false;message.textContent=error.message||'Products could not be saved.';
 }finally{
  galleryBusy=false;
  if(button&&button.isConnected){button.disabled=false;button.textContent='Save Products';}
  if(input&&input.isConnected)input.disabled=false;
 }
}
function productForm(id){
 const p=data.products.find(v=>v.id==id)||{name:'',description:'',category_id:'',price:'',image_url:'',active:1};
 const cats='<option value="">No Category</option>'+data.categories.map(c=>'<option value="'+c.id+'" '+(c.id==p.category_id?'selected':'')+'>'+esc(c.name)+'</option>').join('');
 const photos='<input type="hidden" id="productImage" value="'+esc(p.image_url||'')+'"><div class="field product-photo-field"><label for="productImageFile">Product Photos (up to 6)</label><input type="file" id="productImageFile" accept="image/jpeg,image/png,image/webp" multiple><div id="productGalleryMessage" class="hint" role="status" aria-live="polite"></div><div id="productGallery" class="product-gallery" aria-label="Selected product photos"></div></div>';
 const basic='<div class="product-quick-fields">'+field('Product Name *','productName',p.name,'text','required maxlength="180"')+field('Price (₹) — blank means on request','productPrice',p.price===null?'':p.price,'text','inputmode="decimal" pattern="[0-9]+([.][0-9]{1,2})?" title="Up to 2 decimal places"')+'</div>';
 const extra='<details class="product-more" '+(id?'open':'')+'><summary>More Product Details</summary><div class="form-grid"><div class="field"><label for="productCat">Category</label><select id="productCat">'+cats+'</select></div>'+field('Unit','productUnit',p.unit||'Piece','text','required maxlength="30" list="productUnitOptions"')+field('Display Order','productOrder',p.display_order??0,'text','inputmode="numeric" pattern="[0-9]+" maxlength="6" required')+'</div><div class="field"><label for="productDesc">Description</label><textarea id="productDesc" maxlength="2500">'+esc(p.description||'')+'</textarea></div></details>';
 return panel(id?'Edit Product':'Add Product','<form id="productForm" class="product-quick-form" data-id="'+(id||'')+'">'+photos+basic+extra+'<datalist id="productUnitOptions"><option value="Piece"><option value="Kg"><option value="Gram"><option value="Box"><option value="Pack"><option value="Set"><option value="Litre"></datalist><label class="product-visibility"><input type="checkbox" id="productActive" '+(+p.active?'checked':'')+'><span>Visible in public showroom</span></label><div class="product-save-row"><button type="submit" class="btn primary">Save Product</button> '+button('Cancel','cancel')+'</div></form>');
}
function categoryForm(id){
 const c=data.categories.find(v=>v.id==id)||{name:''};return panel(id?'Edit Category':'Add Category','<form id="categoryForm" data-id="'+(id||'')+'">'+field('Category Name *','categoryName',c.name,'text','required maxlength="120"')+'<button type="submit" class="btn primary">Save Category</button> '+button('Cancel','cancel')+'</form>');
}
function cataloguesPanel(){
 const rows=data.catalogues.map(c=>'<tr><td>'+esc(c.name)+'</td><td>'+data.catalogue_products.filter(i=>i.catalogue_id==c.id).length+'</td><td>'+tdActions('edit-catalogue-'+c.id,'delete-catalogue-'+c.id)+'</td></tr>').join('');
 return sellerPanel(wrapTable(['Catalogue','Products','Actions'],rows),button('＋ Add Catalogue','new-catalogue','primary'));
}
function catalogueForm(id){
 const c=data.catalogues.find(v=>v.id==id)||{name:''};
 const chosen=data.catalogue_products.filter(v=>v.catalogue_id==id).map(v=>+v.product_id);
 const choices=data.products.map(p=>'<label class="catalogue-product-choice"><input type="checkbox" name="catalogueProduct" value="'+p.id+'" '+(chosen.includes(+p.id)?'checked':'')+'><span>'+esc(p.name)+'</span></label>').join('');
 return panel(id?'Edit Catalogue':'Add Catalogue','<form id="catalogueForm" class="catalogue-form" data-id="'+(id||'')+'">'+
 field('Catalogue Name *','catalogueName',c.name,'text','required maxlength="130"')+
 '<div class="field"><label>Select Products</label><div class="catalogue-product-list">'+(choices||'<p class="muted">Add products first</p>')+'</div></div>'+
 '<div class="catalogue-actions"><button class="btn primary" type="submit">Save Catalogue</button> '+button('Cancel','cancel')+'</div></form>');
}
function statusPanel(){
 const products=data.products.filter(p=>+p.active);
 const choices=products.map(p=>'<label class="status-product-option"><input type="checkbox" class="statusPick" value="'+Number(p.id)+'"><span>'+esc(p.name)+'</span></label>').join('');
 return sellerPanel(
 '<div class="status-maker-config"><div class="field"><label for="statusTemplate">Design Template</label><select id="statusTemplate"><option value="classic">Classic</option><option value="modern">Modern</option><option value="minimal">Minimal</option></select></div></div>'+
 '<div class="status-product-heading"><strong>Select Products</strong><div class="inline-actions"><button class="btn sm soft" type="button" id="statusSelectAll">Select All</button><button class="btn sm soft" type="button" id="statusClearSelection">Clear</button></div></div>'+
 '<div class="status-products">'+(choices||'<p class="muted">Add a visible product first.</p>')+'</div>'+
 '<div class="status-maker-toolbar"><button class="btn primary" type="button" id="statusGenerate" '+(!products.length?'disabled':'')+'>Generate Images</button><span id="statusGeneratorMessage" role="status" aria-live="polite"></span></div>'+
 '<div id="statusOutput" class="status-results"></div>');
}
function sharePanel(){
 const modes=[['poster','QR Poster','▦'],['card','Business Card','▤'],['social','Social Media Post','▧'],['status','WhatsApp Status','◉']];
 const tabs='<div class="share-kit-tabs" role="group" aria-label="Design format">'+modes.map(([id,label,icon])=>'<button type="button" data-do="share-'+id+'" class="share-kit-tab '+(shareMode===id?'active':'')+'" aria-pressed="'+(shareMode===id)+'"><span aria-hidden="true">'+icon+'</span> '+label+'</button>').join('')+'</div>';
 if(shareMode==='status')return tabs+statusPanel();
 const choices=data.products.filter(p=>+p.active).map(p=>'<option value="'+Number(p.id)+'">'+esc(p.name)+'</option>').join('');
 const templates=['Classic','Modern','Minimal'].map((label,index)=>'<label class="share-kit-template"><input type="radio" name="shareKitStyle" value="'+label.toLowerCase()+'" '+(index===0?'checked':'')+'><span><i aria-hidden="true"></i>'+label+'</span></label>').join('');
 const config='<div class="share-kit-config"><fieldset><legend>Design Template</legend><div class="share-kit-templates">'+templates+'</div></fieldset>'+
 (shareMode==='social'?'<div class="field"><label for="shareKitProduct">Select Product</label><select id="shareKitProduct">'+choices+'</select></div>':'')+
 '<label class="share-kit-check"><input id="shareKitLogo" type="checkbox" role="switch" checked> Show Shop Logo</label>'+
 '<label class="share-kit-check"><input id="shareKitTagline" type="checkbox" role="switch" checked> Show Tagline</label>'+
 '<label class="share-kit-check"><input id="shareKitPhone" type="checkbox" role="switch" checked> Show WhatsApp Number</label>'+
 '<p class="muted">Digital Showroom branding is included on Free designs.</p></div>';
 const preview='<section class="share-kit-output"><div class="share-kit-preview-toolbar"><h2>Preview</h2><div class="inline-actions"><button type="button" id="shareKitPrint" class="btn sm soft" disabled>Print / Save PDF</button><button type="button" id="shareKitEnlarge" class="btn sm soft" disabled>Enlarge</button></div></div><div class="share-kit-preview" id="shareKitPreview"></div><div id="shareKitMessage" role="status" aria-live="polite">Generating preview…</div></section>';
 const dialog='<dialog class="share-kit-dialog" id="shareKitDialog" aria-label="Enlarged design preview"><form method="dialog"><button class="btn sm soft" autofocus>Close</button></form><img id="shareKitLargeImage" alt="Enlarged promotional design"></dialog>';
 return tabs+'<div class="share-kit-workspace">'+config+preview+'</div>'+dialog;
}
function adminDashboard(){
 const s=data.stats;
 const shops=adminShops();
 const plans=panel('Subscriptions','<p class="muted">Paid subscriptions and Razorpay are planned for the next development phase.</p>');
 return '<div class="stats">'+statLink('Registered Sellers',s.sellers,'blue','','shops')+statLink('Shops',s.shops,'green','','shops')+statLink('Products',s.products,'amber','','shops')+statLink('Free Product Limit',s.free_product_limit,'purple','','plans')+'</div><div class="columns"><div>'+shops+'</div><div>'+plans+'</div></div>';
}
function adminShops(showHeading=true){
 const rows=data.shops.map(s=>'<tr><td>'+esc(s.owner)+'</td><td>'+esc(s.name)+'</td><td>'+esc(s.products)+'</td><td><span class="pill '+(!+s.active?'off':'')+'">'+(+s.active?'Active':'Disabled')+'</span></td><td>'+button(+s.active?'Disable':'Enable','status-'+s.id+'-'+(+s.active?0:1),'outline')+' <a target="_blank" class="btn sm soft" href="/'+encodeURIComponent(s.slug)+'">View</a></td></tr>').join('');
 return showHeading?panel('Seller & Shop Management',wrapTable(['Seller','Shop','Products','Status','Actions'],rows)):sellerPanel(wrapTable(['Seller','Shop','Products','Status','Actions'],rows));
}
let planRecords=[],plansLoaded=false,plansLoading=false,plansError='',planEditing=null;
const planFeatureNames=[['analytics','Analytics'],['whatsapp_status','WhatsApp Status'],['enquiry_inbox','Enquiry Inbox'],['excel_import','Excel Product Import'],['gallery_upload','Gallery Bulk Upload'],['catalogue_pdf','Catalogue PDF'],['remove_branding','Remove Showroom Branding']];
function planText(value){return value===null||value===undefined?'Unlimited':String(value);}
function adminPlans(){
 if(plansError)return sellerPanel('<div class="notice error">'+esc(plansError)+'</div>'+button('Retry','retry-plans','primary'));
 if(!plansLoaded)return sellerPanel('<p class="muted">Loading plans...</p>');
 const rows=planRecords.map(p=>{
  const monthly=Number(p.monthly_price).toFixed(2),annual=Number(p.annual_price).toFixed(2);
  return '<tr><td><strong>'+esc(p.name)+'</strong></td>'+
  '<td>₹'+monthly+'</td><td>₹'+annual+'</td><td>'+esc(planText(p.product_limit))+'</td>'+
  '<td>'+esc(planText(p.catalogue_limit))+'</td><td><span class="pill '+(!Number(p.active)?'off':'')+'">'+(Number(p.active)?'Active':'Inactive')+'</span></td>'+
  '<td><button class="btn sm soft" type="button" data-edit-plan="'+Number(p.id)+'">Edit</button></td></tr>';
 }).join('');
 const table='<div class="table-wrap"><table class="data-table plan-master-table"><thead><tr><th>Plan</th><th>Monthly (₹)</th><th>Annual (₹)</th><th>Products</th><th>Catalogues</th><th>Status</th><th>Action</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
 return '<section class="panel plan-master-panel"><div class="panel-head plan-master-actions"><button class="btn primary" type="button" id="addPlan">+ Add Plan</button></div>'+table+'<dialog class="plan-editor-dialog" id="planEditorDialog" aria-labelledby="planEditorTitle"><div id="planEditorArea"></div></dialog>'+
 '</section>';
}
function planEditor(id){
 const plan=id?planRecords.find(p=>Number(p.id)===Number(id)):null;
 if(id&&!plan)return;
 planEditing=plan||null;
 const free=plan?.code==='free',editing=!!plan;
 const features=plan?.features||{analytics:true,whatsapp_status:true,enquiry_inbox:true,excel_import:false,gallery_upload:false,catalogue_pdf:false,remove_branding:false};
 const checkbox=(name,label)=>'<label class="plan-feature"><input type="checkbox" data-plan-feature="'+name+'" '+(features[name]?'checked':'')+'>'+label+'</label>';
 const val=(value)=>esc(value===null||value===undefined?'':value);
 const form='<form id="planForm"><div class="panel-head"><h2 id="planEditorTitle">'+(editing?'Edit Plan':'Add Plan')+'</h2><button type="button" class="btn sm soft" id="cancelPlan">Cancel</button></div>'+
 '<div class="form-grid">'+
 '<div class="field"><label for="planName">Plan Name *</label><input id="planName" maxlength="100" required value="'+val(plan?.name)+'"></div>'+
 '<div class="field"><label for="planMonthly">Monthly Price (₹) *</label><input id="planMonthly" inputmode="decimal" pattern="[0-9]+([.][0-9]{1,2})?" required '+(free?'readonly':'')+' value="'+val(plan?.monthly_price??'0.00')+'"></div>'+
 '<div class="field"><label for="planAnnual">Annual Price (₹) *</label><input id="planAnnual" inputmode="decimal" pattern="[0-9]+([.][0-9]{1,2})?" required '+(free?'readonly':'')+' value="'+val(plan?.annual_price??'0.00')+'"></div>'+
 '<div class="field"><label for="planProductLimit">Product Limit'+(free?' *':'')+'</label><input id="planProductLimit" inputmode="numeric" pattern="[0-9]+" '+(free?'required':'')+' value="'+val(plan?.product_limit)+'"></div>'+
 '<div class="field"><label for="planCatalogueLimit">Catalogue Limit</label><input id="planCatalogueLimit" inputmode="numeric" pattern="[0-9]+" value="'+val(plan?.catalogue_limit)+'"></div>'+
 '<div class="field"><label for="planPhotosLimit">Photos per Product *</label><input id="planPhotosLimit" inputmode="numeric" pattern="[1-6]" required value="'+val(plan?.photos_per_product??6)+'"></div>'+
 '<div class="field"><label for="planSort">Display Order</label><input id="planSort" inputmode="numeric" pattern="[0-9]+" value="'+val(plan?.sort_order??30)+'" required></div>'+
 
 '</div><div class="plan-feature-head">Plan Features</div><div class="plan-feature-grid">'+planFeatureNames.map(([k,n])=>checkbox(k,n)).join('')+'</div>'+
 '<label class="plan-feature plan-active"><input type="checkbox" id="planActive" '+(free?'checked disabled':Number(plan?.active)?'checked':'')+'>Active</label>'+
 '<div class="plan-editor-actions"><button class="btn primary" type="submit" id="planSave">Save Plan</button><span id="planMessage" role="alert" aria-live="polite"></span></div></form>';
 const dialog=$('planEditorDialog'),area=$('planEditorArea');if(!dialog||!area)return;
 area.innerHTML=form;
 $('cancelPlan').onclick=()=>dialog.close();
 dialog.onclose=()=>{planEditing=null;area.replaceChildren();};
 $('planForm').onsubmit=savePlan;
 if(typeof dialog.showModal==='function')dialog.showModal();
 else dialog.setAttribute('open','');
 $('planName')?.focus();
}
async function savePlan(event){
 event.preventDefault();
 const form=$('planForm'),save=$('planSave'),msg=$('planMessage');
 if(!form||!save)return;
 const free=planEditing?.code==='free';
 const features=Object.fromEntries(planFeatureNames.map(([key])=>[key,!!form.querySelector('[data-plan-feature="'+key+'"]')?.checked]));
 const payload={id:Number(planEditing?.id||0),name:$('planName').value.trim(),code:planEditing?.code||'',monthly_price:$('planMonthly').value.trim(),annual_price:$('planAnnual').value.trim(),product_limit:$('planProductLimit').value.trim(),catalogue_limit:$('planCatalogueLimit').value.trim(),photos_per_product:$('planPhotosLimit').value.trim(),sort_order:$('planSort').value.trim(),description:planEditing?.description||'',features,active:free||$('planActive').checked};
 save.disabled=true;save.textContent='Saving...';msg.textContent='';
 try{
  await api('plan-save',payload);
  plansLoaded=false;planEditing=null;
  await loadPlans();
  // Keep Admin dashboard Free limit metric in sync.
  if(data?.role==='admin')data.stats.free_product_limit=Number(planRecords.find(p=>p.code==='free')?.product_limit||0);
  flash('Plan saved successfully');
 }catch(error){msg.textContent=error.message||'Plan not saved';msg.className='plan-form-error';save.disabled=false;save.textContent='Save Plan';}
}
async function loadPlans(){
 if(plansLoading)return;
 plansLoading=true;plansError='';
 try{const result=await api('subscription-plans');planRecords=result.plans||[];plansLoaded=true;}
 catch(error){plansError=error.message;plansLoaded=false;}
 finally{plansLoading=false;if(view==='plans'&&data?.role==='admin')render();}
}
function wirePlans(){
 const add=$('addPlan');if(add)add.onclick=()=>planEditor(0);
 document.querySelectorAll('[data-edit-plan]').forEach(btn=>btn.onclick=()=>planEditor(Number(btn.dataset.editPlan)));
}
let sellerSubscriptionData=null,sellerSubscriptionLoading=false,sellerSubscriptionError='';
function subscriptionPrice(price,period){
 const n=Number(price);
 return Number.isFinite(n)&&n>0?'₹'+n.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})+' / '+period:'Price to be announced';
}
function sellerSubscriptionPanel(){
 if(sellerSubscriptionError)return '<section class="panel subscription-panel"><div class="notice error">'+esc(sellerSubscriptionError)+'</div>'+button('Retry','retry-subscription','primary')+'</section>';
 if(!sellerSubscriptionData)return '<section class="panel subscription-panel"><p class="muted">Loading subscription details...</p></section>';
 const info=sellerSubscriptionData,current=info.plans.find(p=>p.code==='free');
 const used=Number(info.product_usage)||0,limit=Number(info.free_product_limit)||0;
 const productAllowance=limit>0?used+' / '+limit:used+' / 0';
 const over=used>limit,atLimit=used>=limit;
 const usage='<div class="subscription-overview"><div class="subscription-metric"><span>Current Plan</span><strong>'+esc(current?.name||'Free')+'</strong></div>'+
 '<div class="subscription-metric"><span>Products Used</span><strong>'+esc(productAllowance)+'</strong>'+
 (over?'<small class="subscription-limit-warning">Existing products are retained; new products are restricted by the Free plan limit.</small>':atLimit?'<small>Product limit reached</small>':'')+'</div>'+
 '<div class="subscription-metric"><span>Catalogues</span><strong>'+Number(info.catalogue_usage||0)+'</strong></div></div>';
 const names={analytics:'Analytics',whatsapp_status:'WhatsApp Status',catalogue_pdf:'Catalogue PDF',remove_branding:'Remove Showroom Branding'};
 const plans=(info.plans||[]).map(p=>{
  const free=p.code==='free',active=Number(p.active)===1,priceMonthly=free?'Free':subscriptionPrice(p.monthly_price,'month'),priceAnnual=free?'Free':subscriptionPrice(p.annual_price,'year');
  const productLimit=p.product_limit===null?'Unlimited':Number(p.product_limit);
  const catalogueLimit=p.catalogue_limit===null?'Unlimited':Number(p.catalogue_limit);
  const enabledFeatures=Object.entries(names).filter(([key])=>p.features?.[key]===true).map(([,label])=>label);
  return '<div class="seller-plan-card '+(free?'seller-plan-current':'')+'"><div class="seller-plan-head"><h3>'+esc(p.name)+'</h3>'+(free?'<span class="seller-plan-state current">Current Plan</span>':'<span class="seller-plan-state">Coming Soon</span>')+'</div>'+
   (!free&&p.code!=='pro'&&p.description?'<p class="seller-plan-description">'+esc(p.description)+'</p>':'')+
   '<div class="seller-plan-pricing"><div><small>Monthly</small><strong>'+esc(priceMonthly)+'</strong></div><div><small>Annual</small><strong>'+esc(priceAnnual)+'</strong></div></div>'+
   '<div class="seller-plan-features"><div><span>Products</span><strong>'+esc(productLimit)+'</strong></div><div><span>Catalogues</span><strong>'+esc(catalogueLimit)+'</strong></div>'+
   (enabledFeatures.length?'<p>'+enabledFeatures.map(esc).join(' · ')+'</p>':'')+'</div>'+
   '<div class="seller-plan-footer">'+(free?'<span>Currently active</span>':'<button type="button" class="btn soft" disabled>Upgrade Unavailable</button>')+'</div></div>';
 }).join('');
 return '<section class="panel subscription-panel seller-subscription-panel">'+usage+
 '<h2 class="seller-plan-title">Available Plans</h2><div class="seller-plan-grid">'+plans+'</div>'+
 '</section>';
}
async function loadSellerSubscription(){
 if(sellerSubscriptionLoading)return;
 sellerSubscriptionLoading=true;sellerSubscriptionError='';
 try{sellerSubscriptionData=await api('seller-subscription');}
 catch(e){sellerSubscriptionError=e.message||'Could not load plans';sellerSubscriptionData=null;}
 finally{sellerSubscriptionLoading=false;if(view==='subscription'&&data?.role==='seller')render();}
}
function render(){
 nav();
 let html='',name='Dashboard';
 if(data.role==='admin'){
  if(view==='dashboard')html=adminDashboard();
  else if(view==='shops'){name='Seller & Shop Management';html=adminShops(false);}
  else if(view==='plans'){name='Subscription Plans';html=adminPlans();if(!plansLoaded&&!plansLoading&&!plansError)queueMicrotask(loadPlans);}
  else{ name='Payments';html=panel('Razorpay Payments','<p class="muted">Razorpay has not yet been integrated. No payment records are collected.</p>');}
 }else{
  if(view==='dashboard')html=sellerDashboard();
  if(view==='profile'){name='Shop Profile';html=profilePanel();}
  if(view==='products'){name='Products';html=productsPanel();}
  if(view==='categories'){name='Product Categories';html=categoryPanel();}
  if(view==='catalogues'){name='Catalogues';html=cataloguesPanel();}
  if(view==='enquiries'){name='Enquiry Inbox';html=enquiryPanel();if(!enquiryLoaded&&!enquiryLoading&&!enquiryError)queueMicrotask(loadEnquiries);}
  if(view==='analytics'){name='Analytics';html=analyticsPanel();if(!analyticsResult&&!analyticsLoading&&!analyticsError)queueMicrotask(fetchAnalytics);}
  if(view==='share'){name='Share Kit';html=sharePanel();}
  if(view==='public'){name='Public Showroom';html=panel('Share Your Shop','<div class="preview-link">'+esc(shopUrl())+'</div><p>'+button('Copy Link','copyLink')+' <a class="btn sm primary" href="'+esc(shopUrl())+'" target="_blank">Open Showroom ↗</a></p>');}
  if(view==='subscription'){
   name='Subscription';html=sellerSubscriptionPanel();
   if(!sellerSubscriptionData&&!sellerSubscriptionLoading&&!sellerSubscriptionError)queueMicrotask(loadSellerSubscription);
  }
 }
 title(name);
 const shareActions=$('shareKitHeaderActions');
 const showShareActions=data.role==='seller'&&view==='share';
 shareActions.hidden=!showShareActions;
 shareActions.innerHTML=showShareActions
  ?'<button type="button" class="btn soft" data-do="copyLink">Copy Shop Link</button>'+
   (shareMode==='status'?'':'<button type="button" class="btn primary" id="shareKitDownload" disabled>Download PNG</button>')
  :'';
 $('content').innerHTML=html;wireForms();
 // Actions are delegated below so buttons added after render() remain clickable.
}
async function refresh(){data=await api('dashboard');if(!(data.role==='admin'?adminViews:sellerViews).includes(view))view='dashboard';render();}
async function post(action,payload,success){try{await api(action,payload);flash(success||'Saved successfully');await refresh();}catch(e){flash(e.message,true)}}
async function prepareProductImage(file){
 if(!file.type.match(/^image\/(jpeg|png|webp)$/))throw Error('Choose JPG, PNG or WebP image.');
 const bitmap=await createImageBitmap(file);
 try{
  const maxSide=1600;
  const ratio=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height));
  const w=Math.max(1,Math.round(bitmap.width*ratio)),h=Math.max(1,Math.round(bitmap.height*ratio));
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Image processing unavailable.');
  // Use JPEG for product photos. White backing avoids black transparent areas.
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,h);
  ctx.drawImage(bitmap,0,0,w,h);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.82));
  if(!blob)throw Error('Could not compress this image.');
  if(blob.size>5*1024*1024)throw Error('Compressed photo exceeds 5 MB. Choose a smaller picture.');
  return new File([blob],(file.name.replace(/\.[^.]*$/,'')||'product')+'.jpg',{type:'image/jpeg'});
 }finally{bitmap.close();}
}
async function uploadImage(input,target){
 if(!input.files||!input.files[0])return;
 const file=input.files[0],isProduct=input.id==='productImageFile';
 input.disabled=true;
 const form=input.closest('form'),save=form?.querySelector('[type="submit"]');
 if(save)save.disabled=true;
 try{
  // Preserve original shop logos; automatically resize/compress product photos.
  const upload=isProduct?await prepareProductImage(file):file;
  const fd=new FormData();fd.append('image',upload);
  const res=await fetch('/api/upload.php',{method:'POST',headers:{'X-CSRF-Token':csrf},body:fd,credentials:'same-origin'});
  const out=await res.json();
  if(!res.ok)throw Error(out.error||'Upload failed');
  target.value=out.url;
  flash(isProduct?'Product image optimized and uploaded successfully':'Image uploaded successfully');
 }catch(e){flash(e.message||'Image upload failed',true)}
 finally{input.disabled=false;if(save)save.disabled=false;}
}
let pendingProductPhotos=[];
function renderProductGallery(){
 const output=$('productGallery'),primary=$('productImage');
 if(!output||!primary)return;
 primary.value=pendingProductPhotos[0]||'';
 output.replaceChildren();
 pendingProductPhotos.forEach((url,index)=>{
  const item=document.createElement('div');item.className='product-photo-item';
  const image=document.createElement('img');image.src=url;image.alt='Product photo '+(index+1);image.loading='lazy';item.append(image);
  const controls=document.createElement('div');controls.className='product-photo-actions';
  if(index===0){const text=document.createElement('span');text.textContent='Main';controls.append(text);}
  else{
   const main=document.createElement('button');main.type='button';main.textContent='Make main';main.onclick=()=>{
    const [selected]=pendingProductPhotos.splice(index,1);pendingProductPhotos.unshift(selected);renderProductGallery();
   };controls.append(main);
  }
  const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';
  remove.setAttribute('aria-label','Remove product photo '+(index+1));
  remove.onclick=()=>{pendingProductPhotos.splice(index,1);renderProductGallery();};
  controls.append(remove);item.append(controls);output.append(item);
 });
}
async function uploadProductPhotos(input){
 const selected=Array.from(input.files||[]);if(!selected.length)return;
 if(pendingProductPhotos.length+selected.length>6){
  $('productGalleryMessage').textContent='Maximum 6 photos per product. Remove photos before adding more.';
  input.value='';return;
 }
 const form=$('productForm'),save=form?.querySelector('[type="submit"]');
 input.disabled=true;if(save)save.disabled=true;
 let uploaded=0;
 try{
  for(const original of selected){
   $('productGalleryMessage').textContent='Uploading photo '+(uploaded+1)+' of '+selected.length+'…';
   const image=await prepareProductImage(original);
   const fd=new FormData();fd.append('image',image);
   const res=await fetch('/api/upload.php',{method:'POST',headers:{'X-CSRF-Token':csrf},body:fd,credentials:'same-origin'});
   const out=await res.json();if(!res.ok)throw Error(out.error||'Photo upload failed');
   if(typeof out.url!=='string'||!out.url.startsWith('/uploads/'))throw Error('Unexpected photo URL.');
   pendingProductPhotos.push(out.url);uploaded++;renderProductGallery();
  }
  $('productGalleryMessage').textContent=uploaded+' photo(s) uploaded. Click Save Product to retain these photos.';
 }catch(error){
  $('productGalleryMessage').textContent=uploaded+' photo(s) uploaded; '+(error.message||'upload failed')+'. You may retry.';
 }finally{input.value='';input.disabled=false;if(save)save.disabled=false;}
}
function wireForms(){
 if(view==='plans'&&data?.role==='admin')wirePlans();
 if(view==='share'){
  if(shareMode==='status'&&window.StatusMaker)window.StatusMaker.init(data.shop,data.products);
  else if(window.ShareKit){window.ShareKit.init(shareMode,data.shop,data.products);}
 }
 if(view==='analytics')wireAnalytics();

 if(view==='enquiries')wireEnquiryFilters();

 const galleryFiles=$('galleryBulkFile');
 if(galleryFiles)galleryFiles.onchange=()=>{addGalleryDrafts(Array.from(galleryFiles.files||[]));galleryFiles.value='';};
 const gallerySave=$('galleryBulkSave');
 if(gallerySave)gallerySave.onclick=saveGalleryDrafts;

 const csv=$('importCsvFile');
 if(csv)csv.onchange=()=>{const file=csv.files?.[0];const name=$('importFileName');if(name){name.textContent=file?.name||'No file selected';name.title=file?.name||'';}loadProductImport(file);};
 const importButton=$('importSave');
 if(importButton)importButton.onclick=submitProductImport;

 let uploader=$('shopLogoFile');if(uploader)uploader.onchange=()=>uploadImage(uploader,$('shopLogo'));
 uploader=$('productImageFile');if(uploader){
  const form=$('productForm'),id=Number(form?.dataset.id||0);
  const existing=data?.products?.find(p=>Number(p.id)===id);
  pendingProductPhotos=Array.isArray(existing?.images)?existing.images.slice(0,6):(existing?.image_url?[existing.image_url]:[]);
  renderProductGallery();
  uploader.onchange=()=>uploadProductPhotos(uploader);
 }
 {const f=$('shopForm');if(f)f.onsubmit=async e=>{e.preventDefault();const btn=f.querySelector('[type="submit"]');btn.disabled=true;try{const result=await api('shop',{owner_name:$('accountName').value.trim(),name:$('shopName').value,phone:$('shopPhone').value,tagline:$('shopTag').value,address:$('shopAddress').value,logo_url:$('shopLogo').value,theme_color:$('shopThemeColor').value});user.name=result.owner_name;updateSidebarAccount();await refresh();flash('Profile saved successfully');}catch(err){flash(err.message,true)}finally{btn.disabled=false;}};}
 {const f=$('productForm');if(f)f.onsubmit=e=>{e.preventDefault();post('product-save',{id:f.dataset.id?+f.dataset.id:0,name:$('productName').value,category_id:$('productCat').value,description:$('productDesc').value,price:$('productPrice').value,unit:$('productUnit').value.trim(),display_order:$('productOrder').value,image_url:$('productImage').value,images:[...pendingProductPhotos],active:$('productActive').checked},'Product saved');};}
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
 {const f=$('changePasswordForm');if(f)f.onsubmit=async e=>{
  e.preventDefault();
  const current=$('currentPassword').value,newPassword=$('newPassword').value,confirm=$('confirmPassword').value;
  const msg=$('passwordMessage');
  const show=(message,bad=false)=>{msg.className='notice '+(bad?'error':'success');msg.textContent=message;};
  if(newPassword.length<4){show('New password must be at least 4 characters.',true);return;}
  if(newPassword!==confirm){show('New Password and Confirm New Password do not match.',true);return;}
  const btn=f.querySelector('[type="submit"]');btn.disabled=true;btn.textContent='Updating...';
  try{
   const result=await api('change-password',{current_password:current,new_password:newPassword,confirm_password:confirm});
   f.reset();show(result.message||'Password updated successfully.');
  }catch(err){show(err.message,true);}
  finally{btn.disabled=false;btn.textContent='Update Password';}
 };}
 document.querySelectorAll('[data-eye]').forEach(button=>button.onclick=()=>{
  const input=$(button.dataset.eye);if(!input)return;
  const show=input.type==='password';input.type=show?'text':'password';
  const name=button.dataset.eye==='currentPassword'?'Current Password':button.dataset.eye==='newPassword'?'New Password':'Confirm New Password';
  button.setAttribute('aria-label',(show?'Hide ':'Show ')+name);
  button.setAttribute('aria-pressed',String(show));
  button.innerHTML=show?'<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1"/><path d="M6.3 6.3C3.6 8.3 2 12 2 12s3.5 7 10 7a10.7 10.7 0 0 0 4.1-.8"/><path d="M10 10a3 3 0 0 0 4 4"/></svg>':'<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
 });
}
// Handle dynamically inserted buttons (import template, cancel, edit, etc.).
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-do]');
 if(!button||button.disabled)return;
 event.preventDefault();
 doAction(button.dataset.do);
});
async function doAction(action){
 if(action==='copyLink'){try{await navigator.clipboard.writeText(shopUrl());flash('Shop link copied');}catch(e){flash('Copy unavailable in this browser',true)}return;}
 if(action==='retry-enquiries'){enquiryError='';enquiryLoaded=false;render();return;}
 if(action==='nav-status'){shareMode='status';navigateTo('share');return;}
 if(action.startsWith('share-')){shareMode=action.slice(6);if(!['poster','card','social','status'].includes(shareMode))shareMode='poster';render();return;}
 if(action==='nav-plans'){navigateTo('plans');return;}
 if(action==='retry-plans'){plansError='';plansLoaded=false;render();return;}
 if(action==='retry-subscription'){sellerSubscriptionData=null;sellerSubscriptionError='';render();return;}
 if(action==='import-template'){downloadProductTemplate();return;}
 if(action==='import-products'){productImportRows=[];$('content').innerHTML=productImportPanel();wireForms();return;}
 if(action==='gallery-products'){clearGalleryDrafts();$('content').innerHTML=galleryImportPanel();wireForms();return;}
 if(action==='cancel'){clearGalleryDrafts();render();return;}
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
window.showShareStatus=()=>{shareMode='status';render();};
function generateStatus(){
 if(window.StatusMaker)window.StatusMaker.generate();
 else flash('Image generator is unavailable. Refresh the page.',true);
}
$('logout').onclick=async()=>{const destination=user?.role==='admin'?'/admin-login.html':'/login.html';try{await api('logout',{});}finally{location.href=destination;}};
async function initializeDashboard(){
 try{
  const d=await api('me');
  if(!d.user){location.href='/login.html';return;}
  csrf=d.csrf;user=d.user;view=getViewFromUrl();updateSidebarAccount();
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
