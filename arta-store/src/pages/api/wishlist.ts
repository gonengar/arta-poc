import type { APIRoute } from 'astro';
import { members } from '@wix/members';
import { items } from '@wix/data';
import { productsV3 } from '@wix/stores';
import { PRODUCT_FIELDS, imageUrl } from '../../lib/catalog';
import { isCrossOrigin } from '../../lib/http';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
async function currentMember(){try{return (await members.getCurrentMember()).member||null}catch{return null}}
// ArtaWishlist is SITE_MEMBER_AUTHOR, so queries only return the current member's rows.
export const GET:APIRoute=async()=>{
 if(!await currentMember())return json({ids:[]});
 try{return json({ids:(await items.query('ArtaWishlist').limit(1000).find()).items.map(i=>i.productId)})}
 catch(e){console.error('Arta wishlist read failed',e instanceof Error?e.message:'unknown');return json({error:'לא הצלחנו לטעון את המוצרים השמורים.'},503)}
};
export const POST:APIRoute=async({request})=>{
 if(isCrossOrigin(request))return json({error:'הבקשה אינה מורשית.'},403);
 if(!await currentMember())return json({login:true},401);
 let body:any;try{body=await request.json()}catch{return json({error:'בקשה לא תקינה.'},400)}
 const {productId,remove}=body||{};if(typeof productId!=='string'||!productId)return json({error:'פריט לא תקין'},400);
 try{
  const existing=await items.query('ArtaWishlist').eq('productId',productId).find();
  if(remove){for(const item of existing.items)await items.remove('ArtaWishlist',item._id!);return json({saved:false})}
  if(!existing.items.length){const p=(await productsV3.queryProducts({fields:PRODUCT_FIELDS}).eq('_id',productId).find()).items[0];if(!p)return json({error:'המוצר לא נמצא'},404);await items.insert('ArtaWishlist',{productId,name:p.name,slug:p.slug,image:imageUrl(p.media?.main?.image)})}
  return json({saved:true});
 }catch(e){console.error('Arta wishlist update failed',e instanceof Error?e.message:'unknown');return json({error:'השמירה לא הצליחה. נסו שוב.'},503)}
};
