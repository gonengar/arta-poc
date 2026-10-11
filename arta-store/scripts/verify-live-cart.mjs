import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const base='https://arta-poc-gonenj-0806.wix-site-host.com';
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'arta-render-session-'));
const jar=path.join(temporary,'cookies');
const product='/product/arta-ed208947a123c77e';
let lineId;
const checks=[];
function request(route,{body,html=false,cookies=jar}={}){
 const output=path.join(temporary,'response');
 const args=['-sS','--max-time','60','-b',cookies,'-c',cookies,'-H',html?'Accept: text/html':'Accept: application/json','-H','Origin: '+base,'-o',output,'-w','%{http_code}\n%{content_type}'];
 if(body)args.push('-X','POST','-H','Content-Type: application/json','--data-binary','@-');
 args.push(base+route);
 const r=spawnSync('curl',args,{encoding:'utf8',input:body?JSON.stringify(body):undefined});
 assert.equal(r.status,0,'HTTP transport failed');
 const [status,type]=r.stdout.split('\n');const raw=fs.readFileSync(output,'utf8');
 assert.equal(Number(status),200,`${route} returned ${status}`);
 if(!html)assert.match(type,/application\/json/,'Cart API must return JSON');
 return html?raw:JSON.parse(raw);
}
try{
 request(product,{html:true});
 assert.ok(fs.readFileSync(jar,'utf8').split('\n').some(row=>row.split('\t')[5]==='wixSession'),'HTML rendering must issue the Wix visitor cookie');
 checks.push('framework-issued visitor cookie on HTML render');
 assert.equal(request('/api/commerce').count,0);
 const added=request('/api/commerce',{body:{action:'add',productId:'688c0b9e-d08e-477e-85bb-aa92720f568c',variantId:'9647beb5-9f89-4b2a-b547-afa9b2163417',quantity:1}});
 assert.equal(added.count,1);lineId=added.rows[0].id;
 request(product,{html:true});
 assert.equal(request('/api/commerce').count,1);
 checks.push('cart persists across page rendering with cookie-only requests');
 const updated=request('/api/commerce',{body:{action:'update',lineItemId:lineId,quantity:2}});assert.equal(updated.count,2);assert.equal(updated.subtotal,218);
 checks.push('quantity update');
 const checkout=request('/api/commerce',{body:{action:'checkout'}});assert.equal(new URL(checkout.url).protocol,'https:');
 checks.push('hosted checkout redirect');
 const otherJar=path.join(temporary,'other-cookies');request(product,{html:true,cookies:otherJar});assert.equal(request('/api/commerce',{cookies:otherJar}).count,0);
 checks.push('a second visitor has an independent empty cart');
 const removed=request('/api/commerce',{body:{action:'remove',lineItemId:lineId}});assert.equal(removed.count,0);lineId=null;
 checks.push('item removal');
 fs.writeFileSync('../context/framework-auth-verification.json',JSON.stringify({checkedAt:new Date().toISOString(),manualTokenGeneration:false,authorizationHeader:false,checks,paymentSubmitted:false},null,2)+'\n');
 console.log(checks.map(x=>'PASS: '+x).join('\n'));
}finally{
 if(lineId)try{request('/api/commerce',{body:{action:'remove',lineItemId:lineId}})}catch{}
 fs.rmSync(temporary,{recursive:true,force:true});
}
