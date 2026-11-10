// 別ターミナルでnpm run cf:devを起動してから実行します。検証用会員を1件作成します。
import assert from 'node:assert/strict';
import {sampleShipping} from '../public/checkout.mjs';

const origin = 'http://localhost:8787';
function client() {
  let cookie = '';
  const req = async (path, body) => {
    const response = await fetch(origin + path, {
      method: body ? 'POST' : 'GET', redirect: 'manual',
      headers: {cookie, origin, 'content-type': 'application/json'},
      body: body ? JSON.stringify(body) : undefined,
    });
    if (response.headers.getSetCookie().length) cookie = response.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
    return response;
  };
  const state = async () => (await req('/api/state')).json();
  return {req, state, post: async (action, data = {}) => req('/api/' + action, {csrf: (await state()).csrf, ...data})};
}
const c = client();
for (const path of ['/classic/', '/spa/', '/lab/', '/lab/welcome.html']) {
  const response = await c.req(path);
  assert.equal(response.status, 200, path);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.ok(response.headers.get('set-cookie')?.includes('lab_fpid='));
}
assert.match(await (await c.req('/lab/')).text(), /welcome.html/);
assert.match((await c.req('/spa.mjs')).headers.get('content-type'), /javascript/);
assert.equal((await c.req('/missing-file')).status, 404);
const email = `worker-${crypto.randomUUID()}@example.test`, password = 'worker-test-password';
assert.equal((await c.post('register-review', {name: 'Worker検証', email, password, passwordConfirm: password})).status, 200);
const token = (await c.state()).registration.token;
const registrations = await Promise.all([c.post('register-confirm', {registrationToken: token}), c.post('register-confirm', {registrationToken: token})]);
assert.deepEqual(registrations.map(r => r.status), [200, 200]);
assert.equal((await Promise.all(registrations.map(r => r.json()))).filter(r => r.event?.event === 'sign_up').length, 1);
assert.equal((await c.post('login', {email, password})).status, 200);
await c.post('add', {id: 'mug', qty: 1});
assert.equal((await c.post('add', {id: 'mug', qty: 1, scenario: '503'})).status, 503);
assert.equal((await c.state()).cart[0].qty, 1);
await c.post('shipping', sampleShipping);
await c.post('payment', {payment: 'card', coupon: ''});
const checkoutToken = (await c.state()).checkoutToken;
const purchases = await Promise.all([c.post('purchase', {checkoutToken}), c.post('purchase', {checkoutToken})]);
assert.deepEqual(purchases.map(r => r.status), [200, 200]);
assert.equal((await Promise.all(purchases.map(r => r.json()))).filter(r => r.event?.event === 'purchase').length, 1);
assert.equal((await c.state()).orders.length, 1);
const fresh = client();
assert.equal((await fresh.state()).user, null);
assert.equal((await fresh.post('login', {email, password})).status, 200);
assert.equal((await fresh.state()).orders.length, 1);
assert.equal((await c.req('/api/add', {padding: 'x'.repeat(65536)})).status, 413);
console.log('Cloudflare runtime: HTML/SPA/assets, registration, login, concurrent duplicate prevention, persistence across sessions and body limit passed.');
