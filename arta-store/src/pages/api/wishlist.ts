import type { APIRoute } from 'astro';
import { members } from '@wix/members';
import { items } from '@wix/data';
import { productsV3 } from '@wix/stores';
import { PRODUCT_FIELDS, imageUrl } from '../../lib/catalog';
export const POST:APIRoute=async({request})=>{
 try{
  const {member}=await members.getCurrentMember({fieldsets:['FULL']});if(!member)return Response.json({login:true},{status:401});
  const {productId,remove}=await request.json();if(typeof productId!=='string')return Response.json({error:'פריט לא תקין'},{status:400});
  const existing=await items.query('ArtaWishlist').eq('productId',productId).find();
  if(remove){for(const item of existing.items)await items.remove('ArtaWishlist',item._id!);return Response.json({saved:false})}
  if(!existing.items.length){const p=(await productsV3.queryProducts({fields:PRODUCT_FIELDS}).eq('_id',productId).find()).items[0];if(!p)return Response.json({error:'המוצר לא נמצא'},{status:404});await items.insert('ArtaWishlist',{productId,name:p.name,slug:p.slug,image:imageUrl(p.media?.main?.image)})}
  return Response.json({saved:true});
 }catch{return Response.json({login:true},{status:401})}
};
