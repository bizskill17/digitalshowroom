const el=id=>document.getElementById(id);
let csrf='';
function status(message,error=false){const box=el('setupStatus');box.className='notice setup-box'+(error?' error':'');box.textContent=message;}
async function checkSetup(){
 try{
  const res=await fetch('/api/admin-setup.php',{credentials:'same-origin',cache:'no-store'});
  const info=await res.json();if(!res.ok)throw Error(info.error||'Setup unavailable');
  csrf=info.csrf;el('setupForm').hidden=!info.available;
  status(info.available?'Setup available. Enter the one-time token to create your first administrator.':info.message||'Admin setup is closed.',!info.available);
 }catch(err){status(err.message,true);el('setupForm').hidden=true;}
}
el('togglePassword').onclick=()=>{const input=el('adminPassword'),button=el('togglePassword');const show=input.type==='password';input.type=show?'text':'password';button.textContent=show?'Hide':'Show';button.setAttribute('aria-label',show?'Hide password':'Show password');button.setAttribute('aria-pressed',String(show));};
el('setupForm').onsubmit=async event=>{
 event.preventDefault();const button=el('setupSubmit');button.disabled=true;button.textContent='Creating Admin…';
 try{
  const res=await fetch('/api/admin-setup.php',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({setup_token:el('setupToken').value,name:el('adminName').value.trim(),email:el('adminEmail').value.trim(),password:el('adminPassword').value})});
  const result=await res.json();if(!res.ok)throw Error(result.error||'Setup failed');
  el('setupForm').hidden=true;el('setupComplete').hidden=false;status('Administrator successfully created.');
 }catch(err){status(err.message,true);button.disabled=false;button.textContent='Create Administrator';}
};
checkSetup();