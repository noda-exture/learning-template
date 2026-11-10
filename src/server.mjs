import http from 'node:http';
import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {makeApp} from './app.mjs';
import {listStaticPages} from './static-pages.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),dataDir=process.env.DATA_DIR||path.join(root,'.data');
await mkdir(dataDir,{recursive:true});
const file=path.join(dataDir,'sessions.json');
let sessions={};try{sessions=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const store={get:async id=>sessions[id],set:async(id,v)=>{sessions[id]=v;await writeFile(file+'.tmp',JSON.stringify(sessions));await rename(file+'.tmp',file);}};
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.json':'application/json'};
async function assets(url){const decoded=decodeURIComponent(url);const target=path.resolve(root,'public','.'+decoded);if(!target.startsWith(path.join(root,'public')+path.sep))return null;try{return{body:await readFile(target),type:mime[path.extname(target)]||'application/octet-stream'};}catch(e){if(['ENOENT','EISDIR','ENOTDIR'].includes(e.code))return null;throw e;}}
async function commonTags(){
 const [head,bodyStart]=await Promise.all(['head.html','body-start.html'].map(name=>readFile(path.join(root,'config','tags',name),'utf8')));
 return {head,bodyStart};
}
const app=makeApp(store,assets,()=>listStaticPages(path.join(root,'public','lab')),commonTags);
// ローカル版はファイル永続化を含むリクエストを直列化します。Cloudflare版ではD1へ置換します。
let queue=Promise.resolve();
const server=http.createServer((req,res)=>{queue=queue.then(async()=>{try{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>65536){res.writeHead(413);res.end('Request too large');return;}chunks.push(chunk);}const request=new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});const result=await app(request);const out=Object.fromEntries([...result.headers].filter(([k])=>k!=='set-cookie'));out['set-cookie']=result.headers.getSetCookie();res.writeHead(result.status,out);
res.end(Buffer.from(await result.arrayBuffer()));}catch(e){console.error(e);if(!res.headersSent)res.writeHead(500);res.end('Server error');}});});
const port=Number(process.env.PORT||3000);server.listen(port,'127.0.0.1',()=>console.log(`Exture Store: http://localhost:${port}`));
