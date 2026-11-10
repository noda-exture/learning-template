import {normalizeEmail,validEmail,hashPassword,verifyPassword,memberFields,hydrateMember,publicState} from './accounts.mjs';
import {injectCommonTags} from './common-tags.mjs';
import {payments,totals,checkoutRedirect} from '../public/checkout.mjs';
import {randomUUID} from 'node:crypto';
import {products} from '../public/catalog.mjs';
import {view,layout,esc,staticGallery} from '../public/views.mjs';
import {cookieConfig as cfg} from '../config/lab.mjs';
const json=v=>JSON.stringify(v).replace(/</g,'\\u003c');
export function makeApp(store,assets,listPages=async()=>[],loadTags=async()=>({})){return async function handle(req){
 const u=new URL(req.url), path=u.pathname;
 const cookies=Object.fromEntries((req.headers.get('cookie')||'').split(';').map(v=>v.trim().split(/=(.*)/s)).filter(v=>v[0]));
 let sid=cookies.lab_session, state=sid&&await store.get(sid);
 if(!state){sid=randomUUID();state={csrf:randomUUID(),cart:[],orders:[],user:null,checkoutToken:randomUUID()};}
 state.favorites??=[];
 const accountKey='accounts:v1';
 const accounts=await store.get(accountKey)||[];
 // 旧デモセッションは初回アクセス時に会員保存形式へ移行します。
 if(state.user&&!state.user.id){
 let demo=accounts.find(a=>a.id==='demo');
 if(!demo){demo={id:'demo',email:'demo@example.test',profile:state.profile||{name:state.user.name,email:'demo@example.test'},favorites:state.favorites,orders:state.orders};accounts.push(demo);await store.set(accountKey,accounts);}
 hydrateMember(state,demo);
 }
 if(state.user?.id){const member=accounts.find(a=>a.id===state.user.id);if(member)hydrateMember(state,member);else{state.user=null;state.profile=undefined;state.orders=[];state.favorites=[];}}
 if(state.registration?.expires<=Date.now())delete state.registration;

 const secure=u.protocol==='https:';
 const headers=new Headers({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
 headers.append('Set-Cookie',`lab_session=${sid}; Path=/; HttpOnly; SameSite=Lax${secure?'; Secure':''}`);
 const fp=cookies[cfg.name]&&/^[0-9a-f-]{36}$/i.test(cookies[cfg.name])?cookies[cfg.name]:randomUUID();
 if(cfg.enabled)headers.append('Set-Cookie',`${cfg.name}=${fp}; Path=${cfg.path}; Max-Age=${cfg.maxAge}; SameSite=${cfg.sameSite}${cfg.httpOnly?'; HttpOnly':''}${cfg.secure===true||(cfg.secure==='auto'&&secure)?'; Secure':''}`);
 async function respond(body,status=200,type='text/html; charset=utf-8'){if(type.startsWith('text/html')&&!(status>=300&&status<400)){const html=typeof body==='string'?body:new TextDecoder().decode(body);body=injectCommonTags(html,await loadTags());}if(state.user?.id){const member=accounts.find(a=>a.id===state.user.id);if(member){for(const field of memberFields)member[field]=structuredClone(state[field]??(field==='profile'?{}:[]));await store.set(accountKey,accounts);}}await store.set(sid,state);headers.set('Content-Type',type);return new Response(body,{status,headers});}
 async function rotateSession(){const old=sid;sid=randomUUID();state.csrf=randomUUID();await store.set(old,null);headers.delete('Set-Cookie');headers.append('Set-Cookie',`lab_session=${sid}; Path=/; HttpOnly; SameSite=Lax${secure?'; Secure':''}`);if(cfg.enabled)headers.append('Set-Cookie',`${cfg.name}=${fp}; Path=${cfg.path}; Max-Age=${cfg.maxAge}; SameSite=${cfg.sameSite}${cfg.httpOnly?'; HttpOnly':''}${cfg.secure===true||(cfg.secure==='auto'&&secure)?'; Secure':''}`);}
 const api=(body,status=200)=>respond(json(body),status,'application/json; charset=utf-8');
 const redirect=loc=>{headers.set('Location',new URL(loc,u.origin).pathname+new URL(loc,u.origin).search);return respond('',303);};
 try{
 if(req.method==='POST'){
 if(req.headers.get('origin')!==u.origin)return api({error:'送信元を確認できません。'},403);
 const data=req.headers.get('content-type')?.includes('application/json')?await req.json():Object.fromEntries(await req.formData());
 if(data.csrf!==state.csrf)return api({error:'ページを再読み込みしてください。'},403);
 const productPost=path.match(/^\/classic\/product\/([^/]+)$/);
 const action=productPost?'add':path.match(/^\/(?:api|classic\/action)\/(add|remove|login|logout|purchase|cart|shipping|payment|finish|favorite|profile|register-review|register-confirm|register-finish)$/)?.[1];
 let next='/cart',event=null;
 const flowPaths={cart:'/cart',shipping:'/checkout/shipping',payment:'/checkout/payment',purchase:'/checkout/confirm',finish:'/complete/'+String(data.orderId||''),login:'/login',profile:'/account/profile','register-review':'/register','register-confirm':'/register/confirm','register-finish':'/register/complete'};
 const flowError=(status,message)=>{
 if(path.startsWith('/api/'))return api({error:message,status},status);
 const v=view(flowPaths[action]||'/cart',state,'classic','',{status,message,scenario:data.scenario||'200',values:data});
 if(v.redirect)return respond(`<html><head><title>登録内容の確認 | Exture Store</title></head><body><p>${esc(message)}</p><a href="/classic${esc(v.redirect)}">入力画面へ戻る</a></body></html>`,status);
 return respond(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(v.title)} | Exture Store</title><link rel="stylesheet" href="/style.css"></head><body><div id="app">${layout(v.html,state,'classic')}</div></body></html>`,status);
 };
 if(flowPaths[action]){
 const scenario=String(data.scenario||'200');
 if(['400','500','503'].includes(scenario))return flowError(Number(scenario),'検証用エラーです。処理は実行していません。');
 if(scenario!=='200')return flowError(400,'未対応の検証ステータスです。');
 }
 const ecommerce=()=>{const items=state.cart.map(i=>({...products.find(p=>p.id===i.id),qty:i.qty}));return{currency:'JPY',value:totals(items,state.coupon).total,items:items.map(p=>({item_id:p.id,item_name:p.name,price:p.price,quantity:p.qty}))};};
 if(action==='register-review'){
 if(state.user)return flowError(409,'ログアウトしてから新規登録してください。');
 const name=String(data.name||'').trim(),email=normalizeEmail(data.email),password=String(data.password||'');
 if(!name||name.length>80||!validEmail(email))return flowError(400,'お名前とメールアドレスを確認してください。');
 if(password.length<8||password.length>128)return flowError(400,'パスワードは8〜128文字で入力してください。');
 if(password!==data.passwordConfirm)return flowError(400,'確認用パスワードが一致しません。');
 if(email==='demo@example.test'||accounts.some(a=>a.email===email))return flowError(409,'このメールアドレスは登録済みです。');
 state.registration={name,email,passwordHash:await hashPassword(password),token:randomUUID(),expires:Date.now()+30*60*1000};delete state.registrationComplete;next='/register/confirm';
 }else if(action==='register-confirm'){
 if(state.user)return flowError(409,'ログアウトしてから新規登録してください。');
 if(state.registrationComplete?.token===data.registrationToken){next='/register/complete';}
 else{
 const draft=state.registration;
 if(!draft||draft.token!==data.registrationToken)return flowError(409,'登録内容の有効期限が切れました。入力からやり直してください。');
 if(accounts.some(a=>a.email===draft.email)||draft.email==='demo@example.test')return flowError(409,'このメールアドレスは登録済みです。');
 const member={id:randomUUID(),email:draft.email,passwordHash:draft.passwordHash,profile:{name:draft.name,email:draft.email,postal:'',address:'',phone:''},favorites:[],orders:[]};
 accounts.push(member);await store.set(accountKey,accounts);
 state.registrationComplete={token:draft.token,email:draft.email};delete state.registration;
 next='/register/complete';event={event:'sign_up',method:'email'};
 }
 }else if(action==='register-finish'){next='/login';
 }else if(action==='favorite'){
 const p=products.find(p=>p.id===data.id);if(!p)return api({error:'商品が見つかりません。'},404);
 const selected=!state.favorites.includes(p.id);
 state.favorites=selected?[...state.favorites,p.id]:state.favorites.filter(id=>id!==p.id);
 event=selected?{event:'add_to_wishlist',ecommerce:{currency:'JPY',value:p.price,items:[{item_id:p.id,item_name:p.name,price:p.price}]}}:null;
 if(path.startsWith('/api/'))return api({favorites:state.favorites,selected,id:p.id,message:selected?'お気に入りに登録しました。':'お気に入りを解除しました。',event});
 const target=String(data.returnTo||'/account/favorites');
 next=/^\/(?:$|\?|category\/|product\/|cart(?:\?|$)|checkout\/|account(?:\/|\?|$)|complete\/)/.test(target)&&!target.includes('\\')?target:'/account/favorites';
 }else if(action==='profile'){
 if(!state.user)return flowError(401,'ログインが必要です。');
 const profile=Object.fromEntries(['name','email','postal','address','phone'].map(k=>[k,String(data[k]||'').trim()]));
 if(!profile.name||profile.name.length>80||profile.email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)||profile.address.length>200||(profile.postal&&!/^\d{3}-?\d{4}$/.test(profile.postal))||(profile.phone&&!/^[0-9+() -]{8,20}$/.test(profile.phone)))return flowError(400,'個人情報の入力内容を確認してください。');
 const member=accounts.find(a=>a.id===state.user.id);
 const email=normalizeEmail(profile.email);
 if(member.id!=='demo'&&(email==='demo@example.test'||accounts.some(a=>a.id!==member.id&&a.email===email)))return flowError(409,'このメールアドレスは登録済みです。');
 if(member.id!=='demo')member.email=email;
 profile.email=email;
 state.profile=profile;state.user.name=profile.name;next='/account/profile?saved=1';
 }else if(action==='cart'){
 if(data.remove){state.cart=state.cart.filter(p=>p.id!==data.remove);state.checkoutToken=randomUUID();}
 else{if(!state.cart.length)return flowError(409,'カートは空です。');next=state.user?'/checkout/shipping':'/login';}
 }else if(action==='shipping'||action==='payment'){
 if(!state.user)return flowError(401,'ログインが必要です。');
 if(!state.cart.length)return flowError(409,'カートは空です。');
 if(action==='shipping'){
 const shipping=Object.fromEntries(['name','postal','address','phone'].map(k=>[k,String(data[k]||'').trim()]));
 if(!shipping.name||shipping.name.length>80||!shipping.address||shipping.address.length>200||!/^\d{3}-?\d{4}$/.test(shipping.postal)||! /^[0-9+() -]{8,20}$/.test(shipping.phone))return flowError(400,'送り先の入力内容を確認してください。');
 state.shipping=shipping;next='/checkout/payment';event={event:'add_shipping_info',ecommerce:{...ecommerce(),shipping_tier:'demo'}};
 }else{
 if(!state.shipping)return flowError(409,'先に送り先を入力してください。');
 const coupon=String(data.coupon||'').trim().toUpperCase();
 if(!Object.hasOwn(payments,data.payment))return flowError(400,'支払い方法を選択してください。');
 if(coupon&&coupon!=='DEMO10')return flowError(400,'クーポンコードが無効です。DEMO10をご利用ください。');
 state.payment=data.payment;state.coupon=coupon;next='/checkout/confirm';event={event:'add_payment_info',ecommerce:{...ecommerce(),payment_type:data.payment,coupon}};
 }
 state.checkoutToken=randomUUID();
 }else if(action==='finish'){
 if(!state.user||!state.orders.some(o=>o.id===data.orderId))return flowError(404,'注文が見つかりません。');
 next='/account';
 }else
 if(action==='add'){
 const reply=(status,message,event=null)=>{
 if(!productPost && path.startsWith('/api/'))return api({status,message,error:status>=400?message:undefined,event,cart:state.cart},status);
 const v=view('/product/'+data.id,state,'classic','',{status,message,scenario:data.scenario||'200'});
 const init=`<script>window.dataLayer=window.dataLayer||[];${event?`window.dataLayer.push(${json(event)});`:''}</script>`;
 return respond(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(v.title)} | Exture Store</title><link rel="stylesheet" href="/style.css"></head><body><div id="app">${layout(v.html,state,'classic')}</div>${init}</body></html>`,status);
 };
 if(productPost)data.id=productPost[1];
 const scenario=String(data.scenario||'200');
 const errors={'400':'検証用の入力エラーです。商品は追加していません。','500':'検証用のサーバー内部エラーです。商品は追加していません。','503':'検証用の一時利用不可です。商品は追加していません。'};
 if(errors[scenario])return reply(Number(scenario),errors[scenario]);
 if(scenario!=='200')return reply(400,'未対応の検証ステータスです。');
 const p=products.find(p=>p.id===data.id),qty=Number(data.qty),old=state.cart.find(p=>p.id===data.id);
 if(!p||!Number.isInteger(qty)||qty<1||qty>20||(old?.qty||0)+qty>20)return reply(400,'数量は商品ごとに1〜20個で指定してください。');
 if(old)old.qty+=qty;else state.cart.push({id:p.id,qty});
 state.checkoutToken=randomUUID();event={event:'add_to_cart',ecommerce:{currency:'JPY',value:p.price*qty,items:[{item_id:p.id,item_name:p.name,price:p.price,quantity:qty}]}};
 return reply(200,`${p.name}を${qty}個、カートに追加しました。`,event);
 }else if(action==='remove'){state.cart=state.cart.filter(p=>p.id!==data.id);state.checkoutToken=randomUUID();
 }else if(action==='login'){
 const email=normalizeEmail(data.email);let member=accounts.find(a=>a.email===email);
 const isDemo=email==='demo@example.test'&&data.password==='demo-password';
 if(!isDemo&&(!member||member.id==='demo'||!await verifyPassword(data.password,member.passwordHash)))return flowError(401,'メールアドレスまたはパスワードが正しくありません。');
 if(isDemo&&!member){member={id:'demo',email,profile:{name:'デモユーザー',email},favorites:[],orders:[]};accounts.push(member);}
 const guestFavorites=state.user?[]:state.favorites;
 hydrateMember(state,member);state.favorites=[...new Set([...state.favorites,...guestFavorites])];
 delete state.shipping;delete state.payment;delete state.coupon;state.checkoutToken=randomUUID();delete state.registration;
 await rotateSession();next=state.cart.length?'/checkout/shipping':'/account';event={event:'login',method:isDemo?'demo':'email'};
 }else if(action==='logout'){
 state={csrf:state.csrf,cart:[],orders:[],favorites:[],user:null,checkoutToken:randomUUID()};await rotateSession();next='/login';
 }else if(action==='purchase'){
 if(!state.user)return flowError(401,'ログインが必要です。');
 const prior=state.orders.find(o=>o.token===data.checkoutToken);
 if(prior)next='/complete/'+prior.id;
 else{
 if(!state.cart.length||data.checkoutToken!==state.checkoutToken)return flowError(409,'注文内容が変更されました。再確認してください。');
 if(!state.shipping||!state.payment)return flowError(409,'送り先と支払い方法を入力してください。');
 const items=state.cart.map(i=>({...products.find(p=>p.id===i.id),qty:i.qty}));
 const order={id:randomUUID(),token:state.checkoutToken,at:Date.now(),items,...totals(items,state.coupon),shipping:{...state.shipping},payment:state.payment,coupon:state.coupon||''};
 state.orders.unshift(order);state.cart=[];state.checkoutToken=randomUUID();next='/complete/'+order.id;
 event={event:'purchase',ecommerce:{transaction_id:order.id,currency:'JPY',value:order.total,items:items.map(p=>({item_id:p.id,item_name:p.name,price:p.price,quantity:p.qty}))}};
 }
 }else return api({error:'操作が見つかりません。'},404);
 if(path.startsWith('/api/'))return api({next,event});
 state.flash=event;return redirect('/classic'+next);
 }
 if(req.method!=='GET')return api({error:'対応していないメソッドです。'},405);
 if(path==='/api/state')return api(publicState(state));
 if(path==='/')return redirect('/classic/');
 if(/^\/(classic|spa)(\/|$)/.test(path)){
 const mode=path.split('/')[1];if(!['classic','spa'].includes(mode))return respond('Not Found',404);
 const sub=path.slice(mode.length+1)||'/';
 const destination=checkoutRedirect(sub,state);if(destination)return redirect('/'+mode+destination);
 const v=view(sub,state,mode,u.search);if(v.redirect)return redirect('/'+mode+v.redirect);const flash=state.flash;delete state.flash;
 const body=mode==='spa'?'<p class="empty">読み込み中です…</p>':layout(v.html,state,mode);
 const init=mode==='classic'?`<script>window.dataLayer=window.dataLayer||[];window.dataLayer.push(${json({event:'page_view',page_path:path+u.search,render_mode:mode})});${v.event?`window.dataLayer.push(${json(v.event)});`:''}${flash?`window.dataLayer.push(${json(flash)});`:''}</script>`:'<script type="module" src="/spa.mjs"></script>';
 return respond(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(v.title)} | Exture Store</title><link rel="stylesheet" href="/style.css"></head><body><div id="app">${body}</div>${init}</body></html>`,v.status||200);
 }
 if(path==='/lab')return redirect('/lab/');
 if(path==='/lab/'||path==='/lab/index.html')return respond(staticGallery(await listPages()));
 const asset=await assets(path);if(asset)return respond(asset.body,200,asset.type);
 return respond('<h1>404 ページが見つかりません</h1><a href="/">TOPへ</a>',404);
 }catch(e){console.error(e);return api({error:'処理に失敗しました。入力内容を確認してください。'},500);}
 };}
