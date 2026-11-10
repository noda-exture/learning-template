import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeApp} from '../src/app.mjs';
import {sampleShipping} from '../public/checkout.mjs';
function environment(){const data=new Map();const store={get:async k=>structuredClone(data.get(k)),set:async(k,v)=>data.set(k,structuredClone(v))};const app=makeApp(store,async()=>null);function client(){let cookie='';const req=async(path,body)=>{const res=await app(new Request('http://localhost'+path,{method:body?'POST':'GET',headers:{cookie,origin:'http://localhost','content-type':'application/json'},body:body?JSON.stringify(body):undefined}));cookie=res.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');return res;};const state=async()=>await(await req('/api/state')).json();return {req,state,post:async(action,body={},prefix='/api/')=>req(prefix+action,{csrf:(await state()).csrf,...body})};}return{client,data};}
const password='testing-pass-123';
async function register(c,email,prefix='/api/'){
 const res=await c.post('register-review',{name:'登録テスト',email,password,passwordConfirm:password},prefix);assert.equal(res.status,prefix==='/api/'?200:303);
 const s=await c.state();assert.equal(s.registration.passwordHash,undefined);
 return c.post('register-confirm',{registrationToken:s.registration.token},prefix);
}
test('register validation, errors, duplicate email and single signup event without password exposure',async()=>{
 const {client,data}=environment(),c=client();
 assert.equal((await c.post('register-review',{name:'A',email:'bad',password,passwordConfirm:password})).status,400);
 assert.equal((await c.post('register-review',{name:'A',email:'a@example.test',password,passwordConfirm:'wrong'})).status,400);
 assert.equal((await c.post('register-review',{name:'A',email:'a@example.test',password,passwordConfirm:password,scenario:'500'})).status,500);
 assert.equal((await c.state()).registration,null);
 await c.post('register-review',{name:'A',email:'a@example.test',password,passwordConfirm:password});
 const token=(await c.state()).registration.token;
 assert.equal((await c.post('register-confirm',{registrationToken:token,scenario:'503'})).status,503);assert.equal((data.get('accounts:v1')||[]).length,0);
 const result=await(await c.post('register-confirm',{registrationToken:token})).json();assert.equal(result.event.event,'sign_up');
 assert.equal((await(await c.post('register-confirm',{registrationToken:token})).json()).event,null);
 assert.equal((await register(client(),'A@example.test').catch(()=>null)),null);
 const duplicate=await c.post('register-review',{name:'B',email:' A@EXAMPLE.TEST ',password,passwordConfirm:password});assert.equal(duplicate.status,409);
 const accounts=data.get('accounts:v1');assert.equal(accounts.length,1);assert.notEqual(accounts[0].passwordHash,password);assert.ok(!JSON.stringify([...data.values()]).includes('"password":'));
 assert.doesNotMatch(JSON.stringify(await c.state()),/passwordHash|testing-pass/);
 assert.equal((await c.post('login',{email:'a@example.test',password:'wrong-password'})).status,401);
 const oldCsrf=(await c.state()).csrf;await c.post('login',{email:'a@example.test',password});assert.notEqual((await c.state()).csrf,oldCsrf);
});
test('account favorites, profile and orders survive new sessions and never leak to another user',async()=>{
 const {client}=environment(),a=client(),b=client();await register(a,'a@example.test');await register(b,'b@example.test');
 await a.post('login',{email:'a@example.test',password});await a.post('favorite',{id:'mug'});
 await a.post('profile',{name:'会員A',email:'a@example.test',postal:'',address:'',phone:''});
 await a.post('add',{id:'mug',qty:1});await a.post('shipping',sampleShipping);await a.post('payment',{payment:'card',coupon:''});await a.post('purchase',{checkoutToken:(await a.state()).checkoutToken});
 const order=(await a.state()).orders[0];assert.ok(order);
 await a.post('logout');let s=await a.state();assert.equal(s.user,null);assert.deepEqual(s.orders,[]);assert.deepEqual(s.favorites,[]);assert.equal(s.profile,undefined);
 await a.post('login',{email:'b@example.test',password});s=await a.state();assert.deepEqual(s.orders,[]);assert.deepEqual(s.favorites,[]);
 assert.equal((await a.req('/classic/complete/'+order.id)).status,404);
 const fresh=client();await fresh.post('login',{email:'a@example.test',password});s=await fresh.state();assert.equal(s.user.name,'会員A');assert.deepEqual(s.favorites,['mug']);assert.equal(s.orders[0].id,order.id);
 assert.equal((await fresh.post('profile',{name:'A',email:'b@example.test'})).status,409);
 await fresh.post('profile',{name:'A',email:'new@example.test'});await fresh.post('logout');assert.equal((await fresh.post('login',{email:'a@example.test',password})).status,401);assert.equal((await fresh.post('login',{email:'new@example.test',password})).status,200);
});
test('MPA input/confirm/complete redirects, inline errors and one-time signup',async()=>{
 const c=environment().client();const r=await register(c,'mpa@example.test','/classic/action/');assert.equal(r.headers.get('location'),'/classic/register/complete');
 const complete=await(await c.req('/classic/register/complete')).text();assert.match(complete,/会員登録が完了/);assert.match(complete,/"event":"sign_up"/);assert.doesNotMatch(complete,/testing-pass|passwordHash/);
 assert.doesNotMatch(await(await c.req('/classic/register/complete')).text(),/"event":"sign_up"/);
 const invalid=await c.post('login',{email:'mpa@example.test',password:'wrong'},'/classic/action/');assert.equal(invalid.status,401);assert.match(await invalid.text(),/メールアドレスまたはパスワードが正しくありません/);
});
