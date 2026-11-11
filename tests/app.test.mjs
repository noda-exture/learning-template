import {sampleShipping} from '../public/checkout.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeApp} from '../src/app.mjs';
function client(){const data=new Map();const app=makeApp({get:async k=>data.get(k),set:async(k,v)=>data.set(k,v)},async p=>p==='/lab/custom.html'?{body:'custom',type:'text/html'}:null);let cookie='';return async(path,body)=>{const res=await app(new Request('http://localhost:3000'+path,{method:body?'POST':'GET',headers:{cookie,origin:'http://localhost:3000','content-type':'application/json'},body:body?JSON.stringify(body):undefined}));cookie=res.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');return res;};}
test('MPA renders product HTML; SPA loads app module; custom HTML receives cookie',async()=>{const req=client();assert.match(await(await req('/classic/product/mug')).text(),/ストーンウェア/);const spa=await(await req('/spa/product/mug')).text();assert.match(spa,/src="\/spa.mjs"/);assert.doesNotMatch(spa,/<h1>ストーン/);const lab=await req('/lab/custom.html');assert.equal(await lab.text(),'custom<script type="module" src="/cmp.mjs" data-exture-cmp></script>');assert.match(lab.headers.get('set-cookie'),/lab_fpid=.*HttpOnly/);assert.equal((await req('/classic/product/missing')).status,404);});
test('cart, validation, login, purchase, idempotency and browser isolation',async()=>{const req=client();let s=await(await req('/api/state')).json();assert.equal((await req('/api/add',{id:'mug',qty:1,csrf:'bad'})).status,403);assert.equal((await req('/api/add',{id:'mug',qty:-1,csrf:s.csrf})).status,400);await req('/api/add',{id:'mug',qty:2,csrf:s.csrf});s=await(await req('/api/state')).json();assert.equal(s.cart[0].qty,2);assert.equal((await req('/api/purchase',{csrf:s.csrf,checkoutToken:s.checkoutToken})).status,401);await req('/api/login',{csrf:s.csrf,email:'demo@example.test',password:'demo-password'});s=await(await req('/api/state')).json();await req('/api/shipping',{csrf:s.csrf,...sampleShipping});await req('/api/payment',{csrf:s.csrf,payment:'card',coupon:''});s=await(await req('/api/state')).json();const body={csrf:s.csrf,checkoutToken:s.checkoutToken};const first=await(await req('/api/purchase',body)).json();assert.equal(first.event.ecommerce.value,4800);const second=await(await req('/api/purchase',body)).json();assert.equal(second.next,first.next);assert.equal(second.event,null);s=await(await req('/api/state')).json();assert.equal(s.orders.length,1);assert.equal(s.cart.length,0);const other=client();assert.equal((await(await other('/api/state')).json()).orders.length,0);});
test('SPA module requests are static assets, not HTML routes',async()=>{const app=makeApp({get:async()=>null,set:async()=>{}},async p=>p==='/spa.mjs'?{body:'export const ok=true;',type:'text/javascript'}:null);const r=await app(new Request('http://localhost:3000/spa.mjs'));assert.equal(r.headers.get('content-type'),'text/javascript');assert.match(await r.text(),/export const/);});

for(const mode of ['classic','api'])test(`${mode}: inline add response statuses and no mutation on errors`,async()=>{
 const req=client();const state=await(await req('/api/state')).json();
 const endpoint=mode==='classic'?'/classic/product/mug':'/api/add';
 for(const code of [400,500,503]){
 const r=await req(endpoint,{id:'mug',qty:1,csrf:state.csrf,scenario:String(code)});
 assert.equal(r.status,code);assert.equal(r.headers.get('location'),null);
 const body=await r.text();assert.match(body,/商品は追加していません/);assert.doesNotMatch(body,/"event":"add_to_cart"/);
 assert.equal((await(await req('/api/state')).json()).cart.length,0);
 }
 const r=await req(endpoint,{id:'mug',qty:2,csrf:state.csrf,scenario:'200'});
 assert.equal(r.status,200);assert.equal(r.headers.get('location'),null);
 const body=await r.text();assert.match(body,/カートに追加しました/);assert.match(body,/"event":"add_to_cart"/);
 assert.equal((await(await req('/api/state')).json()).cart[0].qty,2);
 if(mode==='classic'){assert.match(body,/<h1>ストーンウェア マグ<\/h1>/);assert.match(body,/action="\/classic\/product\/mug"/);}
});

for(const mode of ['api','classic/action'])test(`${mode}: five-step flow, coupons, simulated failures and saved inputs`,async()=>{
 const req=client();const get=async()=>await(await req('/api/state')).json();let s=await get();
 const send=async(action,data={})=>req('/'+mode+'/'+action,{csrf:(await get()).csrf,...data});
 await send('add',{id:'mug',qty:2});await send('login',{email:'demo@example.test',password:'demo-password'});
 assert.equal((await req('/classic/checkout/confirm')).headers.get('location'),'/classic/checkout/shipping');
 let before=await get();let err=await send('cart',{scenario:'500',remove:'mug'});assert.equal(err.status,500);assert.deepEqual(await get(),before);
 err=await send('shipping',{...sampleShipping,name:'Edited Name',scenario:'500'});assert.equal(err.status,500);assert.deepEqual(await get(),before);
 if(mode==='classic/action')assert.match(await err.text(),/value="Edited Name"/);
 assert.equal((await send('shipping',{...sampleShipping,postal:'invalid'})).status,400);
 await send('shipping',sampleShipping);assert.deepEqual((await get()).shipping,sampleShipping);
 assert.equal((await req('/classic/checkout/confirm')).headers.get('location'),'/classic/checkout/payment');
 before=await get();err=await send('payment',{payment:'card',coupon:'DEMO10',scenario:'503'});assert.equal(err.status,503);assert.deepEqual(await get(),before);
 assert.equal((await send('payment',{payment:'card',coupon:'BAD'})).status,400);
 await send('payment',{payment:'card',coupon:'demo10'});s=await get();assert.equal(s.coupon,'DEMO10');
 const confirm=await(await req('/classic/checkout/confirm')).text();assert.match(confirm,/¥4,320/);assert.match(confirm,/テスト 太郎/);
 before=await get();assert.equal((await send('purchase',{checkoutToken:s.checkoutToken,scenario:'500'})).status,500);assert.deepEqual(await get(),before);
 const token=s.checkoutToken;await send('purchase',{checkoutToken:token});s=await get();assert.equal(s.orders.length,1);assert.equal(s.orders[0].discount,480);assert.equal(s.orders[0].total,4320);assert.deepEqual(s.orders[0].shipping,sampleShipping);assert.equal(s.cart.length,0);
 await send('purchase',{checkoutToken:token});assert.equal((await get()).orders.length,1);
 assert.equal((await send('finish',{orderId:s.orders[0].id,scenario:'500'})).status,500);assert.equal((await get()).orders.length,1);
 const done=await send('finish',{orderId:s.orders[0].id});assert.equal(done.status,mode==='api'?200:303);
 if(mode==='api')assert.equal((await done.json()).next,'/account');else assert.equal(done.headers.get('location'),'/classic/account');
});

test('favorites persist across MPA/SPA, toggle, validate IDs and isolate sessions',async()=>{
 const req=client();const s=await(await req('/api/state')).json();
 assert.equal((await req('/api/favorite',{csrf:'bad',id:'mug'})).status,403);
 assert.equal((await req('/api/favorite',{csrf:s.csrf,id:'missing'})).status,404);
 let result=await(await req('/api/favorite',{csrf:s.csrf,id:'mug'})).json();assert.deepEqual(result.favorites,['mug']);assert.equal(result.event.event,'add_to_wishlist');
 const html=await(await req('/classic/account/favorites')).text();assert.match(html,/ストーンウェア マグ/);assert.match(html,/aria-pressed="true"/);
 let response=await req('/classic/action/favorite',{csrf:s.csrf,id:'mug',returnTo:'/category/all?q=マグ'});assert.equal(response.status,303);assert.equal(response.headers.get('location'),'/classic/category/all?q=%E3%83%9E%E3%82%B0');
 assert.deepEqual((await(await req('/api/state')).json()).favorites,[]);
 response=await req('/classic/action/favorite',{csrf:s.csrf,id:'lamp',returnTo:'//evil.example'});assert.equal(response.headers.get('location'),'/classic/account/favorites');
 const other=client();assert.deepEqual((await(await other('/api/state')).json()).favorites,[]);
});

test('profile requires login, validates input, retains data after errors and re-login',async()=>{
 const req=client();let s=await(await req('/api/state')).json();
 const profile={name:'サンプル 花子',email:'sample@example.test',postal:'000-0000',address:'テスト住所',phone:'000-0000-0000',csrf:s.csrf};
 assert.equal((await req('/api/profile',profile)).status,401);
 await req('/api/login',{csrf:s.csrf,email:'demo@example.test',password:'demo-password'});
 s=await(await req('/api/state')).json();profile.csrf=s.csrf;
 assert.equal((await req('/api/profile',{...profile,email:'bad'})).status,400);
 assert.equal((await req('/api/profile',{...profile,scenario:'500'})).status,500);
 assert.equal((await(await req('/api/state')).json()).profile.name,'デモユーザー');
 let response=await req('/classic/action/profile',profile);assert.equal(response.headers.get('location'),'/classic/account/profile?saved=1');
 s=await(await req('/api/state')).json();assert.equal(s.profile.name,profile.name);assert.equal(s.user.name,profile.name);
 const html=await(await req('/classic/account/profile')).text();assert.match(html,/value="sample@example.test"/);
 await req('/api/logout',{csrf:s.csrf});s=await(await req('/api/state')).json();await req('/api/login',{csrf:s.csrf,email:'demo@example.test',password:'demo-password'});
 assert.equal((await(await req('/api/state')).json()).user.name,profile.name);
});
