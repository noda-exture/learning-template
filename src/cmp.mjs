// 共通タグとは独立して、すべてのHTMLへ同意設定UIを追加します。
export function injectCmp(html) {
  const script = '<script type="module" src="/cmp.mjs" data-exture-cmp></script>';
  if (/<script\b[^>]*\bdata-exture-cmp(?:\s|=|>)/i.test(html)) return html;
  return /<\/body\s*>/i.test(html)
    ? html.replace(/<\/body\s*>/i, match => script + match)
    : html + script;
}
