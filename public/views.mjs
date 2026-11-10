import {payments,sampleShipping,totals,checkoutRedirect} from './checkout.mjs';
import {products,categories,searchProducts} from './catalog.mjs';
export const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const yen = v => '¥'+v.toLocaleString('ja-JP');
export function art(p){return `<div class="art ${p.shape}" style="--object:${p.color}" role="img" aria-label="${esc(p.name)}のイラスト"><span></span></div>`;}
export function view(path,state,mode,query='',feedback=null){
 const base='/'+mode, url=s=>base+s;
 const redirect=checkoutRedirect(path,state);if(redirect)return {redirect};
 const input=(n,v)=>`<input type="hidden" name="${n}" value="${esc(v)}">`;
 const form=(action,body)=>`<form method="post" action="${action==='add'?base+path:base+'/action/'+action}" data-action="${action}">${input('csrf',state.csrf)}${body}</form>`;
 const favoriteForms=new Map();
 const favorite=p=>{
 const selected=(state.favorites||[]).includes(p.id),formId='favorite-'+p.id;
 favoriteForms.set(p.id,`<form id="${formId}" method="post" action="${base}/action/favorite" data-action="favorite">${input('csrf',state.csrf)}${input('id',p.id)}${input('returnTo',path+query)}</form>`);
 return `<button type="submit" form="${formId}" class="favorite-button ${selected?'saved':''}" data-favorite-id="${p.id}" data-product-name="${esc(p.name)}" aria-pressed="${selected}" aria-label="${esc(p.name)}をお気に入り${selected?'から解除':'に登録'}">${selected?'♥ お気に入り登録済み':'♡ お気に入りに登録'}</button>`;
 };
 const cards=items=>`<div class="product-grid">${items.map(p=>`<article class="product-card" data-favorite-card="${p.id}"><a href="${url('/product/'+p.id)}">${art(p)}<div class="product-meta"><span>${esc(p.tag)||'STANDARD'}</span><span>↗</span></div><h3>${p.name}</h3><p>${yen(p.price)} <small>税込</small></p></a>${favorite(p)}</article>`).join('')}</div>`;
 const cart=state.cart.map(i=>({...products.find(p=>p.id===i.id),qty:i.qty}));
 const bill=totals(cart,state.coupon),total=bill.total;
 const statusSelect=()=>`<label class="status-select">返却ステータス<select name="scenario">${[['200','成功'],['400','入力エラー'],['500','サーバーエラー'],['503','一時利用不可']].map(([value,label])=>`<option value="${value}" ${String(feedback?.scenario||'200')===value?'selected':''}>${value} · ${label}</option>`).join('')}</select></label>`;
 const notice=()=>`<div id="flow-feedback" class="cart-feedback ${feedback?'shown error':''}" role="status" aria-live="polite">${feedback?esc('HTTP '+feedback.status+' — '+feedback.message):''}</div>`;
 const steps=(index)=>`<ol class="checkout-steps" aria-label="購入ステップ">${['カート','送り先','支払い方法','確認','完了'].map((label,i)=>`<li class="${i===index?'current':i<index?'done':''}" ${i===index?'aria-current="step"':''}><span>${i+1}</span>${label}</li>`).join('')}</ol>`;
 const amounts=()=>`<div class="amounts"><p><span>商品小計（税込）</span><span>${yen(bill.subtotal)}</span></p><p><span>クーポン割引</span><span>−${yen(bill.discount)}</span></p><p><span>送料・手数料（模擬）</span><span>¥0</span></p><p class="totals"><span>合計（税込）</span><strong>${yen(total)}</strong></p></div>`;
 const itemsHtml=(removable=false)=>cart.map(p=>`<article class="cart-row">${art(p)}<div><h3>${p.name}</h3><p>${yen(p.price)} × ${p.qty}</p>${favorite(p)}${removable?`<button class="text-button" name="remove" value="${p.id}">削除</button>`:''}</div><strong>${yen(p.price*p.qty)}</strong></article>`).join('');
 const ecommerce={currency:'JPY',value:total,items:cart.map(p=>({item_id:p.id,item_name:p.name,price:p.price,quantity:p.qty}))};
 const heading=(en,ja)=>`<div class="page-heading"><span class="eyebrow">${en}</span><h1>${esc(ja)}</h1></div>`;
 let title='暮らしを、少し心地よく。', content='',event=null;
 if(path==='/' || path===''){
 content=`<section class="hero"><div><span class="eyebrow">SMALL THINGS, GOOD DAYS.</span><h1>暮らしを、<br>少し心地よく。</h1><p>いつもの毎日に、長く愛せるものを。<br>手に取るたびにうれしい、日々の道具を集めました。</p><a class="button" href="${url('/category/all')}">アイテムを見つける <span>↗</span></a></div><div class="hero-art">${art(products[0])}<span class="hero-caption">THE EVERYDAY COLLECTION — 01</span></div></section><section><div class="section-heading"><div><span class="eyebrow">CURATED FOR YOU</span><h2>毎日の、お気に入り。</h2></div><a href="${url('/category/all')}">すべての商品を見る ↗</a></div>${cards(products.slice(0,3))}</section><section class="static-entry"><div><span class="eyebrow">STATIC PAGE COLLECTION</span><h2>静的ページを探す。</h2><p>追加したHTMLページを、ここからまとめて確認できます。</p></div><a class="button" href="/lab/" data-full>静的ページ一覧へ ↗</a></section>`;
 } else if(path.startsWith('/category/')){
 const category=path.split('/')[2], q=new URLSearchParams(query).get('q')||'';
 title=q.trim()?'「'+q.trim()+'」の検索結果':categories.find(c=>c[0]===category)?.[1]||'商品一覧';
 const items=searchProducts(q,category);
 content=heading('COLLECTION',title)+`<form class="search" action="${url('/category/'+category)}"><input name="q" value="${esc(q)}" placeholder="商品名・キーワードで検索" aria-label="検索キーワード"><button>検索</button></form><nav class="filters">${categories.map(c=>`<a class="${category===c[0]?'active':''}" href="${url('/category/'+c[0])+(q?'?'+new URLSearchParams({q}).toString():'')}">${c[1]}</a>`).join('')}</nav><p class="search-count">${items.length}件の商品${q?` · <a href="${url('/category/'+category)}">検索をクリア</a>`:''}</p>`+(items.length?cards(items):'<p class="empty">該当する商品がありません。別のキーワードでお試しください。</p>');
 event={event:'view_item_list',ecommerce:{items:items.map(p=>({item_id:p.id,item_name:p.name,price:p.price}))}};
 } else if(path.startsWith('/product/')){
 const p=products.find(p=>p.id===path.split('/')[2]);
 if(!p)return {title:'見つかりません',html:heading('404','商品が見つかりません'),status:404};
 title=p.name;content=`<a class="back" href="${url('/category/'+p.category)}">← 商品一覧へ</a><section class="detail">${art(p)}<div><span class="eyebrow">EVERYDAY ESSENTIALS</span><h1>${p.name}</h1><p class="price">${yen(p.price)} <small>税込</small></p><p class="description">${p.description}</p>${favorite(p)}${form('add',input('id',p.id)+`<label>数量 <input type="number" name="qty" min="1" max="20" value="1" required></label><button class="button">カートに追加する</button><label class="status-select">返却ステータス<select name="scenario">${[['200','200 · 成功'],['400','400 · 入力エラー'],['500','500 · サーバーエラー'],['503','503 · 一時利用不可']].map(([value,label])=>`<option value="${value}" ${String(feedback?.scenario||'200')===value?'selected':''}>${label}</option>`).join('')}</select></label><p class="note">エラーを選択した場合、商品は追加されません。</p>`)}<div id="cart-feedback" role="status" aria-live="polite" class="cart-feedback ${feedback?'shown':''} ${feedback?.status>=400?'error':'success'}">${feedback?esc('HTTP '+feedback.status+' — '+feedback.message):''}</div><a class="cart-link" href="${url('/cart')}">カートを見る →</a><p class="note">学習用の商品です。実際の配送・課金はありません。</p></div></section>`;
 event={event:'view_item',ecommerce:{currency:'JPY',value:p.price,items:[{item_id:p.id,item_name:p.name,price:p.price}]}};
 } else if(path==='/cart'){
 title='ショッピングカート';content=steps(0)+heading('YOUR BAG',title)+(cart.length?form('cart',`<div class="cart-layout"><div>${itemsHtml(true)}</div><aside><h2>ご注文内容</h2>${amounts()}<button class="button">送り先へ進む →</button>${statusSelect()}${notice()}</aside></div>`):'<div class="empty"><h2>カートは空です。</h2><a class="button" href="'+url('/category/all')+'">商品を探す</a></div>');
 event={event:'view_cart',ecommerce};
 } else if(path==='/checkout/shipping'){
 title='送り先';const values=feedback?.values||state.shipping||(state.profile?.address?state.profile:sampleShipping);
 const field=(name,label,limit,pattern='')=>`<label>${label}<input name="${name}" value="${esc(values[name])}" maxlength="${limit}" ${pattern?`pattern="${pattern}"`:''} required autocomplete="off"></label>`;
 content=steps(1)+heading('SHIPPING','送り先を入力')+`<div class="checkout-panel"><p class="note">検証用の架空の情報を入力してください。実際の配送はありません。</p>${form('shipping',field('name','お名前',80)+field('postal','郵便番号（例：000-0000）',8,'[0-9]{3}-?[0-9]{4}')+field('address','住所',200)+field('phone','電話番号（例：000-0000-0000）',20,'[0-9+() -]{8,20}')+`<div class="flow-actions"><a href="${url('/cart')}">← カートへ戻る</a><button class="button">支払い方法へ進む →</button></div>${statusSelect()}${notice()}`)}</div>`;
 event={event:'begin_checkout',ecommerce};
 } else if(path==='/checkout/payment'){
 title='支払い方法';const values=feedback?.values||{payment:state.payment||'card',coupon:state.coupon||''};
 content=steps(2)+heading('PAYMENT','支払い方法・クーポン')+`<div class="checkout-panel">${form('payment',`<fieldset class="payment-options"><legend>支払い方法</legend>${Object.entries(payments).map(([id,label])=>`<label><input type="radio" name="payment" value="${id}" ${values.payment===id?'checked':''} required>${label}</label>`).join('')}</fieldset><p class="note">模擬決済です。カード番号や口座情報の入力は不要です。</p><label>クーポンコード<input name="coupon" value="${esc(values.coupon)}" maxlength="30" placeholder="DEMO10" autocomplete="off"></label><p class="note">DEMO10で商品小計から10%割引します。「確認へ進む」で適用します。</p><div class="flow-actions"><a href="${url('/checkout/shipping')}">← 送り先へ戻る</a><button class="button">確認へ進む →</button></div>${statusSelect()}${notice()}`)}</div>`;
 } else if(path==='/checkout/confirm'){
 title='ご注文の確認';const ship=state.shipping;
 content=steps(3)+heading('REVIEW',title)+`<div class="cart-layout"><div>${itemsHtml()}<section class="review-block"><h2>送り先</h2><p>${esc(ship.name)} 様<br>〒${esc(ship.postal)}<br>${esc(ship.address)}<br>${esc(ship.phone)}</p><a href="${url('/checkout/shipping')}">送り先を変更</a></section><section class="review-block"><h2>支払い方法</h2><p>${esc(payments[state.payment])}</p><p>クーポン：${esc(state.coupon||'利用なし')}</p><a href="${url('/checkout/payment')}">支払い方法・クーポンを変更</a></section></div><aside><h2>ご注文内容</h2>${amounts()}${form('purchase',input('checkoutToken',state.checkoutToken)+`<p class="note">課金・配送は発生しません。</p><button class="button">模擬注文を確定する</button>${statusSelect()}${notice()}`)}</aside></div>`;
 } else if(path==='/register'){
 title='新規会員登録';const values=feedback?.values||state.registration||{};
 content=heading('CREATE ACCOUNT','新規会員登録')+`<div class="auth-card"><p>検証用の会員を作成します。架空の情報とテスト専用パスワードを入力してください。</p>${form('register-review',`<label>お名前<input name="name" maxlength="80" value="${esc(values.name)}" required autocomplete="off"></label><label>メールアドレス<input name="email" type="email" maxlength="254" value="${esc(values.email)}" required autocomplete="off"></label><label>パスワード<input name="password" type="password" minlength="8" maxlength="128" required autocomplete="new-password"></label><label>パスワード（確認）<input name="passwordConfirm" type="password" minlength="8" maxlength="128" required autocomplete="new-password"></label><p class="note">8〜128文字で入力してください。確認画面から戻った場合は再入力します。</p><button class="button">登録内容を確認する →</button>${statusSelect()}${notice()}`)}<p><a href="${url('/login')}">登録済みの方はログイン →</a></p></div>`;
 } else if(path==='/register/confirm'){
 if(!state.registration)return {redirect:'/register'};
 const draft=state.registration;title='会員登録の確認';
 content=heading('REVIEW ACCOUNT','登録内容の確認')+`<div class="auth-card"><dl class="registration-summary"><dt>お名前</dt><dd>${esc(draft.name)}</dd><dt>メールアドレス</dt><dd>${esc(draft.email)}</dd><dt>パスワード</dt><dd>設定済み（非表示）</dd></dl>${form('register-confirm',input('registrationToken',draft.token)+`<button class="button">会員登録を完了する</button>${statusSelect()}${notice()}`)}<p><a href="${url('/register')}">← 入力内容を修正する</a></p></div>`;
 } else if(path==='/register/complete'){
 if(!state.registrationComplete)return {redirect:'/register'};
 title='会員登録完了';content=heading('WELCOME','会員登録が完了しました')+`<div class="auth-card"><p>登録したメールアドレスとパスワードでログインできます。</p>${form('register-finish',`<button class="button">ログインへ進む →</button>${statusSelect()}${notice()}`)}</div>`;
 } else if(path==='/login'){
 title='ログイン';content=heading('WELCOME BACK','ログイン')+`<div class="auth-card"><p>登録したアカウント、またはデモアカウントでログインできます。</p>${form('login',`<label>メールアドレス<input name="email" type="email" value="${esc(feedback?.values?.email||state.registrationComplete?.email||'demo@example.test')}" required autocomplete="username"></label><label>パスワード<input name="password" type="password" required autocomplete="current-password"></label><button class="button">ログイン</button>${statusSelect()}${notice()}`)}<p class="note">デモ：demo@example.test / demo-password</p><a class="register-link" href="${url('/register')}">新規会員登録はこちら →</a></div>`;
 } else if(['/account','/account/orders','/account/profile','/account/favorites'].includes(path)){
 const section=path==='/account'?'orders':path.split('/')[2];
 title={orders:'注文履歴',profile:'個人情報の編集',favorites:'お気に入り'}[section];
 const tabs=`<nav class="account-tabs" aria-label="マイページメニュー">${[['orders','注文履歴'],['profile','個人情報の編集'],['favorites','お気に入り']].map(([id,label])=>`<a href="${url('/account/'+id)}" class="${section===id?'active':''}" ${section===id?'aria-current="page"':''}>${label}</a>`).join('')}</nav>`;
 content=heading('MY ACCOUNT','マイページ')+`<div class="account-greeting"><p>${state.user?'こんにちは、'+esc(state.profile?.name||state.user.name)+'さん。':'このブラウザのお気に入りを保存できます。'}</p>${state.user?form('logout','<button class="text-button">ログアウト</button>'):`<a href="${url('/login')}">ログイン</a>`}</div>`+tabs+`<h2>${title}</h2>`;
 if(section==='favorites'){
 const saved=products.filter(p=>(state.favorites||[]).includes(p.id));
 content+=saved.length?cards(saved):`<div class="empty" id="favorites-empty"><p>お気に入りはまだありません。</p><a class="button" href="${url('/category/all')}">商品を探す</a></div>`;
 }else if(!state.user){content+=`<p>この画面の利用にはデモログインが必要です。</p><a class="button" href="${url('/login')}">ログインする</a>`;
 }else if(section==='profile'){
 const values=feedback?.values||state.profile||{name:state.user.name,email:'demo@example.test',postal:'',address:'',phone:''};
 const field=(name,label,type='text',required=false,max=200)=>`<label>${label}<input name="${name}" type="${type}" value="${esc(values[name])}" maxlength="${max}" ${required?'required':''} autocomplete="off"></label>`;
 content+=`<div class="checkout-panel"><p class="note">検証用の架空の情報を入力してください。登録会員のメールアドレスを変更すると、次回ログインにも新しいアドレスを使います。デモ認証情報は変わりません。</p>${form('profile',field('name','お名前','text',true,80)+field('email','メールアドレス','email',true,254)+field('postal','郵便番号','text',false,8)+field('address','住所')+field('phone','電話番号','tel',false,20)+'<button class="button">変更を保存する</button>'+statusSelect()+notice())}${new URLSearchParams(query).get('saved')==='1'?'<p class="save-notice" role="status">個人情報を保存しました。</p>':''}</div>`;
 }else{
 content+=state.orders.length?state.orders.map(o=>`<article class="order"><div class="order-heading"><strong>注文番号 ${esc(o.id)}</strong><span>${yen(o.total)}</span></div><p>${esc(new Date(o.at).toLocaleString('ja-JP'))} · 模擬注文</p>${o.items.map(i=>`<div class="history-product"><a href="${url('/product/'+i.id)}">${esc(i.name)} × ${i.qty}</a>${favorite(i)}</div>`).join('')}</article>`).join(''):'<div class="empty"><p>注文はまだありません。</p><a class="button" href="'+url('/category/all')+'">商品を探す</a></div>';
 }
 } else if(path.startsWith('/complete/')){
 const o=state.user&&state.orders.find(o=>o.id===path.split('/')[2]);title='注文完了';
 content=o?steps(4)+`<div class="empty"><span class="success-icon">✓</span>${heading('THANK YOU','ご注文ありがとうございます。')}<p>模擬注文を受け付けました。課金・配送は発生しません。</p><p>注文番号 ${esc(o.id)}</p><p>${yen(o.total)}</p>${form('finish',input('orderId',o.id)+`<button class="button">注文履歴を見る</button>${statusSelect()}${notice()}`)}</div>`:heading('404','注文が見つかりません');
 if(!o)return {title,html:content,status:404};
 } else return {title:'見つかりません',html:heading('404','ページが見つかりません'),status:404};
 content+=[...favoriteForms.values()].join('')+'<div id="favorite-feedback" class="favorite-toast" role="status" aria-live="polite"></div>';
 return {title,html:content,event};
}
export function layout(inner,state,mode){const base='/'+mode;return `<div class="notice">DEMO STORE / 学習・計測検証用のECサイト</div><header><a class="brand" href="${base}/">Exture Store</a><nav aria-label="メインナビゲーション"><a href="${base}/category/all">すべての商品</a><a href="${base}/category/living">暮らし</a><a href="${base}/category/desk">デスク</a><a href="${base}/category/outdoor">お出かけ</a></nav><div class="header-actions"><a href="${base}/account/favorites">♡ お気に入り</a><a href="${base}/${state.user?'account':'login'}">${state.user?'マイページ':'ログイン'}</a><a href="${base}/cart">バッグ <span class="count">${state.cart.reduce((n,p)=>n+p.qty,0)}</span></a></div><form class="header-search search" role="search" action="${base}/category/all" method="get"><input name="q" type="search" aria-label="商品を検索" placeholder="商品名・キーワードで検索"><button type="submit">検索</button></form></header><div class="labbar"><a href="/lab/" data-full>静的ページ一覧 ↗</a><span>表示方式</span><a href="/classic/" data-full class="${mode==='classic'?'selected':''}">MPA · HTML遷移</a><a href="/spa/" data-full class="${mode==='spa'?'selected':''}">SPA · API通信</a></div><main id="content">${inner}</main><footer><a class="brand" href="${base}/">Exture Store</a><p>小さなものから、心地よい毎日を。</p><small>Exture Store · サンプルサイト / 実際の販売は行いません。</small></footer>`;}

export function staticGallery(pages){
 const cards=pages.map((p,i)=>`<a class="product-card static-card" href="${esc(p.url)}"><div class="static-cover" aria-hidden="true"><span class="static-number">${String(i+1).padStart(2,'0')}</span><div class="page-symbol"><b>&lt;/&gt;</b><i></i><i></i><i></i></div><span>HTML PAGE</span></div><div class="product-meta"><span>STATIC PAGE</span><span>↗</span></div><h3>${esc(p.title)}</h3><p class="static-filename">${esc(p.filename)}</p></a>`).join('');
 return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>静的ページ一覧 | Exture Store</title><link rel="stylesheet" href="/style.css"></head><body><div class="notice">HTML PAGE COLLECTION / 静的ページの検証スペース</div><header><a class="brand" href="/lab/">Exture Store</a><nav><a href="/classic/">ECトップ（MPA）</a><a href="/spa/">ECトップ（SPA）</a></nav></header><main><div class="section-heading"><div class="page-heading"><span class="eyebrow">YOUR STATIC PAGES</span><h1>静的ページ一覧</h1><p>追加したページを選んで、表示や動作を確認できます。</p></div><span>${pages.length} PAGES</span></div>${pages.length?`<div class="product-grid">${cards}</div>`:'<div class="empty"><h2>ページはまだありません。</h2><p>HTMLを追加すると、ここに表示されます。</p></div>'}</main><footer><p>Exture Store · 静的ページの検証スペース</p></footer></body></html>`;
}
