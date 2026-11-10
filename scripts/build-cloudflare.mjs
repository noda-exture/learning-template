import {mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {listStaticPages} from '../src/static-pages.mjs';

const root = new URL('../', import.meta.url);
const pages = await listStaticPages(fileURLToPath(new URL('public/lab/', root)));
await mkdir(new URL('.generated/', root), {recursive: true});
await writeFile(new URL('.generated/pages.json', root), JSON.stringify(pages));
console.log(`Cloudflare用の静的ページ一覧を生成しました（${pages.length}件）。`);
