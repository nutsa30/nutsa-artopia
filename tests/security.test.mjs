import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { secureResponse,securityPolicy } from "../netlify/lib/security.js";
import meta from "../netlify/edge-functions/meta.js";
import { productPageMeta } from "../src/utils/catalogMeta.js";
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');

test('CSP hashes exactly the trusted bootstrap, never injected arbitrary scripts',async()=>{
  const policy=await securityPolicy(html+'<script>window.evil=1</script>');
  assert.match(policy,/sha256-/);assert.doesNotMatch(policy,/unsafe-eval|script-src[^;]*unsafe-inline/);
  const changed=await securityPolicy(html.replace('artopia-analytics-init','untrusted-id'));
  assert.doesNotMatch(changed,/sha256-/);
  for(const source of ['googletagmanager.com','res.cloudinary.com','google-analytics.com','www.google.com','kemsilab.com'])assert.ok(policy.includes(source));
});

test('HTML security wrapper preserves statuses/canonical and API responses',async()=>{
  const input=new Response(html,{status:404,headers:{'content-type':'text/html','x-robots-tag':'noindex','etag':'invalidated'}});
  const output=await secureResponse(input);
  assert.equal(output.status,404);assert.equal(output.headers.get('x-robots-tag'),'noindex');
  assert.equal(output.headers.get('x-content-type-options'),'nosniff');assert.ok(output.headers.get('content-security-policy'));
  assert.equal(output.headers.get('etag'),null);assert.equal(await output.text(),html);
  const json=Response.json({ok:true});assert.equal(await secureResponse(json),json);
});

test('all metadata paths pass security wrapper including utility, 404 and home',async()=>{
  const original=globalThis.fetch;globalThis.fetch=async()=>{throw Error('offline fixture');};
  try {
    for(const path of ['/','/admin/login','/payment/result','/unrecognized/fixture']){
      const response=await meta(new Request('https://artopia.ge'+path),{next:async()=>new Response(html,{headers:{'content-type':'text/html'}})});
      assert.ok(response.headers.get('content-security-policy'),path);
      assert.equal(response.headers.get('referrer-policy'),'strict-origin-when-cross-origin');
    }
  }finally{globalThis.fetch=original;}
});

test('different names sharing description get unique natural metadata without editing source',()=>{
  const description='საერთო აღწერა';
  const a={name:'ფანქარი A',description},b={name:'ფანქარი B',description};
  assert.notEqual(productPageMeta(a).description,productPageMeta(b).description);
  assert.equal(a.description,description);assert.equal(b.description,description);
});
