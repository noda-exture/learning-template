import {test} from 'node:test';
import assert from 'node:assert/strict';
import {searchProducts} from '../public/catalog.mjs';
import {view} from '../public/views.mjs';
test('search normalizes text and supports description, category, multiple terms and empty results',()=>{
 assert.deepEqual(searchProducts('まぐ').map(p=>p.id),['mug']);
 assert.deepEqual(searchProducts('ﾏｸﾞ 暮らし').map(p=>p.id),['mug']);
 assert.deepEqual(searchProducts('読書').map(p=>p.id),['lamp']);
 assert.equal(searchProducts('ＤＥＳＫ').length,2);
 assert.equal(searchProducts('存在しない商品').length,0);
 assert.equal(searchProducts('マグ','outdoor').length,0);
 assert.equal(searchProducts('  ').length,6);
});
test('search result escapes input and keeps query in category links',()=>{
 const state={cart:[],csrf:'test'};
 const html=view('/category/all',state,'classic','?q=%3Cimg%3E').html;
 assert.match(html,/&lt;img&gt;/);assert.doesNotMatch(html,/<img>/);assert.match(html,/0件の商品/);
 assert.match(view('/category/all',state,'spa','?q=マグ').html,/category\/living\?q=%E3%83%9E%E3%82%B0/);
});
