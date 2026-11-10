// 商品の選択肢と、カートの同一商品・同一属性の識別を共通化します。
export function selectAttributes(product, data = {}) {
  const selected = [];
  for (const attribute of product.attributes || []) {
    const value = data['option_' + attribute.id] ?? attribute.values[0];
    if (typeof value !== 'string' || !attribute.values.includes(value)) return null;
    selected.push({id: attribute.id, label: attribute.label, value});
  }
  return selected;
}
export function lineKey(item) {
  return item.attributes?.length
    ? JSON.stringify([item.id, item.attributes.map(a => [a.id, a.value])])
    : item.id;
}
export function variantPrice(product, selected = []) {
  return product.price + (product.attributes || []).reduce((sum, attribute) => {
    const value = selected.find(a => a.id === attribute.id)?.value;
    return sum + (Object.hasOwn(attribute.priceAdjustments || {}, value) ? attribute.priceAdjustments[value] : 0);
  }, 0);
}
export function pricedItem(product, item) {
  return {...product, ...item, attributes: item.attributes || [], price: variantPrice(product, item.attributes || [])};
}
export function attributeText(item) {
  return (item.attributes || []).map(a => `${a.label}：${a.value}`).join(' / ');
}
export function eventItem(item) {
  return {item_id: item.id, item_name: item.name, price: item.price,
    ...(item.qty === undefined ? {} : {quantity: item.qty}),
    ...(item.attributes?.length ? {item_variant: attributeText(item)} : {})};
}
