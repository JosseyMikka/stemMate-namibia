import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {openPdf,pageSize,renderPage,PDF_BYTE_LIMIT} from './pdfPages';
const requireCanvas=createRequire(import.meta.resolve('pdfjs-dist'));
const {createCanvas}=requireCanvas('@napi-rs/canvas');
Object.defineProperty(globalThis,'document',{value:{createElement:()=>createCanvas(1,1)},configurable:true});
assert.throws(()=>openPdf(new Uint8Array([1,2,3])),/valid PDF/);
assert.throws(()=>openPdf(new Uint8Array(PDF_BYTE_LIMIT+1)),/10 MB/);
for(const dims of [[0,1],[-1,5],[Infinity,10],[10,NaN]])assert.throws(()=>pageSize(dims[0],dims[1]));
assert.equal(Math.max(...Object.values(pageSize(100000,200000)).slice(1)),1800);
for(const name of ['text-practice.pdf','scanned-practice.pdf']){
 const task=openPdf(new Uint8Array(readFileSync(new URL('./fixtures/'+name,import.meta.url))));
 const doc=await task.promise;
 try{
  assert.equal(doc.numPages,2);
  await assert.rejects(()=>renderPage(doc,0),/within/);
  await assert.rejects(()=>renderPage(doc,3),/within/);
  await assert.rejects(()=>renderPage(doc,1.2),/within/);
  const first=await renderPage(doc,1),second=await renderPage(doc,2);
  assert.ok(first.startsWith('data:image/jpeg;base64,'));assert.notEqual(first,second);
  assert.ok(first.length<2600000&&second.length<2600000);
  const p=await doc.getPage(2),text=await p.getTextContent();
  if(name.startsWith('text'))assert.ok(text.items.some(i=>'str' in i&&i.str.includes('3y')));
  else assert.equal(text.items.length,0); // scanned content must still render for vision
 }finally{await task.destroy();}
}
console.log('PDF text/scanned page rendering, exact page selection, limits and invalid inputs passed.');
