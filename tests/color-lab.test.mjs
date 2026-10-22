import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import pigments from '../src/features/colorLab/pigments.json' with {type:'json'};
import { mixHex, percentages, normalize, validHex, hexLab, deltaE, nearestName, solveRecipes } from '../src/features/colorLab/engine.js';
import { dryPigmentProfiles, storePaintProfiles, matchProduct, loadShopCatalog, PAINT_CATEGORIES, profileForProduct } from '../src/features/colorLab/catalog.js';
import edge, { isKnownRoute } from '../netlify/edge-functions/meta.js';

test('120 traceable profiles distinguish modeled RGB from measured spectra',()=>{
  assert.equal(pigments.length,120);assert.equal(new Set(pigments.map(p=>p.id)).size,120);
  for(const p of pigments){assert.equal(validHex(p.hex),p.hex);assert.equal(p.profile,'modeled-rgb');assert.match(p.source,/schmincke.de/);assert.ok(p.pigments.length);assert.match(p.ka,/[ა-ჰ]/);assert.ok(!/[a-z]/i.test(p.ka),p.ka);}
});
test('normalization handles zeros, invalid inputs and exact displayed totals',()=>{
  assert.deepEqual(normalize([0,0]),[.5,.5]);assert.deepEqual(normalize([NaN,-1,10]),[0,0,1]);
  assert.deepEqual(percentages([]),[]);
  for(const w of [[1,1,1],[0,0,0],[3,7,22,14,1],[1e10,1,1]])assert.equal(percentages(w).reduce((a,b)=>a+b,0),100);
});
test('HEX validation never silently accepts malformed color inputs',()=>{
  assert.equal(validHex('f0a'),'#FF00AA');assert.equal(validHex('#AB12cd'),'#AB12CD');
  for(const v of ['#1234','nope','#GG0011','',null])assert.equal(validHex(v),null);
});
test('zero contribution, endpoints, identical colors and scale invariance',()=>{
  assert.equal(mixHex(['#123456','#FFCC00'],[100,0]),'#123456');
  assert.equal(mixHex(['#224D9C','#224D9C'],[1,1]),'#224D9C');
  assert.equal(mixHex(['#224D9C','#F1D523'],[30,70]),mixHex(['#224D9C','#F1D523'],[3,7]));
});
test('multi-pigment mixing is independent of input order',()=>{
  const a=['#224D9C','#F1D523','#F4F3F0','#AB4830'],w=[12,30,50,8];
  assert.equal(mixHex(a,w),mixHex([...a].reverse(),[...w].reverse()));
});
test('published Spectral.js blue + yellow example produces green, not RGB average',()=>{
  const result=mixHex(['#002185','#FCD200'],[1,1]);assert.equal(result,'#3D933E');assert.notEqual(result,'#7E7A43');
});
test('white lightens black, and sample palette mixtures stay finite and displayable',()=>{
  const dark=hexLab('#151515')[0],light=hexLab(mixHex(['#151515','#F5F5F5'],[1,1]))[0];assert.ok(light>dark);
  for(let i=0;i<pigments.length;i+=7){const h=mixHex([pigments[i].hex,pigments[(i+40)%pigments.length].hex],[17,83]);assert.ok(validHex(h));assert.ok(hexLab(h).every(Number.isFinite));}
});
test('CIEDE2000 matches Sharma reference pairs and identity/symmetry',()=>{
  for(const [a,b,expected] of [
    [[50,2.6772,-79.7751],[50,0,-82.7485],2.0425],
    [[50,3.1571,-77.2803],[50,0,-82.7485],2.8615],
    [[50,2.8361,-74.0200],[50,0,-82.7485],3.4412],
    [[50,-1.3802,-84.2814],[50,0,-82.7485],1.0000],
    [[50,0,0],[50,-1,2],2.3669],
  ]){assert.ok(Math.abs(deltaE(a,b)-expected)<.0001);assert.ok(Math.abs(deltaE(a,b)-deltaE(b,a))<1e-10);}
  assert.equal(deltaE([50,0,0],[50,0,0]),0);
});
test('visual naming uses CSS colors and never invents pigment identities',()=>{
  assert.equal(nearestName('#FF0000').name,'red');assert.equal(nearestName('#008080').name,'teal');assert.equal(nearestName('#808000').ka,'ზეთისხილისფერი');
});
test('reverse search finds pairs and triples using the exact forward model',()=>{
  const pool=pigments.filter(p=>['14494','14225','14101','14519','14369','14668','14780'].includes(p.id));
  const target=mixHex(pool.slice(0,3).map(p=>p.hex),[30,50,20]);
  const results=solveRecipes(pool,target);
  assert.equal(results.length,5);assert.ok(results.some(r=>r.ids.length===2));assert.ok(results.some(r=>r.ids.length===3));
  assert.ok(results[0].delta<2);
  for(const r of results){assert.ok(r.recipe.length>=2&&r.recipe.length<=3);assert.equal(mixHex(r.ids.map(i=>pool[i].hex),r.recipe.map(x=>x.weight)),r.hex);assert.equal(deltaE(hexLab(r.hex),hexLab(target)),r.delta);assert.ok(Math.abs(r.weights.reduce((a,b)=>a+b,0)-1)<1e-10);}
});
test('product matching is case-insensitive and order-insensitive but category-bound',()=>{
  const p=pigments.find(p=>p.id==='14492');
  assert.equal(matchProduct({name:'BLUE PRUSSIAN oil',category_slug:'zetis-saghebavebi'},p).kind,'name');
  assert.equal(matchProduct({name:'PRUSSIAN BLUE notebook',category_slug:'rveulebi'},p),null);
  assert.equal(matchProduct({name:'green paint',category_slug:'akrilis-saghebavebi'},{name:'Emerald Green',ka:'ზურმუხტისფერი',aliases:[],pigments:[]}),null);
  assert.equal(matchProduct({name:'paint PB15:3',category_slug:'akrilis-saghebavebi'},{name:'not this',ka:'უცნობი',aliases:[],pigments:['PB15']}),null);
  assert.equal(profileForProduct({name:'CADMIUM RED DEEP HUE',category_slug:'zetis-saghebavebi'},pigments).id,'14350');
});
test('dry pigment profiles all remain available, with no fabricated PI codes',()=>{
  const products=[{id:1,name:'პიგმენტი ულტრამარინის ლურჯი',category_slug:'pigmentebi',slug:'blue'},{id:2,name:'პიგმენტი შავი ოხრა',category_slug:'pigmentebi',slug:'black'}];
  const profiles=dryPigmentProfiles(products,pigments);assert.equal(profiles.length,2);
  for(const p of profiles){assert.deepEqual(p.pigments,[]);assert.equal(p.profile,'modeled-rgb');assert.ok(validHex(p.hex));assert.equal(matchProduct(products.find(x=>x.id===p.productId),p).kind,'product');}
  assert.equal(profileForProduct(products[0],pigments).id,'14494');
});
test('shop paint profiles retain real product identity and omit unsupported physical effects',()=>{
  const products=[
    {id:1,name:'ზეთის საღებავი EMERALD GREEN',category_slug:'zetis-saghebavebi',slug:'emerald'},
    {id:2,name:'აკრილის საღებავი 12 ფერიანი',category_slug:'akrilis-saghebavebi',slug:'set'},
    {id:3,name:'GALERIA GOLD',category_slug:'akrilis-saghebavebi',slug:'gold'},
    {id:4,name:'აკრილის საღებავი უცნობი',category_slug:'akrilis-saghebavebi',slug:'unknown'},
  ];
  const profiles=storePaintProfiles(products,pigments);assert.equal(profiles.length,1);assert.equal(profiles[0].productId,1);assert.equal(profiles[0].ka,'ზურმუხტისფერი მწვანე');assert.deepEqual(profiles[0].pigments,[]);assert.equal(matchProduct(products[0],profiles[0]).kind,'product');
});
test('catalogue loader paginates relevant categories, preserving stock/prices/IDs',async()=>{
  const calls=[];const fetcher=async(url)=>{calls.push(url);const u=new URL(url);const page=+u.searchParams.get('page');const cat=u.searchParams.get('category');return Response.json({items:cat==='pigmentebi'?(page===1?Array.from({length:100},(_,i)=>({id:i+1,quantity:3,price:13})): [{id:101,quantity:0,price:17}]):[],total:cat==='pigmentebi'?101:0});};
  const list=await loadShopCatalog('https://catalog.test',fetcher);assert.equal(list.length,101);assert.equal(list[0].price,13);assert.equal(list.at(-1).quantity,0);assert.equal(calls.length,PAINT_CATEGORIES.length+1);assert.ok(calls.every(u=>u.includes('/products/list?')));
});
test('color lab is a known edge route and receives initial SEO and canonical',async()=>{
  assert.ok(isKnownRoute('/color-lab'));const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const old=globalThis.fetch;globalThis.fetch=async()=>{throw new Error('No API needed');};
  try{const r=await edge(new Request('https://artopia.ge/color-lab'),{next:async()=>new Response(html,{headers:{'content-type':'text/html'}})});assert.equal(r.status,200);const body=await r.text();assert.match(body,/<title>ფერების შერევა ონლაინ — ფერების ლაბორატორია/);assert.ok(body.includes('data-ld-edge="/color-lab"'));assert.ok(body.includes('"@type":"WebApplication"'));assert.ok(body.includes('og:image" content="https://artopia.ge/images/color-lab/color-lab.jpg'));assert.ok(body.includes('og:image:width" content="1200'));assert.ok(body.includes('og:image:height" content="630'));assert.match(body,/rel="canonical" href="https:\/\/artopia.ge\/color-lab"/);assert.ok(!body.includes('og:type" content="undefined'));}finally{globalThis.fetch=old;}
});
