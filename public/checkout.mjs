export const payments = {card:'クレジットカード（模擬）',bank:'銀行振込（模擬）',cod:'代金引換（模擬）'};
export const sampleShipping={name:'テスト 太郎',postal:'000-0000',address:'テスト県テスト市サンプル町1-2-3',phone:'000-0000-0000'};
export function totals(items,coupon=''){const subtotal=items.reduce((n,p)=>n+p.price*p.qty,0);const discount=coupon==='DEMO10'?Math.floor(subtotal*.1):0;return{subtotal,discount,total:subtotal-discount};}
export function checkoutRedirect(path,state){
 if(path==='/checkout')return '/checkout/shipping';
 if(!['/checkout/shipping','/checkout/payment','/checkout/confirm'].includes(path))return null;
 if(!state.cart.length)return '/cart';
 if(!state.user)return '/login';
 if(path!=='/checkout/shipping'&&!state.shipping)return '/checkout/shipping';
 if(path==='/checkout/confirm'&&!state.payment)return '/checkout/payment';
 return null;
}
