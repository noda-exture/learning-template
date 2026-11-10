// 共通タグはサーバーでHTMLへ挿入します。SPAのルート変更時は呼ばれません。
export function injectCommonTags(html,{head='',bodyStart=''}={}){
 if(!head.trim()&&!bodyStart.trim())return html;
 const replaceAt=(pattern,content)=>{html=html.replace(pattern,match=>match+content);};
 // テンプレートにhead/bodyを省略したHTMLも補完します。
 if(!/<head(?:\s|>)/i.test(html)){
 if(/<html(?:\s|>)/i.test(html))replaceAt(/<html\b[^>]*>/i,'<head></head>');
 else if(/<!doctype\b[^>]*>/i.test(html))replaceAt(/<!doctype\b[^>]*>/i,'<head></head>');
 else html='<head></head>'+html;
 }
 if(!/<body(?:\s|>)/i.test(html)){
 if(/<\/head\s*>/i.test(html))replaceAt(/<\/head\s*>/i,'<body>');
 else html+='<body>';
 if(/<\/html\s*>/i.test(html))html=html.replace(/<\/html\s*>/i,'</body></html>');else html+='</body>';
 }
 // 置換文字列ではなくコールバックを使い、タグ内の$等をそのまま保持します。
 replaceAt(/<head\b[^>]*>/i,'\n'+head+'\n');
 replaceAt(/<body\b[^>]*>/i,'\n'+bodyStart+'\n');
 return html;
}
