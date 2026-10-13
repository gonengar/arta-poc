// Wix hosting proxies requests, so prefer the forwarded public URL over the internal request URL.
export function publicOrigin(request:Request){
 const forwarded=request.headers.get('x-wix-forwarded-url');
 if(forwarded)try{return new URL(forwarded).origin}catch{}
 return 'https://'+(request.headers.get('Host')||new URL(request.url).host);
}
// Astro's checkOrigin is off for the Wix proxy; state-changing API routes check Origin themselves.
export function isCrossOrigin(request:Request){
 const origin=request.headers.get('Origin');if(!origin)return false;
 const host=request.headers.get('Host')||new URL(request.url).host;
 try{return new URL(origin).host!==host&&new URL(origin).origin!==publicOrigin(request)}catch{return true}
}
