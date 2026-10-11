import type { APIRoute } from 'astro';
import { listProducts } from '../../lib/catalog';
export const GET:APIRoute=async({url})=>{try{return Response.json(await listProducts(url.searchParams))}catch(e){console.error('Catalog read failed',e instanceof Error?e.message:'error');return Response.json({error:'לא הצלחנו לטעון את המוצרים. אפשר לנסות שוב.'},{status:503})}};
