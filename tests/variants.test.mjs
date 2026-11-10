import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeApp} from '../src/app.mjs';
import {lineKey} from '../public/variants.mjs';
import {view} from '../public/views.mjs';
import {sampleShipping} from '../public/checkout.mjs';

function client() {
  const records = new Map();
  const app = makeApp({get: async k => structuredClone(records.get(k)), set: async (k,v) => records.set(k,structuredClone(v))}, async()=>null);
  let cookie='';
  const req=async(path,body)=>{
    const res=await app(new Request('https://example.test'+path,{method:body?'POST':'GET',headers:{cookie,origin:'https://example.test','content-type':'application/json'},body:body?JSON.stringify(body):undefined}));
    cookie=res.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
    return res;
  };
  const state=async()=> (await req('/api/state')).json();
  return {req,state,records,post:async(action,body={})=>req('/api/'+action,{csrf:(await state()).csrf,...body})};
}

for(const mode of ['api','classic']) test(`${mode}: variants stay separate, merge by selection, validate and remove one line`,async()=>{
  const c=client();
  const add=async(body)=>c.req(mode==='api'?'/api/add':'/classic/product/bag',{csrf:(await c.state()).csrf,id:'bag',qty:1,...body});
  const black={option_color:'ブラック',option_size:'M'};
  let res=await add(black);assert.equal(res.status,200);
  const text=await res.text();assert.match(text,/item_variant/);
  if(mode==='classic'){
    assert.match(text,/<option value="ブラック" selected>/);
    assert.match(text,/<option value="M" selected>/);
  }
  await add(black);await add({...black,option_size:'L'});
  let state=await c.state();assert.equal(state.cart.length,2);assert.deepEqual(state.cart.map(i=>i.qty),[2,1]);
  const before=structuredClone(state.cart);
  assert.equal((await add({...black,option_size:'XL'})).status,400);
  assert.equal((await add({...black,qty:19})).status,400);
  assert.equal((await add({...black,scenario:'503'})).status,503);
  assert.deepEqual((await c.state()).cart,before);
  for(const renderMode of ['classic','spa']){
    const html=view('/cart',state,renderMode).html;
    assert.match(html,/色：ブラック \/ サイズ：M/);assert.match(html,/色：ブラック \/ サイズ：L/);
    assert.match(html,/¥3,800 × 2/);assert.match(html,/¥4,400 × 1/);
    assert.equal(view('/cart',state,renderMode).event.ecommerce.value,12000);
  }
  await c.post('cart',{remove:lineKey(state.cart[0])});
  state=await c.state();assert.equal(state.cart.length,1);assert.equal(state.cart[0].attributes[1].value,'L');
});

test('server calculates size prices and ignores submitted price; MPA keeps selected price',async()=>{
  const c=client();
  const result=await (await c.post('add',{id:'bag',qty:2,option_color:'ブラック',option_size:'L',price:1})).json();
  assert.equal(result.event.ecommerce.value,8800);
  assert.equal(result.event.ecommerce.items[0].price,4400);
  const res=await c.req('/classic/product/bag',{csrf:(await c.state()).csrf,id:'bag',qty:1,option_color:'ブラック',option_size:'M',scenario:'503'});
  assert.match(await res.text(),/id="product-price" aria-live="polite">¥3,800/);
  for(const mode of ['classic','spa']){
    const html=view('/product/bag',await c.state(),mode).html;
    assert.match(html,/id="product-price" aria-live="polite">¥3,200/);
  }
});

test('selected attributes survive checkout, order history and purchase analytics',async()=>{
  const c=client();
  await c.post('add',{id:'bag',qty:2,option_color:'オリーブ',option_size:'S'});
  await c.post('login',{email:'demo@example.test',password:'demo-password'});
  const shipping=await (await c.post('shipping',sampleShipping)).json();
  assert.equal(shipping.event.ecommerce.items[0].item_variant,'色：オリーブ / サイズ：S');
  await c.post('payment',{payment:'card'});
  assert.match(await (await c.req('/classic/checkout/confirm')).text(),/色：オリーブ \/ サイズ：S/);
  const purchase=await (await c.post('purchase',{checkoutToken:(await c.state()).checkoutToken})).json();
  assert.equal(purchase.event.ecommerce.items[0].item_variant,'色：オリーブ / サイズ：S');
  const state=await c.state();assert.equal(state.orders[0].items[0].attributes[0].value,'オリーブ');
  assert.equal(state.orders[0].total,6400);
  for(const path of ['/classic/account/orders','/classic'+purchase.next]) assert.match(await (await c.req(path)).text(),/色：オリーブ \/ サイズ：S/);
});

test('legacy carts and products without attributes remain usable',async()=>{
  const c=client();await c.state();
  for(const [key,state] of c.records) c.records.set(key,{...state,cart:[{id:'mug',qty:1}]});
  assert.equal((await c.req('/classic/cart')).status,200);
  await c.post('cart',{remove:'mug'});assert.equal((await c.state()).cart.length,0);
  await c.post('add',{id:'lamp',qty:1});assert.equal((await c.state()).cart.length,1);
  await c.post('remove',{id:'lamp'});assert.equal((await c.state()).cart.length,0);
  await c.post('add',{id:'bag',qty:1});
  assert.deepEqual((await c.state()).cart[0].attributes.map(a=>a.value),['ナチュラル','S']);
});
