import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const root=new URL('.',import.meta.url).pathname;
const config=JSON.parse(fs.readFileSync(root+'arta-store/wix.config.json'));
const token=fs.readFileSync('/tmp/arta-wix-token','utf8').trim();
const catalog=JSON.parse(fs.readFileSync(root+'context/catalog.json'));
const statePath=root+'context/wix-import-state.json';
const state=fs.existsSync(statePath)?JSON.parse(fs.readFileSync(statePath)):{siteId:config.siteId,apps:{},products:{},categories:{},collections:{},cms:{},assignments:{},images:{}};
function save(){fs.writeFileSync(statePath,JSON.stringify(state,null,2));}
export function api(path,body,method='POST',retried=false){
 const r=spawnSync('curl',['-sS','--max-time','120','-X',method,'https://www.wixapis.com/'+path,'-H','Authorization: Bearer '+token,'-H','wix-site-id: '+config.siteId,'-H','Content-Type: application/json','-w','\n%{http_code}',...(body!==undefined?['--data-binary','@-']:[])],{input:body===undefined?undefined:JSON.stringify(body),encoding:'utf8',maxBuffer:40*1024*1024});
 if(r.status!==0)throw new Error('Transport failure '+path+': '+r.stderr);
 const i=r.stdout.lastIndexOf('\n'),status=Number(r.stdout.slice(i+1));
 if(status===429&&!retried){console.log('Rate limited; waiting 30 seconds before retry');Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,30000);return api(path,body,method,true)}
 let data;try{data=JSON.parse(r.stdout.slice(0,i))}catch{throw new Error('Non-JSON response '+status+' '+path)}
 if(status>=400)throw new Error(JSON.stringify({path,status,response:data}));return data;
}
const STORE='215238eb-22a5-4c36-9e7b-e7c08025e04e';
const treeReference={appNamespace:'@wix/stores',treeKey:null};
const mode=process.argv[2]||'all';
function product(g){
 const multiple=g.variants.length>1;
 const optionName='בחירת פריט '+g.key;
 const label=v=>[v.shade||v.name,v.size].filter(Boolean).join(' · ').slice(0,47-String(v.sku).length)+' · '+v.sku;
 return {name:g.name.slice(0,80),slug:'arta-'+g.key,productType:'PHYSICAL',physicalProperties:{},visible:true,visibleInPos:false,
  description:{nodes:[{type:'PARAGRAPH',id:'description',nodes:[{type:'TEXT',textData:{text:(g.description||g.name).slice(0,20000)}}],paragraphData:{textStyle:{textAlignment:'RIGHT'}}}],metadata:{version:1}},
  ...(multiple?{options:[{name:optionName,optionRenderType:'TEXT_CHOICES',choicesSettings:{choices:g.variants.map(v=>({choiceType:'CHOICE_TEXT',name:label(v)}))}}]}:{}),
  variantsInfo:{variants:g.variants.map(v=>({sku:v.sku,visible:true,price:{actualPrice:{amount:String(v.demoPrice)}},physicalProperties:{},inventoryItem:{quantity:0,preorderInfo:{enabled:false}},...(multiple?{choices:[{optionChoiceNames:{optionName,choiceName:label(v),renderType:'TEXT_CHOICES'}}]}:{})}))}};
}
if(mode==='all'||mode==='setup'){
 for(const [name,id] of Object.entries({stores:STORE,members:'14cc59bc-f0b7-15b8-e1c7-89ce41d0e0c9'}))if(!state.apps[name]){
  api('apps-installer-service/v1/app-instance/install',{tenant:{tenantType:'SITE',id:config.siteId},appInstance:{appDefId:id,enabled:true}});state.apps[name]=true;save();console.log('Installed',name);
 }
 const existing=api('stores/v3/products/query',{query:{paging:{limit:10}}}); console.log('Existing product count',existing.pagingMetadata?.total, 'names',(existing.products||[]).map(x=>x.name));
}
if(mode==='all'||mode==='products'){
 if(!Object.keys(state.products).length){
  const existing=api('stores/v3/products/query',{query:{paging:{limit:100}}});
  const samples=new Set(['Ceramic Flower Vase','Minimalist Tote Bag','Hydrating Eye Serum - Pre Order','Knitted Golf Sweater','Round Eyeglasses','Solid Wood Chair','Foaming Facial Cleanser','Baseball Cap','Stainless Steel Water Bottle','Essential Oil Diffuser','Textured Loop Earrings','Crew T-Shirt']);
  const ids=(existing.products||[]).filter(p=>samples.has(p.name)).map(p=>p.id);
  if(ids.length){api('stores/v3/bulk/products/delete',{productIds:ids});console.log('Removed fresh-install sample products',ids.length);}
 }
 let pending=catalog.products.filter(g=>!state.products[g.key]);
 while(pending.length){
  const batch=[];let variants=0;
  while(pending.length&&batch.length<50&&variants+pending[0].variants.length<=900){const g=pending.shift();batch.push(g);variants+=g.variants.length}
  const response=api('stores/v3/bulk/products-with-inventory/create',{products:batch.map(product),returnEntity:true});
  let failures=[];
  for(const result of response.productResults?.results||[]){const g=batch[result.itemMetadata.originalIndex];if(result.itemMetadata.success){state.products[g.key]={id:result.item.id,slug:result.item.slug,revision:result.item.revision};}else failures.push({key:g.key,error:result});}
  save();console.log('Products',Object.keys(state.products).length,'/',catalog.products.length,'failures',failures.length);
  if(failures.length){fs.writeFileSync(root+'context/import-errors.json',JSON.stringify(failures,null,2));throw new Error('Product failures; see context/import-errors.json')}
  if(!(response.productResults?.results?.length))throw new Error('Missing product results');
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,3500);
 }
}
if(mode==='all'||mode==='categories'){
 for(const n of catalog.categories)if(!state.categories[n.key]){
  const r=api('categories/v1/categories',{category:{name:n.name,description:n.path.join(' › '),visible:true},treeReference});
  state.categories[n.key]={id:r.category.id,slug:r.category.slug};save();
  if(Object.keys(state.categories).length%20===0)console.log('Categories',Object.keys(state.categories).length,'/',catalog.categories.length);
 }
 for(const n of catalog.categories){
  if(state.assignments[n.key])continue;
  const products=catalog.products.filter(g=>g.categoryKeys.includes(n.key)&&state.products[g.key]);
  for(let i=0;i<products.length;i+=1000){const result=api('categories/v1/bulk/categories/'+state.categories[n.key].id+'/add-items',{items:products.slice(i,i+1000).map(g=>({catalogItemId:state.products[g.key].id,appId:STORE})),treeReference});if(result.bulkActionMetadata?.totalFailures)throw new Error(JSON.stringify(result));}
  state.assignments[n.key]=products.length;save();
 }
 console.log('Category assignments complete');
}
const field=(key,type='TEXT')=>({key,displayName:key,type});
function collection(id,fields,permissions){if(state.collections[id])return;api('wix-data/v2/collections',{collection:{id,displayName:id,fields,permissions:permissions||{insert:'ADMIN',update:'ADMIN',remove:'ADMIN',read:'ANYONE'}}});state.collections[id]=true;save()}
function insert(id,entries){
 const done=state.cms[id]||[];const remaining=entries.filter(x=>!done.includes(x._id));
 for(let i=0;i<remaining.length;i+=100){const batch=remaining.slice(i,i+100);const r=api('wix-data/v2/bulk/items/insert',{dataCollectionId:id,dataItems:batch.map(data=>({id:data._id,data})),returnEntity:false});if(r.bulkActionMetadata?.totalFailures)throw new Error(JSON.stringify(r));done.push(...batch.map(x=>x._id));state.cms[id]=done;save();console.log('CMS',id,done.length,'/',entries.length)}
 const check=api('wix-data/v2/items/query',{dataCollectionId:id,query:{paging:{limit:1}}});console.log('Verified',id,'fields',Object.keys(check.dataItems?.[0]?.data||{}));
}
if(mode==='all'||mode==='cms'){
 collection('ArtaCategories',['key','name','parentKey','storeCategoryId','storeSlug','image',...[]].map(x=>field(x)).concat([field('depth','NUMBER'),field('order','NUMBER'),field('productCount','NUMBER'),field('path','ARRAY_STRING')]));
 collection('ArtaProductDetails',['key','familyKey','productId','slug','name','brand','series','kind','technique','level','brushShape','brushSize','image','description','mappingStatus'].map(x=>field(x)).concat([field('familyVariantCount','NUMBER'),field('variants','OBJECT'),field('categoryKeys','ARRAY_STRING'),field('featured','BOOLEAN')]));
 collection('ArtaSettings',[field('name'),field('value','OBJECT')]);
 collection('ArtaCrossSell',[field('technique'),field('sourceKind'),field('allowedKinds','ARRAY_STRING'),field('excludeSameKind','BOOLEAN'),field('source')]);
 collection('ArtaWishlist',[field('productId'),field('name'),field('slug'),field('image')],{read:'SITE_MEMBER_AUTHOR',insert:'SITE_MEMBER',update:'SITE_MEMBER_AUTHOR',remove:'SITE_MEMBER_AUTHOR'});
 const categories=catalog.categories.map(n=>({...n,_id:n.key,storeCategoryId:state.categories[n.key]?.id||'',storeSlug:state.categories[n.key]?.slug||'',productCount:state.assignments[n.key]||0,image:catalog.products.find(g=>g.categoryKeys.includes(n.key)&&g.image)?.image||''}));
 insert('ArtaCategories',categories);
 insert('ArtaProductDetails',catalog.products.map(g=>({...g,_id:g.key,productId:state.products[g.key].id,slug:state.products[g.key].slug,variants:{items:g.variants},featured:!!g.image&&((g.series==='Winton'&&g.variants.length>10)||g.name.includes('Polychromos')||g.name.includes('Artistico'))})));
 insert('ArtaSettings',[{_id:'commerce',name:'commerce',value:{checkoutEnabled:false,pricingMode:'demo',currency:'ILS',sourceSkuCount:catalog.sourceRows,productCount:catalog.products.length,headline:'כל יצירה מתחילה בחומר הנכון',subtitle:'צבעים, ניירות וכלי אמנות — מהסקיצה הראשונה ועד העבודה הבאה.',notice:'אתר הדגמה · המחירים להמחשה בלבד · לא ניתן לבצע רכישה',priorityConnected:false}}]);
 insert('ArtaCrossSell',[{_id:'watercolor-paint',technique:'watercolor',sourceKind:'paint',allowedKinds:['brush','paper'],excludeSameKind:true,source:'אפיון מערכת Cross-Sale.docx — example B'},{_id:'charcoal-drawing',technique:'charcoal',sourceKind:'drawing',allowedKinds:['paper','accessory','medium'],excludeSameKind:true,source:'אפיון מערכת Cross-Sale.docx — example A'},...['oil','acrylic','gouache'].map(technique=>({_id:technique+'-paint',technique,sourceKind:'paint',allowedKinds:['brush','paper','medium','canvas'],excludeSameKind:true,source:'Inferred from technique hierarchy; merchant review needed'}))]);
}
if(mode==='all'||mode==='images'){
 const pending=catalog.products.filter(g=>g.image&&!state.images[g.key]);
 for(let i=0;i<pending.length;i+=50){const batch=pending.slice(i,i+50);const fresh=api('stores/v3/products/query',{query:{filter:{id:{$in:batch.map(g=>state.products[g.key].id)}},cursorPaging:{limit:100}}});const revisions=Object.fromEntries((fresh.products||[]).map(p=>[p.id,p.revision]));const r=api('stores/v3/bulk/products/update',{products:batch.map(g=>({product:{id:state.products[g.key].id,revision:revisions[state.products[g.key].id]||state.products[g.key].revision,media:{itemsInfo:{items:[{url:g.image,altText:g.name.slice(0,500)}]}}}}))});
  for(const result of r.results||[]){const g=batch[result.itemMetadata.originalIndex];state.images[g.key]=result.itemMetadata.success?'attached':'failed';}save();console.log('Images attempted',Object.keys(state.images).length,'/',pending.length);
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,7000);
 }
}
console.log('Completed',mode);
