export const categories = [ ['all','すべて'], ['living','暮らし'], ['desk','デスク'], ['outdoor','お出かけ'] ];
export const products = [
 {id:'mug',name:'ストーンウェア マグ',category:'living',price:2400,color:'#b98264',shape:'mug',tag:'BEST SELLER',description:'手にすっとなじむ、やわらかな曲線。毎日の一杯を少し楽しみにする、マットな質感のマグカップです。'},
 {id:'lamp',name:'ポータブル テーブルライト',category:'living',price:6800,color:'#cbb778',shape:'lamp',tag:'NEW',description:'読書の時間にも、ベッドサイドにも。空間に静かな温かさを添える、小さなテーブルライトです。'},
 {id:'bag',name:'キャンバス トート',category:'outdoor',price:3800,color:'#9b9e7e',shape:'bag',tag:'DAILY ESSENTIAL',description:'必要なものを気軽にまとめて。丈夫なキャンバスと素朴な風合いを楽しむ、毎日のトートバッグです。'},
 {id:'book',name:'ドットグリッド ノート',category:'desk',price:1200,color:'#6e8880',shape:'book',tag:'',description:'アイデアも日々の記録も、この一冊に。自由に書きやすいドット方眼のノートです。'},
 {id:'bottle',name:'ステンレス ボトル',category:'outdoor',price:3200,color:'#b5a18d',shape:'bottle',tag:'',description:'散歩や仕事のお供に。持ち歩きやすいサイズと、すっきりとしたフォルムのボトルです。'},
 {id:'tray',name:'オーク デスクトレイ',category:'desk',price:2800,color:'#b88d57',shape:'tray',tag:'',description:'お気に入りの道具に、いつもの居場所を。デスクを整える木のぬくもりを感じるトレイです。'}
];

export function searchProducts(query='',category='all'){
 const normalize=value=>String(value).normalize('NFKC').toLocaleLowerCase('ja').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
 const terms=normalize(query).trim().split(/\s+/).filter(Boolean);
 return products.filter(p=>{const text=normalize([p.name,p.description,p.category,categories.find(c=>c[0]===p.category)?.[1]].join(' '));return(category==='all'||p.category===category)&&terms.every(term=>text.includes(term));});
}
