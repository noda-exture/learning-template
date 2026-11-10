import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,unlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {listStaticPages} from '../src/static-pages.mjs';
import {makeApp} from '../src/app.mjs';
test('HTML additions and removals appear without registration, nested paths are encoded',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'learning-gallery-'));
 try{
 await writeFile(path.join(dir,'first.html'),'<title>First &amp; Second</title>');
 let pages=await listStaticPages(dir);assert.equal(pages[0].title,'First & Second');
 await mkdir(path.join(dir,'nested'));await writeFile(path.join(dir,'nested','日本 語.htm'),'<h1>No title</h1>');
 await writeFile(path.join(dir,'index.html'),'<title>Reserved</title>');await writeFile(path.join(dir,'.hidden.html'),'');
 pages=await listStaticPages(dir);assert.equal(pages.length,2);assert.equal(pages.find(p=>p.filename.includes('nested')).url,'/lab/nested/%E6%97%A5%E6%9C%AC%20%E8%AA%9E.htm');
 await unlink(path.join(dir,'first.html'));assert.equal((await listStaticPages(dir)).length,1);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('gallery escapes titles, links pages and is reachable from both home modes',async()=>{
 const store={get:async()=>null,set:async()=>{}};
 const app=makeApp(store,async()=>null,async()=>[{title:'<script>alert(1)</script>',filename:'demo.html',url:'/lab/demo.html'}]);
 const html=await(await app(new Request('http://localhost/lab/'))).text();
 assert.match(html,/href="\/lab\/demo.html"/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>alert/);
 const home=await(await app(new Request('http://localhost/classic/'))).text();assert.match(home,/静的ページ一覧へ/);
 const {view}=await import('../public/views.mjs');assert.match(view('/',{cart:[],csrf:'test'},'spa').html,/href="\/lab\/"/);
 const empty=makeApp(store,async()=>null);assert.match(await(await empty(new Request('http://localhost/lab/'))).text(),/ページはまだありません/);
});
