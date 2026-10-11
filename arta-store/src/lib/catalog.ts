import { productsV3, readOnlyVariantsV3 } from '@wix/stores';
import { categories } from '@wix/categories';
import { items } from '@wix/data';
import { media } from '@wix/sdk';

export const PRODUCT_FIELDS:any=['CURRENCY','PLAIN_DESCRIPTION','MEDIA_ITEMS_INFO'];
export function imageUrl(value:any){
 const v=typeof value==='string'?value:value?.url;
 if(!v)return '';
 try{return v.startsWith('wix:image://')?media.getScaledToFillImageUrl(v,800,800,{}):v.startsWith('https://')?v:''}catch{return ''}
}
export function plain(value:any):string{return typeof value==='string'?value.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'\"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim():''}
export async function settings(){
 try {const r=await items.query('ArtaSettings').eq('_id','commerce').find();return r.items[0]?.value||{checkoutEnabled:false,pricingMode:'demo'}}
 catch{return {checkoutEnabled:false,pricingMode:'demo'}}
}
export async function navigation(){
 const [tree,live]=await Promise.allSettled([
  items.query('ArtaCategories').ascending('order').limit(1000).find(),
  categories.queryCategories({treeReference:{appNamespace:'@wix/stores'}}).exists('name',true).limit(1000).find(),
 ]);
 const nodes:any[]=tree.status==='fulfilled'?tree.value.items:[];
 const cats:any[]=live.status==='fulfilled'?live.value.items:[];
 const byId=new Map(cats.map(c=>[c._id,c]));
 const result=nodes.map(n=>({...n,name:byId.get(n.storeCategoryId)?.name||n.name,image:imageUrl(n.image)}));
 for(const c of cats)if(c.name&&!nodes.some(n=>n.storeCategoryId===c._id)&&c.name!=='All Products')result.push({key:c._id,name:c.name,parentKey:'',depth:0,storeCategoryId:c._id,storeSlug:c.slug,path:[c.name],image:''});
 return result;
}
export async function metadata(ids:string[]){
 if(!ids.length)return [];
 try{return (await items.query('ArtaProductDetails').hasSome('productId',ids).limit(1000).find()).items}catch{return []}
}
export function card(p:any,m:any={}){
 return {id:p._id,familyKey:m.familyKey||p._id,slug:p.slug,name:m.name||p.name,brand:m.brand||p.brand?.name||'',series:m.series||'',kind:m.kind||'',technique:m.technique||'',image:imageUrl(p.media?.main?.image)||imageUrl(m.image),price:Number(p.actualPriceRange?.minValue?.amount||0),currency:p.currency||'ILS',description:plain(p.plainDescription)||m.description||'',variantCount:m.familyVariantCount||m.variants?.items?.length||1,inStock:p.inventory?.availabilityStatus==='IN_STOCK'};
}
export async function listProducts(params:URLSearchParams){
 const category=params.get('category')||'';const q=(params.get('q')||'').slice(0,100);const cursor=params.get('cursor')||'';
 const filters:any[]=[];
 if(category)filters.push({'directCategoriesInfo.categories':{$matchItems:[{id:category}]}});
 const extras=['brand','series','level','kind','brushShape','brushSize'].filter(k=>params.get(k));
 if(extras.length){let mq=items.query('ArtaProductDetails');for(const f of extras)mq=mq.eq(f,params.get(f));let page=await mq.limit(1000).find();const matches=[...page.items];while(page.hasNext()){page=await page.next();matches.push(...page.items)}if(!matches.length)return {products:[],nextCursor:null};filters.push({_id:{$in:matches.map(m=>m.productId)}})}
 const min=params.get('min'),max=params.get('max');
 if(min||max)filters.push({'variantsInfo.variants':{$matchItems:[{$and:[...(min?[{'price.actualPrice.amount':{$gte:Number(min)}}]:[]),...(max?[{'price.actualPrice.amount':{$lte:Number(max)}}]:[])]}]}});
 const search:any={cursorPaging:{limit:24,...(cursor?{cursor}:{})},...(filters.length?{filter:filters.length===1?filters[0]:{$and:filters}}:{}),...(q?{search:{expression:q,fields:['name','description'],mode:'AND',fuzzy:true}}:{})};
 const sort=params.get('sort');
 if(sort==='name')search.sort=[{fieldName:'name',order:'ASC'}];
 if(sort==='price-up'||sort==='price-down')search.sort=[{fieldName:'actualPriceRange.minValue.amount',order:sort==='price-up'?'ASC':'DESC'}];
 const r:any=await productsV3.searchProducts(search,{fields:PRODUCT_FIELDS});
 const ps=r.products||[];const ms=await metadata(ps.map((p:any)=>p._id));
 return {products:ps.map((p:any)=>card(p,ms.find(m=>m.productId===p._id))).filter((p:any,i:number,a:any[])=>a.findIndex(x=>x.familyKey===p.familyKey)===i),nextCursor:r.pagingMetadata?.cursors?.next||null,total:r.pagingMetadata?.total};
}
export async function featured(){
 const candidates=(await items.query('ArtaProductDetails').eq('featured',true).limit(100).find()).items.sort((a:any,b:any)=>(b.variants?.items?.length||0)-(a.variants?.items?.length||0));
 const ms:any[]=[];const brands=new Set();
 for(const m of candidates){if(!brands.has(m.brand)){brands.add(m.brand);ms.push(m)}}
 for(const m of candidates){if(ms.length>=8)break;if(!ms.some(x=>x._id===m._id))ms.push(m)}
 if(!ms.length)return (await listProducts(new URLSearchParams())).products.slice(0,8);
 const r=await productsV3.queryProducts({fields:PRODUCT_FIELDS}).in('_id',ms.map(m=>m.productId)).limit(12).find();
 return ms.map(m=>r.items.find(p=>p._id===m.productId)).filter(Boolean).map(p=>card(p,ms.find(m=>m.productId===p!._id)));
}
export async function productPage(slug:string){
 const ps=await productsV3.queryProducts({fields:PRODUCT_FIELDS}).eq('slug',slug).limit(1).find();const p=ps.items[0];if(!p)return null;
 const ms=await metadata([p._id!]);const m:any=ms[0]||{};
 let siblings:any[]=[m];
 if(m.familyKey)siblings=(await items.query('ArtaProductDetails').eq('familyKey',m.familyKey).limit(20).find()).items;
 const variants:any[]=[];
 for(const s of siblings){
  const id=s.productId||p._id;const r:any=await readOnlyVariantsV3.queryVariants().eq('productData.productId',id).limit(100).find();
  for(const v of r.items){const detail=s.variants?.items?.find((d:any)=>d.sku===v.sku)||{};variants.push({...detail,productId:id,variantId:v.variantId??v._id,sku:v.sku||detail.sku,image:imageUrl(detail.image)||imageUrl(s.image),price:Number(v.price?.actualPrice?.amount??v.actualPrice?.amount??detail.demoPrice??p.actualPriceRange?.minValue?.amount??0),inStock:!!v.inventoryStatus?.inStock})}
 }
 const rules=(await items.query('ArtaCrossSell').eq('technique',m.technique||'none').eq('sourceKind',m.kind||'none').find()).items;
 let related:any[]=[];
 if(rules.length){const candidates=(await items.query('ArtaProductDetails').eq('technique',m.technique).hasSome('kind',rules[0].allowedKinds||[]).ne('kind',m.kind).limit(6).find()).items; if(candidates.length){const r=await productsV3.queryProducts({fields:PRODUCT_FIELDS}).in('_id',candidates.map(x=>x.productId)).find();related=r.items.map(x=>card(x,candidates.find(y=>y.productId===x._id)))}}
 return {...card(p,m),meta:m,variants,related};
}
