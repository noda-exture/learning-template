import {view,layout} from './views.mjs';
let state,busy=false,renderId=0;
window.dataLayer=window.dataLayer||[];
const track=e=>{if(e)window.dataLayer.push(e);};
async function render(){const id=++renderId;const res=await fetch('/api/state');if(!res.ok)throw new Error('ページを読み込めませんでした。');const next=await res.json();if(id!==renderId)return;state=next;const v=view(location.pathname.slice(4)||'/',state,'spa',location.search);if(v.redirect){history.replaceState({},'','/spa'+v.redirect);return render();}document.querySelector('#app').innerHTML=layout(v.html,state,'spa');document.title=v.title+' | Exture Store';track({event:'page_view',page_path:location.pathname+location.search,render_mode:'spa'});track(v.event);}
async function navigate(url){history.pushState({},'',url);await render();window.scrollTo(0,0);}
function fail(e){alert(e.message||'通信に失敗しました。');}
document.addEventListener('click',e=>{const a=e.target.closest('a');if(!a||a.hasAttribute('data-full')||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;const u=new URL(a.href);if(u.origin!==location.origin||!u.pathname.startsWith('/spa/'))return;e.preventDefault();navigate(u.pathname+u.search).catch(fail);});
document.addEventListener('submit',async e=>{const form=e.target;if(!form.closest('#app'))return;e.preventDefault();if(busy)return;const data=Object.fromEntries(new FormData(form,e.submitter));if(!form.dataset.action){navigate(form.action+'?'+new URLSearchParams(data)).catch(fail);return;}busy=true;const buttons=[...form.querySelectorAll('button'),...(e.submitter?[e.submitter]:[])];buttons.forEach(b=>b.disabled=true);try{const res=await fetch('/api/'+form.dataset.action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await res.json();if(form.dataset.action==='favorite'){
 if(!res.ok)throw new Error(result.error);
 state.favorites=result.favorites;
 document.querySelectorAll('[data-favorite-id]').forEach(b=>{const selected=result.favorites.includes(b.dataset.favoriteId);b.classList.toggle('saved',selected);b.setAttribute('aria-pressed',String(selected));b.setAttribute('aria-label',b.dataset.productName+'をお気に入り'+(selected?'から解除':'に登録'));b.textContent=selected?'♥ お気に入り登録済み':'♡ お気に入りに登録';});
 if(location.pathname==='/spa/account/favorites'&&!result.selected){document.querySelectorAll('[data-favorite-card]').forEach(card=>{if(!result.favorites.includes(card.dataset.favoriteCard))card.remove();});if(!result.favorites.length){const grid=document.querySelector('.product-grid');if(grid)grid.innerHTML='<p class="empty">お気に入りはまだありません。商品一覧から登録できます。</p>';}}
 const message=document.querySelector('#favorite-feedback');if(message)message.textContent=result.message;
 track(result.event);
 }else if(form.dataset.action==='add'){
 const feedback=document.querySelector('#cart-feedback');
 // 同じページ内で通知し、page_view/view_itemは追加発火させません。
 if(document.contains(form)){
 feedback.textContent=`HTTP ${res.status} — ${result.message||result.error}`;
 feedback.className='cart-feedback shown '+(res.ok?'success':'error');
 if(result.cart){state.cart=result.cart;document.querySelector('.count').textContent=result.cart.reduce((n,p)=>n+p.qty,0);}
 }
 if(res.ok)track(result.event);
 }else{if(!res.ok){const box=form.querySelector('#flow-feedback');if(box){box.textContent=`HTTP ${res.status} — ${result.error}`;box.className='cart-feedback shown error';return;}throw new Error(result.error);}track(result.event);await navigate('/spa'+result.next);}}catch(err){if(form.dataset.action==='add'&&document.contains(form)){const feedback=document.querySelector('#cart-feedback');feedback.textContent='通信に失敗しました。HTTPステータスは取得できませんでした。';feedback.className='cart-feedback shown error';}else fail(err);}finally{busy=false;buttons.forEach(b=>b.disabled=false);}});
window.addEventListener('popstate',()=>render().catch(fail));
render().catch(fail);
