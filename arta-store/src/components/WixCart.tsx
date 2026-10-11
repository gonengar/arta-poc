import {commerceRequest} from '../lib/shop-client';
import React,{useEffect,useState} from 'react';
import {ShoppingBag,ArrowLeft,Plus,Minus,X} from 'lucide-react';
import {ProductImage,money} from './StoreUI';
type Row={id:string;name:string;slug:string;quantity:number;price:number;total:number;image:string;description:string};
type CartData={rows:Row[];count:number;subtotal:number};
export default function Cart(){
 const [cart,setCart]=useState<CartData|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function load(){setError('');try{const d=await commerceRequest();setCart(d)}catch(e){setError(e instanceof Error?e.message:'טעינת הסל לא הצליחה.')}}
 useEffect(()=>{load()},[]);
 async function action(action:string,row?:Row,quantity?:number){setBusy(true);setError('');try{const d=await commerceRequest({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,lineItemId:row?.id,quantity})});if(action==='checkout'){window.location.assign(d.url);return}setCart(d);window.dispatchEvent(new Event('arta-basket'))}catch(e){setError(e instanceof Error?e.message:'עדכון הסל לא הצליח.')}finally{setBusy(false)}}
 const alert=error&&<div className="error-state" role="alert">{error}<button onClick={load} disabled={busy}>ניסיון נוסף</button></div>;
 if(!cart)return <>{alert}{!error&&<p role="status">טוענים את הסל…</p>}</>;
 if(!cart.rows.length)return <>{alert}<div className="empty-state"><ShoppingBag size={48}/><h2>היצירה הבאה שלכם מתחילה כאן</h2><p>הסל עדיין ריק. בואו למצוא חומרים שיעוררו השראה.</p><a className="button" href="/shop">לגלות את הקטלוג <ArrowLeft size={18}/></a></div></>;
 return <>{alert}<div className="cart-layout" aria-busy={busy}><div className="cart-items">{cart.rows.map(x=><article className="cart-item" key={x.id}><a href={x.slug?'/product/'+x.slug:'/shop'}><ProductImage src={x.image} name={x.name}/></a><div><a href={x.slug?'/product/'+x.slug:'/shop'}><h2 dir="auto">{x.name}</h2></a>{x.description&&<p dir="auto">{x.description}</p>}<div className="quantity"><button disabled={busy||x.quantity<=1} onClick={()=>action('update',x,x.quantity-1)} aria-label="הפחתת כמות"><Minus size={15}/></button><output>{x.quantity}</output><button disabled={busy||x.quantity>=99} onClick={()=>action('update',x,x.quantity+1)} aria-label="הגדלת כמות"><Plus size={15}/></button></div></div><div className="cart-item-end"><button disabled={busy} onClick={()=>action('remove',x)} aria-label="הסרת מוצר מהסל"><X size={20}/></button><strong>{money(x.total)}</strong></div></article>)}</div><aside className="cart-summary"><h2>סיכום הסל</h2><div><span>פריטים</span><span>{cart.count}</span></div><div><span>סכום ביניים</span><strong>{money(cart.subtotal)}</strong></div><p>המחירים והמלאי להדגמה. פרטי המשלוח והתשלום יוצגו בקופה לפני אישור ההזמנה.</p><button className="button" disabled={busy} onClick={()=>action('checkout')}>{busy?'מעדכנים…':'המשך לקופה'}<ArrowLeft size={18}/></button><a href="/shop">להמשיך לגלות <ArrowLeft size={17}/></a></aside></div></>;
}
