import test from 'node:test';
import assert from 'node:assert/strict';
import {commerceRequest} from '../src/lib/shop-client.ts';
const originalFetch=globalThis.fetch;
test.afterEach(()=>{globalThis.fetch=originalFetch});
test('local cart requests reuse framework cookies without attaching authorization',async()=>{
 globalThis.fetch=async(url,init)=>{assert.equal(url,'/api/commerce');assert.equal(init.credentials,'same-origin');assert.equal(init.headers.get('authorization'),null);assert.equal(init.headers.get('accept'),'application/json');assert.equal(init.headers.get('content-type'),'application/json');assert.equal(init.body,'{"action":"checkout"}');return Response.json({url:'https://example.test/checkout'})};
 assert.deepEqual(await commerceRequest({method:'POST',headers:{'Content-Type':'application/json'},body:'{"action":"checkout"}'}),{url:'https://example.test/checkout'});
});
test('HTML response gives a Hebrew recovery message instead of a JSON parser exception',async()=>{
 globalThis.fetch=async()=>new Response(' <!-- --> <html>error</html>',{headers:{'Content-Type':'text/html'}});
 await assert.rejects(commerceRequest(),e=>e.message.includes('לרענן')&&!e.message.includes('Unexpected token'));
});
test('malformed JSON is handled without exposing parser errors',async()=>{
 globalThis.fetch=async()=>new Response('<!-- -->',{headers:{'Content-Type':'application/json'}});
 await assert.rejects(commerceRequest(),e=>e.message.includes('לרענן'));
});
test('structured cart errors retain their server message',async()=>{
 globalThis.fetch=async()=>Response.json({error:'סל הקניות ריק.'},{status:400});
 await assert.rejects(commerceRequest(),{message:'סל הקניות ריק.'});
});
