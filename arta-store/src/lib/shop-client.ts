// Wix's rendering middleware owns the visitor session. Same-origin requests
// reuse its cookie; do not attach an SDK Authorization header to local routes.
export async function commerceRequest(init?:RequestInit){
 const headers=new Headers(init?.headers);
 headers.set('Accept','application/json');
 const response=await fetch('/api/commerce',{...init,headers,credentials:'same-origin',cache:'no-store'});
 const message='לא הצלחנו לקבל תשובה מהחנות. נסו לרענן את העמוד ולנסות שוב.';
 if(!response.headers.get('content-type')?.includes('application/json'))throw new Error(message);
 let data:any;
 try{data=await response.json()}catch{throw new Error(message)}
 if(!data||typeof data!=='object'||Array.isArray(data))throw new Error(message);
 if(!response.ok)throw new Error(typeof data.error==='string'?data.error:message);
 return data;
}
