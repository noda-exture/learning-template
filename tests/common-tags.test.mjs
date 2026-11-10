import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeApp} from '../src/app.mjs';
import {injectCommonTags} from '../src/common-tags.mjs';
const tags={head:'<script id="common-head">window.testTag="$&";</script>',bodyStart:'<noscript id="common-body">test</noscript>'};
test('snippets are inserted literally once at head/body start, including fragments',()=>{
 const html=injectCommonTags('<!doctype html><html><HEAD lang="ja"><title>T</title></HEAD><BODY class="page"><h1>Page</h1></BODY></html>',tags);
 assert.match(html,/<HEAD lang="ja">\n<script id="common-head">/);assert.match(html,/<BODY class="page">\n<noscript id="common-body">/);assert.ok(html.includes('window.testTag="$&"'));
 assert.equal((html.match(/id="common-head"/g)||[]).length,1);
 assert.match(injectCommonTags('<h1>404</h1>',tags),/<body>\n<noscript/);
});
test('all HTML responses get tags while APIs/assets/redirects remain untouched; settings reload',async()=>{
 const saved=new Map();let config=tags;
 const app=makeApp({get:async k=>saved.get(k),set:async(k,v)=>saved.set(k,v)},async p=>p==='/lab/test.html'?{body:new TextEncoder().encode('<html><head><title>Static</title></head><body>静的</body></html>'),type:'text/html; charset=utf-8'}:p==='/test.js'?{body:'const ok=true',type:'text/javascript'}:null,async()=>[],async()=>config);
 for(const path of ['/classic/','/spa/','/lab/','/lab/test.html','/not-found']){
 const res=await app(new Request('http://localhost'+path));const body=await res.text();assert.equal((body.match(/id="common-head"/g)||[]).length,1,path);assert.equal((body.match(/id="common-body"/g)||[]).length,1,path);
 }
 for(const path of ['/api/state','/test.js','/'])assert.doesNotMatch(await(await app(new Request('http://localhost'+path))).text(),/common-head/);
 config={head:'<meta name="updated" content="yes">'};assert.match(await(await app(new Request('http://localhost/classic/'))).text(),/name="updated"/);
 config=tags;
 const first=await app(new Request('http://localhost/api/state'));const state=await first.json();const cookie=first.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
 const error=await app(new Request('http://localhost/classic/product/mug',{method:'POST',headers:{origin:'http://localhost','content-type':'application/json',cookie},body:JSON.stringify({csrf:state.csrf,id:'mug',qty:1,scenario:'500'})}));assert.equal(error.status,500);assert.match(await error.text(),/id="common-head"/);
});
