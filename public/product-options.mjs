import {products} from './catalog.mjs';
import {selectAttributes, variantPrice} from './variants.mjs';

// MPAとSPAの両方で、選択変更時の表示価格を更新します。
document.addEventListener('change', event => {
  const form = event.target.closest('form[data-action="add"]');
  if (!form || !event.target.name.startsWith('option_')) return;
  const data = Object.fromEntries(new FormData(form));
  const product = products.find(p => p.id === data.id);
  const attributes = product && selectAttributes(product, data);
  const price = document.querySelector('#product-price');
  if (attributes && price) price.textContent = '¥' + variantPrice(product, attributes).toLocaleString('ja-JP');
});
