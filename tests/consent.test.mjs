import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createConsent, parseConsent, consentLabel, readConsent, persistConsent} from '../public/consent-state.mjs';
import {cmpConfig} from '../public/cmp-config.mjs';
import {injectCmp} from '../src/cmp.mjs';
import {makeApp} from '../src/app.mjs';

test('consent accepts explicit choices, fixes necessary on and rejects invalid/expired records', () => {
  const now = Date.now();
  const partial = createConsent({analytics: true, marketing: 'true', necessary: false}, now);
  assert.equal(partial.necessary, true);
  assert.equal(partial.analytics, true);
  assert.equal(partial.marketing, false);
  assert.equal(partial.personalization, false);
  assert.deepEqual(parseConsent(JSON.stringify(partial), now), partial);
  assert.equal(partial.expiresAt - now, cmpConfig.retentionDays * 86400000);
  for (const value of [null, {}, {...partial, version: 0}, {...partial, necessary: false},
    {...partial, analytics: 'yes'}, {...partial, savedAt: now + 1}, {...partial, expiresAt: now}]) {
    assert.equal(parseConsent(JSON.stringify(value), now), null);
  }
  assert.equal(parseConsent('invalid json'), null);
  assert.equal(parseConsent(JSON.stringify(partial), partial.expiresAt), null);
  assert.equal(consentLabel(null), '未設定');
  assert.equal(consentLabel(partial), '個別設定');
  assert.equal(consentLabel(createConsent({})), '必須のみ');
  assert.equal(consentLabel(createConsent({analytics: true, marketing: true, personalization: true})), 'すべて許可');
});

test('save/read/reset touch only CMP storage and handle blocked storage', () => {
  const data = new Map([['other-app', 'preserve']]);
  const storage = () => ({getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k)});
  assert.equal(readConsent(storage), null);
  const state = createConsent({analytics: true});
  assert.equal(persistConsent(state, storage), true);
  assert.deepEqual(readConsent(storage), state);
  assert.equal(persistConsent(null, storage), true);
  assert.equal(readConsent(storage), null);
  assert.equal(data.get('other-app'), 'preserve');
  const blocked = () => { throw new Error('storage blocked'); };
  assert.equal(readConsent(blocked), null);
  assert.equal(persistConsent(state, blocked), false);
  assert.equal(persistConsent(null, blocked), false);
});

test('CMP is injected once into HTML including static pages, never JSON, JS or redirects', async () => {
  const data = new Map();
  const app = makeApp({get: async k => data.get(k), set: async(k,v) => data.set(k,v)}, async p =>
    p === '/lab/test.html' ? {body: '<html><head></head><body>test</body></html>', type: 'text/html'} :
    p === '/test.mjs' ? {body: 'export const ok = true;', type: 'text/javascript'} : null);
  for (const path of ['/classic/', '/spa/', '/lab/', '/lab/test.html', '/404']) {
    const res = await app(new Request('https://example.test' + path));
    const text = await res.text();
    assert.equal((text.match(/data-exture-cmp/g) || []).length, 1, path);
    assert.match(res.headers.get('set-cookie'), /lab_session=/); // 今回はCookie制御を行いません。
  }
  for (const path of ['/api/state', '/test.mjs', '/']) {
    assert.doesNotMatch(await (await app(new Request('https://example.test' + path))).text(), /data-exture-cmp/);
  }
  const once = injectCmp('<body>content</body>');
  assert.equal(injectCmp(once), once);
  assert.ok(once.indexOf('/cmp.mjs') < once.indexOf('</body>'));
});
