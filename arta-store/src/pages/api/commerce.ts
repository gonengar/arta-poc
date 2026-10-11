import type { APIRoute } from 'astro';
import { currentCartV2, cartV2 } from '@wix/ecom';
import { redirects } from '@wix/redirects';
import { imageUrl, metadata, settings } from '../../lib/catalog';
const STORE='215238eb-22a5-4c36-9e7b-e7c08025e04e';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
const validQuantity=(q:unknown)=>Number.isInteger(q)&&Number(q)>=1&&Number(q)<=99;
function isMissing(error:any){return error?.httpStatus===404||error?.status===404||error?.details?.httpStatus===404||/CART_NOT_FOUND|CURRENT_CART_NOT_FOUND|No current cart/i.test(error?.message||'')}
async function readCart(){try{return (await currentCartV2.getCurrentCart()).cart}catch(e){if(isMissing(e))return null;throw e}}
async function view(cart:any){
 const lines=cart?.lineItems||[];
 const ms=await metadata(lines.map((l:any)=>l.source?.catalogReference?.catalogItemId).filter(Boolean));
 const rows=lines.map((l:any)=>{const ref=l.source?.catalogReference;const m:any=ms.find(x=>x.productId===ref?.catalogItemId)||{};return {id:l._id,productId:ref?.catalogItemId,variantId:ref?.options?.variantId,name:l.name?.translated||l.name?.original||m.name||'',slug:m.slug||'',quantity:l.quantityInfo?.confirmedQuantity??l.quantityInfo?.requestedQuantity??1,price:Number(l.pricing?.unitPrice?.convertedAmount??l.pricing?.unitPrice?.amount??0),total:Number(l.pricing?.totalPrice?.convertedAmount??l.pricing?.totalPrice?.amount??0),image:imageUrl(l.attributes?.image)||imageUrl(m.image),status:l.status,description:(l.attributes?.descriptionLines||[]).map((d:any)=>d.plainText?.translated||d.plainText?.original||'').filter(Boolean).join(' · ')}});
 return {id:cart?._id||null,rows,currency:cart?.customerInfo?.currencyCode||cart?.businessInfo?.currencyCode||'ILS',count:rows.reduce((n:number,r:any)=>n+r.quantity,0),subtotal:rows.reduce((n:number,r:any)=>n+r.total,0)};
}
export const GET:APIRoute=async()=>{try{return json(await view(await readCart()))}catch(e){console.error('Arta cart read failed',e instanceof Error?e.message:'unknown');return json({error:'לא הצלחנו לטעון את הסל. אפשר לנסות שוב.'},503)}};
export const POST:APIRoute=async({request})=>{
 try{
  const origin=request.headers.get('Origin');const host=request.headers.get('Host')||new URL(request.url).host;
  if(origin&&new URL(origin).host!==host)return json({error:'הבקשה אינה מורשית.'},403);
  if((await settings()).checkoutEnabled!==true)return json({error:'הקופה אינה זמינה כרגע.'},409);
  let body:any;try{body=await request.json()}catch{return json({error:'בקשה לא תקינה.'},400)}
  if(body.action==='add'){
   if(typeof body.productId!=='string'||typeof body.variantId!=='string'||!body.productId||!body.variantId||!validQuantity(body.quantity))return json({error:'יש לבחור פריט וכמות תקינים.'},400);
   const {cart}=await currentCartV2.addLineItemsToCurrentCart({catalogItems:[{quantity:body.quantity,catalogReference:{catalogItemId:body.productId,appId:STORE,options:{variantId:body.variantId}}}]});
   return json(await view(cart));
  }
  const cart=await readCart();
  if(!cart?._id||!cart.lineItems?.length)return json({error:'סל הקניות ריק.'},400);
  if(body.action==='update'||body.action==='remove'){
   if(typeof body.lineItemId!=='string'||!cart.lineItems.some(x=>x._id===body.lineItemId))return json({error:'הפריט לא נמצא בסל.'},400);
   if(body.action==='remove'){const result=await currentCartV2.removeLineItemsFromCurrentCart([body.lineItemId]);return json(await view(result.cart))}
   if(!validQuantity(body.quantity))return json({error:'יש לבחור כמות בין 1 ל־99.'},400);
   const result=await cartV2.updateLineItems(cart._id,{lineItems:[{lineItemId:body.lineItemId,quantity:{newQuantity:body.quantity}}]});return json(await view(result.cart));
  }
  if(body.action==='checkout'){
   const publishedOrigin='https://'+host;
   const result=await redirects.createRedirectSession({ecomCheckout:{checkoutId:cart._id},preferences:{additionalQueryParameters:{lang:'he'}},callbacks:{postFlowUrl:publishedOrigin+'/cart'}});
   const url=result.redirectSession?.fullUrl;if(!url)throw new Error('Missing hosted checkout URL');
   return json({url});
  }
  return json({error:'פעולה לא מוכרת.'},400);
 }catch(e){console.error('Arta cart operation failed',e instanceof Error?e.message:'unknown');return json({error:'לא ניתן לעדכן את הסל כרגע. אנא נסו שוב.'},503)}
};
