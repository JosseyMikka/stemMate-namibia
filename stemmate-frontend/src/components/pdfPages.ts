import {getDocument,type PDFDocumentProxy} from 'pdfjs-dist/legacy/build/pdf.mjs';
export const PDF_BYTE_LIMIT=10_000_000;
export const PDF_PAGE_LIMIT=100;
export function pageSize(width:number,height:number){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new Error('This PDF page has invalid dimensions.');
 const scale=Math.min(2,1800/Math.max(width,height));
 return {scale,width:Math.ceil(width*scale),height:Math.ceil(height*scale)};
}
export function openPdf(data:Uint8Array){
 if(data.byteLength>PDF_BYTE_LIMIT||!new TextDecoder().decode(data.slice(0,5)).startsWith('%PDF-'))throw new Error('Choose a valid PDF smaller than 10 MB.');
 return getDocument({data,enableXfa:false,useSystemFonts:true,stopAtErrors:true,maxImageSize:12_000_000});
}
export async function renderPage(doc:PDFDocumentProxy,pageNumber:number){
 if(!Number.isInteger(pageNumber)||pageNumber<1||pageNumber>doc.numPages)throw new Error('Choose a page within this document.');
 const page=await doc.getPage(pageNumber);
 try{
  const original=page.getViewport({scale:1}),size=pageSize(original.width,original.height);
  const viewport=page.getViewport({scale:size.scale});
  const canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;
  await page.render({canvas,viewport,annotationMode:0}).promise;
  const image=canvas.toDataURL('image/jpeg',0.85);
  canvas.width=0;canvas.height=0;
  if(image.length>2_600_000)throw new Error('This page is too detailed. Use a cropped photograph of the relevant question.');
  return image;
 }finally{page.cleanup();}
}
