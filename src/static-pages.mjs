import {readdir,readFile} from 'node:fs/promises';
import path from 'node:path';
// リクエストごとに走査し、HTMLの追加・削除を再起動なしで反映します。
export async function listStaticPages(directory){
 const pages=[];
 async function walk(dir,segments=[]){
 let entries;try{entries=await readdir(dir,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return;throw e;}
 for(const entry of entries){
 if(entry.name.startsWith('.')||entry.isSymbolicLink())continue;
 const parts=[...segments,entry.name],file=path.join(dir,entry.name);
 if(entry.isDirectory()){await walk(file,parts);continue;}
 if(!entry.isFile()||! /\.html?$/i.test(entry.name)||(!segments.length&&entry.name==='index.html'))continue;
 let html;try{html=await readFile(file,'utf8');}catch(e){if(e.code==='ENOENT')continue;throw e;}
 const raw=html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
 const title=(raw||entry.name).replace(/&(?:amp|lt|gt|quot|apos|#39);/g,m=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&#39;':"'"}[m])).replace(/\s+/g,' ').trim()||entry.name;
 pages.push({title,filename:parts.join('/'),url:'/lab/'+parts.map(encodeURIComponent).join('/')});
 }
 }
 await walk(directory);return pages.sort((a,b)=>a.filename.localeCompare(b.filename,'ja'));
}
